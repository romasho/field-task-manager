import { create } from 'zustand';
import {
  Attachment,
  HistoryItem,
  SortDirection,
  SortMode,
  Task,
  TaskInput,
  TaskStatus,
} from '../types';
import {
  loadDeletedTaskIds,
  loadLogs,
  loadTasks,
  loadTheme,
  saveDeletedTaskIds,
  saveLogs,
  saveTasks,
  saveTheme,
} from '../storage/storage';
import { syncTasks } from '../services/sync';
import { cancelTaskReminders, scheduleTaskReminder } from '../services/notifications';

const now = () => new Date().toISOString();
const id = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const SYNC_TIMEOUT_MS = 5_000;
let offlineFailureTimer: ReturnType<typeof setTimeout> | undefined;
let syncInFlight = false;
let syncQueued = false;
let localRevision = 0;
let storageWriteQueue: Promise<void> = Promise.resolve();

function clearOfflineFailureTimer() {
  if (offlineFailureTimer) clearTimeout(offlineFailureTimer);
  offlineFailureTimer = undefined;
}

async function withSyncTimeout<T>(operation: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      const error = new Error('Synchronization timed out after 5 seconds.');
      controller.abort(error);
      reject(error);
    }, SYNC_TIMEOUT_MS);
  });
  try {
    return await Promise.race([operation(controller.signal), timeoutPromise]);
  } finally {
    clearTimeout(timeout!);
  }
}

function recordLocalMutation() {
  localRevision += 1;
}

type State = {
  tasks: Task[];
  logs: HistoryItem[];
  deletedTaskIds: string[];
  theme: 'light' | 'dark';
  demoNotifications: boolean;
  syncStatus: 'idle' | 'syncing' | 'success' | 'offline' | 'failed';
  syncMessage: string | null;
  sortMode: SortMode;
  sortDirection: SortDirection;
  initialized: boolean;
  initializationError: string | null;
  initialize: () => Promise<void>;
  setTheme: (theme: 'light' | 'dark') => Promise<void>;
  setDemoNotifications: (enabled: boolean) => void;
  setSortMode: (mode: SortMode) => void;
  setSortDirection: (direction: SortDirection) => void;
  createTask: (input: TaskInput) => Promise<Task>;
  updateTask: (
    id: string,
    patch: Partial<
      Pick<Task, 'title' | 'description' | 'dueAt' | 'location' | 'status' | 'attachments'>
    >
  ) => Promise<void>;
  updateStatus: (id: string, status: TaskStatus) => Promise<void>;
  addAttachment: (id: string, attachment: Attachment) => Promise<void>;
  removeAttachment: (id: string, attachmentId: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  sync: () => Promise<void>;
};

function queueStorageWrite(operation: () => Promise<void>): Promise<void> {
  const result = storageWriteQueue.then(operation, operation);
  storageWriteQueue = result.catch(() => {});
  return result;
}

async function persist(tasks: Task[], logs: HistoryItem[], deletedTaskIds?: string[]) {
  await queueStorageWrite(async () => {
    const operations = [saveTasks(tasks), saveLogs(logs)];
    if (deletedTaskIds) operations.push(saveDeletedTaskIds(deletedTaskIds));
    await Promise.all(operations);
  });
}

export const useAppStore = create<State>((set, get) => ({
  tasks: [],
  logs: [],
  deletedTaskIds: [],
  theme: 'light',
  demoNotifications: false,
  syncStatus: 'idle',
  syncMessage: null,
  sortMode: 'dueDate',
  sortDirection: 'asc',
  initialized: false,
  initializationError: null,

  initialize: async () => {
    try {
      set({ initialized: false, initializationError: null });
      const [tasks, logs, theme, deletedTaskIds] = await Promise.all([
        loadTasks(),
        loadLogs(),
        loadTheme(),
        loadDeletedTaskIds(),
      ]);
      set({ tasks, logs, theme, deletedTaskIds, initialized: true });
      await get()
        .sync()
        .catch(() => {});
    } catch (error) {
      set({
        initialized: true,
        initializationError:
          error instanceof Error ? error.message : 'Unable to load local application data.',
      });
    }
  },

  setTheme: async theme => {
    await queueStorageWrite(() => saveTheme(theme));
    set({ theme });
  },

  setDemoNotifications: enabled => set({ demoNotifications: enabled }),

  setSortMode: mode => set({ sortMode: mode }),

  setSortDirection: direction => set({ sortDirection: direction }),

  createTask: async input => {
    const timestamp = now();
    const taskId = id();
    const history: HistoryItem = {
      id: id(),
      taskId,
      timestamp,
      action: 'created',
      description: 'Task created',
    };
    const task: Task = {
      ...input,
      id: taskId,
      createdAt: timestamp,
      updatedAt: timestamp,
      history: [history],
      syncState: 'Pending Sync',
    };
    const tasks = [task, ...get().tasks];
    const logs = [history, ...get().logs];
    await persist(tasks, logs);
    recordLocalMutation();
    set({ tasks, logs });
    get()
      .sync()
      .catch(() => {});
    return task;
  },

  updateTask: async (taskId, patch) => {
    const timestamp = now();
    const existing = get().tasks.find(t => t.id === taskId);
    if (!existing) throw new Error('Task not found.');
    const history: HistoryItem = {
      id: id(),
      taskId,
      timestamp,
      action: 'edited',
      description: 'Task details updated',
    };
    const updated = {
      ...existing,
      ...patch,
      updatedAt: timestamp,
      syncState: 'Pending Sync' as const,
      history: [history, ...existing.history],
    };
    const tasks = get().tasks.map(t => (t.id === taskId ? updated : t));
    const logs = [history, ...get().logs];
    await persist(tasks, logs);
    recordLocalMutation();
    set({ tasks, logs });
    get()
      .sync()
      .catch(() => {});
  },

  updateStatus: async (taskId, status) => {
    const existing = get().tasks.find(t => t.id === taskId);
    if (!existing) throw new Error('Task not found.');
    if (existing.status === status) return;
    const timestamp = now();
    const history: HistoryItem = {
      id: id(),
      taskId,
      timestamp,
      action: 'status_changed',
      description: `Status changed from ${existing.status} to ${status}`,
    };
    const updated = {
      ...existing,
      status,
      updatedAt: timestamp,
      syncState: 'Pending Sync' as const,
      history: [history, ...existing.history],
    };
    const tasks = get().tasks.map(t => (t.id === taskId ? updated : t));
    const logs = [history, ...get().logs];
    await persist(tasks, logs);
    recordLocalMutation();
    set({ tasks, logs });
    let reminderCleanupError: unknown;
    try {
      if (status === 'Completed' || status === 'Cancelled') {
        await cancelTaskReminders(taskId);
      } else {
        await scheduleTaskReminder(taskId, existing.title, existing.dueAt, {
          demo: get().demoNotifications,
        });
      }
    } catch (error) {
      reminderCleanupError = error;
    }
    get()
      .sync()
      .catch(() => {});
    if (reminderCleanupError) {
      throw new Error(
        status === 'Completed' || status === 'Cancelled'
          ? 'Status saved, but the scheduled reminder could not be cancelled.'
          : 'Status saved, but its reminder could not be scheduled.'
      );
    }
  },

  addAttachment: async (taskId, attachment) => {
    const existing = get().tasks.find(t => t.id === taskId);
    if (!existing) throw new Error('Task not found.');
    const timestamp = now();
    const history: HistoryItem = {
      id: id(),
      taskId,
      timestamp,
      action: 'attachment_added',
      description: `Attachment added: ${attachment.name}`,
    };
    const updated = {
      ...existing,
      attachments: [...existing.attachments, attachment],
      updatedAt: timestamp,
      syncState: 'Pending Sync' as const,
      history: [history, ...existing.history],
    };
    const tasks = get().tasks.map(t => (t.id === taskId ? updated : t));
    const logs = [history, ...get().logs];
    await persist(tasks, logs);
    recordLocalMutation();
    set({ tasks, logs });
    get()
      .sync()
      .catch(() => {});
  },

  removeAttachment: async (taskId, attachmentId) => {
    const existing = get().tasks.find(t => t.id === taskId);
    if (!existing) throw new Error('Task not found.');
    const attachment = existing.attachments.find(a => a.id === attachmentId);
    const timestamp = now();
    const history: HistoryItem = {
      id: id(),
      taskId,
      timestamp,
      action: 'attachment_removed',
      description: `Attachment removed: ${attachment?.name || attachmentId}`,
    };
    const updated = {
      ...existing,
      attachments: existing.attachments.filter(a => a.id !== attachmentId),
      updatedAt: timestamp,
      syncState: 'Pending Sync' as const,
      history: [history, ...existing.history],
    };
    const tasks = get().tasks.map(t => (t.id === taskId ? updated : t));
    const logs = [history, ...get().logs];
    await persist(tasks, logs);
    recordLocalMutation();
    set({ tasks, logs });
    get()
      .sync()
      .catch(() => {});
  },

  deleteTask: async taskId => {
    const existing = get().tasks.find(t => t.id === taskId);
    if (!existing) throw new Error('Task not found.');
    const timestamp = now();
    const history: HistoryItem = {
      id: id(),
      taskId,
      timestamp,
      action: 'deleted',
      description: `Task deleted: ${existing.title}`,
    };
    const tasks = get().tasks.filter(t => t.id !== taskId);
    const logs = [history, ...get().logs];
    const deletedTaskIds = [...new Set([...get().deletedTaskIds, taskId])];
    try {
      await cancelTaskReminders(taskId);
    } catch {
      throw new Error(
        'The task was not deleted because its scheduled reminder could not be removed.'
      );
    }
    try {
      await persist(tasks, logs, deletedTaskIds);
    } catch (error) {
      if (existing.status !== 'Completed' && existing.status !== 'Cancelled') {
        await scheduleTaskReminder(taskId, existing.title, existing.dueAt, {
          demo: get().demoNotifications,
        }).catch(() => {});
      }
      throw error;
    }
    recordLocalMutation();
    set({ tasks, logs, deletedTaskIds });
    get()
      .sync()
      .catch(() => {});
  },

  sync: async () => {
    if (syncInFlight) {
      syncQueued = true;
      return;
    }
    syncInFlight = true;
    const current = get().tasks;
    const deletedTaskIds = get().deletedTaskIds;
    const startingRevision = localRevision;
    const pendingChanges =
      current.filter(task => task.syncState === 'Pending Sync' || task.syncState === 'Sync Failed')
        .length + get().deletedTaskIds.length;
    clearOfflineFailureTimer();
    set({ syncStatus: 'syncing', syncMessage: 'Synchronizing with mock server…' });
    try {
      const { tasks: merged, performed } = await withSyncTimeout(signal =>
        syncTasks(current, deletedTaskIds, signal)
      );
      if (!performed) {
        set({
          syncStatus: 'offline',
          syncMessage: 'Offline — checking again for 5 seconds before marking sync as failed.',
        });
        offlineFailureTimer = setTimeout(() => {
          // A successful retry clears the offline state. Otherwise the pending
          // work must become visibly failed after the five-second grace period.
          if (get().syncStatus !== 'offline') return;
          const tasks = get().tasks.map(task =>
            task.syncState === 'Pending Sync' || task.syncState === 'Sync Failed'
              ? { ...task, syncState: 'Sync Failed' as const }
              : task
          );
          set({
            tasks,
            syncStatus: 'failed',
            syncMessage: 'Synchronization failed — no network connection after 5 seconds.',
          });
          persist(tasks, get().logs).catch(() => {});
        }, SYNC_TIMEOUT_MS);
        return;
      }
      if (localRevision !== startingRevision) {
        syncQueued = true;
        set({
          syncStatus: 'idle',
          syncMessage: 'Local changes were made during synchronization; syncing them next…',
        });
        return;
      }
      const timestamp = now();
      const syncLogs = merged.length
        ? [
            {
              id: id(),
              taskId: 'system',
              timestamp,
              action: 'sync',
              description: `Synchronization completed for ${merged.length} task(s)`,
            } as HistoryItem,
          ]
        : [];
      const logs = [...syncLogs, ...get().logs];
      set({
        tasks: merged,
        logs,
        deletedTaskIds: [],
        syncStatus: 'success',
        syncMessage:
          pendingChanges > 0
            ? `Synchronization complete — ${pendingChanges} local change(s) synced.`
            : 'Synchronization complete — everything is up to date.',
      });
      await persist(merged, logs, []);
    } catch (error) {
      if (localRevision !== startingRevision) {
        syncQueued = true;
        set({
          syncStatus: 'idle',
          syncMessage: 'Local changes are waiting for another synchronization attempt.',
        });
        return;
      }
      const tasks = current.map(task =>
        task.syncState === 'Pending Sync' || task.syncState === 'Sync Failed'
          ? { ...task, syncState: 'Sync Failed' as const }
          : task
      );
      set({
        tasks,
        syncStatus: 'failed',
        syncMessage: `Synchronization failed — ${
          error instanceof Error ? error.message : 'check the mock server connection.'
        }`,
      });
      await persist(tasks, get().logs);
      throw error;
    } finally {
      syncInFlight = false;
      if (syncQueued) {
        syncQueued = false;
        void get()
          .sync()
          .catch(() => {});
      }
    }
  },
}));
