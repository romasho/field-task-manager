import { create } from 'zustand';
import { Attachment, HistoryItem, SortMode, Task, TaskStatus } from '../types';
import { loadLogs, loadTasks, loadTheme, saveLogs, saveTasks, saveTheme } from '../storage/storage';
import { scheduleTaskReminder } from '../services/notifications';
import { syncTasks } from '../services/sync';

const now = () => new Date().toISOString();
const id = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

type State = {
  tasks: Task[];
  logs: HistoryItem[];
  theme: 'light' | 'dark';
  sortMode: SortMode;
  initialized: boolean;
  initialize: () => Promise<void>;
  setTheme: (theme: 'light' | 'dark') => Promise<void>;
  setSortMode: (mode: SortMode) => void;
  createTask: (input: Omit<Task, 'id'|'createdAt'|'updatedAt'|'history'|'syncState'>) => Promise<Task>;
  updateTask: (id: string, patch: Partial<Pick<Task, 'title'|'description'|'dueAt'|'location'|'status'>>) => Promise<void>;
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
  theme: 'light',
  sortMode: 'dueDate',
  initialized: false,

  initialize: async () => {
    const [tasks, logs, theme] = await Promise.all([loadTasks(), loadLogs(), loadTheme()]);
    set({ tasks, logs, theme, initialized: true });
    try { await get().sync(); } catch {}
  },

  setTheme: async theme => {
    set({ theme });
    await saveTheme(theme);
  },

  setSortMode: mode => set({ sortMode: mode }),

  createTask: async input => {
    const timestamp = now();
    const taskId = id();
    const history: HistoryItem = {
      id: id(), taskId, timestamp, action: 'created', description: 'Task created'
    };
    const task: Task = { ...input, id: taskId, createdAt: timestamp, updatedAt: timestamp, history: [history], syncState: 'Pending Sync' };
    const tasks = [task, ...get().tasks];
    const logs = [history, ...get().logs];
    set({ tasks, logs });
    await persist(tasks, logs);
    try { await scheduleTaskReminder(task.id, task.title, task.dueAt); } catch {}
    return task;
  },

  updateTask: async (taskId, patch) => {
    const timestamp = now();
    const existing = get().tasks.find(t => t.id === taskId);
    if (!existing) return;
    const history: HistoryItem = { id: id(), taskId, timestamp, action: 'edited', description: 'Task details updated' };
    const updated = { ...existing, ...patch, updatedAt: timestamp, syncState: 'Pending Sync' as const, history: [history, ...existing.history] };
    const tasks = get().tasks.map(t => t.id === taskId ? updated : t);
    const logs = [history, ...get().logs];
    set({ tasks, logs });
    await persist(tasks, logs);
    if (patch.dueAt || patch.title) { try { await scheduleTaskReminder(taskId, updated.title, updated.dueAt); } catch {} }
  },

  updateStatus: async (taskId, status) => {
    const existing = get().tasks.find(t => t.id === taskId);
    if (!existing || existing.status === status) return;
    const timestamp = now();
    const history: HistoryItem = { id: id(), taskId, timestamp, action: 'status_changed', description: `Status changed from ${existing.status} to ${status}` };
    const updated = { ...existing, status, updatedAt: timestamp, syncState: 'Pending Sync' as const, history: [history, ...existing.history] };
    const tasks = get().tasks.map(t => t.id === taskId ? updated : t);
    const logs = [history, ...get().logs];
    set({ tasks, logs });
    await persist(tasks, logs);
  },

  addAttachment: async (taskId, attachment) => {
    const existing = get().tasks.find(t => t.id === taskId);
    if (!existing) return;
    const timestamp = now();
    const history: HistoryItem = { id: id(), taskId, timestamp, action: 'attachment_added', description: `Attachment added: ${attachment.name}` };
    const updated = { ...existing, attachments: [...existing.attachments, attachment], updatedAt: timestamp, syncState: 'Pending Sync' as const, history: [history, ...existing.history] };
    const tasks = get().tasks.map(t => t.id === taskId ? updated : t);
    const logs = [history, ...get().logs];
    set({ tasks, logs });
    await persist(tasks, logs);
  },

  removeAttachment: async (taskId, attachmentId) => {
    const existing = get().tasks.find(t => t.id === taskId);
    if (!existing) return;
    const attachment = existing.attachments.find(a => a.id === attachmentId);
    const timestamp = now();
    const history: HistoryItem = { id: id(), taskId, timestamp, action: 'attachment_removed', description: `Attachment removed: ${attachment?.name || attachmentId}` };
    const updated = { ...existing, attachments: existing.attachments.filter(a => a.id !== attachmentId), updatedAt: timestamp, syncState: 'Pending Sync' as const, history: [history, ...existing.history] };
    const tasks = get().tasks.map(t => t.id === taskId ? updated : t);
    const logs = [history, ...get().logs];
    set({ tasks, logs });
    await persist(tasks, logs);
  },

  deleteTask: async taskId => {
    const existing = get().tasks.find(t => t.id === taskId);
    if (!existing) return;
    const timestamp = now();
    const history: HistoryItem = { id: id(), taskId, timestamp, action: 'deleted', description: `Task deleted: ${existing.title}` };
    const tasks = get().tasks.filter(t => t.id !== taskId);
    const logs = [history, ...get().logs];
    set({ tasks, logs });
    await persist(tasks, logs);
  },

  sync: async () => {
    const current = get().tasks;
    const merged = await syncTasks(current);
    const timestamp = now();
    const syncLogs = merged.length ? [{
      id: id(),
      taskId: 'system',
      timestamp,
      action: 'sync',
      description: `Synchronization completed for ${merged.length} task(s)`
    } as HistoryItem] : [];
    const logs = [...syncLogs, ...get().logs];
    set({ tasks: merged, logs });
    await persist(merged, logs);
  }
}));