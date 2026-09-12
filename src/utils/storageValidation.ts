import type { Attachment, HistoryItem, Task, TaskStatus } from '../types';

const taskStatuses: TaskStatus[] = ['New', 'In Progress', 'Completed', 'Cancelled'];
const syncStates = ['Pending Sync', 'Synced', 'Sync Failed'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isOptionalNumber(value: unknown): value is number | undefined {
  return value === undefined || (typeof value === 'number' && Number.isFinite(value));
}

function isHistoryItem(value: unknown): value is HistoryItem {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.taskId) &&
    isString(value.timestamp) &&
    isString(value.action) &&
    isString(value.description)
  );
}

function isAttachment(value: unknown): value is Attachment {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.uri) &&
    isString(value.name) &&
    (value.mimeType === undefined || isString(value.mimeType)) &&
    isOptionalNumber(value.size) &&
    isString(value.createdAt)
  );
}

function isTask(value: unknown): value is Task {
  if (!isRecord(value) || !isRecord(value.location)) return false;
  return (
    isString(value.id) &&
    isString(value.title) &&
    isString(value.description) &&
    isString(value.dueAt) &&
    isString(value.createdAt) &&
    isString(value.updatedAt) &&
    taskStatuses.includes(value.status as TaskStatus) &&
    syncStates.includes(value.syncState as (typeof syncStates)[number]) &&
    isString(value.location.address) &&
    isOptionalNumber(value.location.latitude) &&
    isOptionalNumber(value.location.longitude) &&
    Array.isArray(value.attachments) &&
    value.attachments.every(isAttachment) &&
    Array.isArray(value.history) &&
    value.history.every(isHistoryItem)
  );
}

export function parseStoredArray<T>(
  raw: string | null,
  isItem: (value: unknown) => value is T
): T[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value) ? value.filter(isItem) : [];
  } catch {
    return [];
  }
}

export const storageValidators = {
  task: isTask,
  historyItem: isHistoryItem,
  string: isString,
};
