import type { Task } from '../types';

export function selectNewestTask(localTask: Task, remoteTask: Task): Task {
  const localUpdatedAt = new Date(localTask.updatedAt).getTime();
  const remoteUpdatedAt = new Date(remoteTask.updatedAt).getTime();
  if (!Number.isFinite(localUpdatedAt)) return remoteTask;
  if (!Number.isFinite(remoteUpdatedAt)) return localTask;
  return localUpdatedAt >= remoteUpdatedAt ? localTask : remoteTask;
}
