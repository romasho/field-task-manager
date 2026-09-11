import { create } from 'zustand';
import { Attachment, HistoryItem, SortDirection, SortMode, Task, TaskStatus } from '../types';
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

const now = () => new Date().toISOString();
const id = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const SYNC_TIMEOUT_MS = 5_000;
let offlineFailureTimer: ReturnType<typeof setTimeout> | undefined;
let syncInFlight = false;

function clearOfflineFailureTimer() {
  if (offlineFailureTimer) clearTimeout(offlineFailureTimer);
  offlineFailureTimer = undefined;
}

function withSyncTimeout<T>(operation: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error('Synchronization timed out after 5 seconds.')),
      SYNC_TIMEOUT_MS
    );
    operation.then(
      result => {
        clearTimeout(timeout);
        resolve(result);
      },
      error => {
        clearTimeout(timeout);
        reject(error);
      }
    );
  });
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
  initialize: () => Promise<void>;
  setTheme: (theme: 'light' | 'dark') => Promise<void>;
  setDemoNotifications: (enabled: boolean) => void;
  setSortMode: (mode: SortMode) => void;
  setSortDirection: (direction: SortDirection) => void;
  createTask: (
    input: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'history' | 'syncState'>
  ) => Promise<Task>;
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

async function persist(tasks: Task[], logs: HistoryItem[]) {
  await saveTasks(tasks);
  await saveLogs(logs);
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

  initialize: async () => {
    const [tasks, logs, theme, deletedTaskIds] = await Promise.all([
      loadTasks(),
      loadLogs(),
      loadTheme(),
      loadDeletedTaskIds(),
    ]);
    set({ tasks, logs, theme, deletedTaskIds, initialized: true });
    try {
      await get().sync();
    } catch {}
  },

  setTheme: async theme => {
    set({ theme });
    await saveTheme(theme);
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
    set({ tasks, logs });
    await persist(tasks, logs);
    get()
      .sync()
      .catch(() => {});
    return task;
  },

  updateTask: async (taskId, patch) => {
    const timestamp = now();
    const existing = get().tasks.find(t => t.id === taskId);
    if (!existing) return;
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
    set({ tasks, logs });
    await persist(tasks, logs);
    get()
      .sync()
      .catch(() => {});
  },

  updateStatus: async (taskId, status) => {
    const existing = get().tasks.find(t => t.id === taskId);
    if (!existing || existing.status === status) return;
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
    set({ tasks, logs });
    await persist(tasks, logs);
    get()
      .sync()
      .catch(() => {});
  },

  addAttachment: async (taskId, attachment) => {
    const existing = get().tasks.find(t => t.id === taskId);
    if (!existing) return;
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
    set({ tasks, logs });
    await persist(tasks, logs);
    get()
      .sync()
      .catch(() => {});
  },

  removeAttachment: async (taskId, attachmentId) => {
    const existing = get().tasks.find(t => t.id === taskId);
    if (!existing) return;
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
    set({ tasks, logs });
    await persist(tasks, logs);
    get()
      .sync()
      .catch(() => {});
  },

  deleteTask: async taskId => {
    const existing = get().tasks.find(t => t.id === taskId);
    if (!existing) return;
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
    set({ tasks, logs, deletedTaskIds });
    await Promise.all([persist(tasks, logs), saveDeletedTaskIds(deletedTaskIds)]);
    get()
      .sync()
      .catch(() => {});
  },

  sync: async () => {
    if (syncInFlight) return;
    syncInFlight = true;
    const current = get().tasks;
    const pendingChanges =
      current.filter(task => task.syncState === 'Pending Sync' || task.syncState === 'Sync Failed')
        .length + get().deletedTaskIds.length;
    clearOfflineFailureTimer();
    set({ syncStatus: 'syncing', syncMessage: 'Synchronizing with mock server…' });
    try {
      const { tasks: merged, performed } = await withSyncTimeout(
        syncTasks(current, get().deletedTaskIds)
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
      await Promise.all([persist(merged, logs), saveDeletedTaskIds([])]);
    } catch (error) {
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
    }
  },
}));
