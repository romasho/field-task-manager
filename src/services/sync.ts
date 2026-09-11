import NetInfo from '@react-native-community/netinfo';
import { Task } from '../types';
import { createRemoteTask, deleteRemoteTask, fetchRemoteTasks, upsertRemoteTask } from './api';

export async function isOnline() {
  const state = await NetInfo.fetch();
  return Boolean(state.isConnected);
}

export type SyncResult = { tasks: Task[]; performed: boolean };

export async function syncTasks(
  localTasks: Task[],
  deletedTaskIds: string[] = []
): Promise<SyncResult> {
  if (!(await isOnline())) return { tasks: localTasks, performed: false };
  const remote = await fetchRemoteTasks();
  const remoteById = new Map(remote.map(t => [t.id, t]));

  for (const taskId of deletedTaskIds) {
    await deleteRemoteTask(taskId);
    remoteById.delete(taskId);
  }

  for (const local of localTasks) {
    if (local.syncState === 'Pending Sync' || local.syncState === 'Sync Failed') {
      const syncedTask = { ...local, syncState: 'Synced' as const };
      if (remoteById.has(local.id)) {
        await upsertRemoteTask(syncedTask);
      } else {
        await createRemoteTask(syncedTask);
      }
      remoteById.set(local.id, syncedTask);
    }
  }

  // Last-write-wins: newer updatedAt wins. Local deletions are represented by a
  // deletedAt history event in the app log and immediately sent when online.
  const merged = Array.from(remoteById.values()).map(t => {
    const local = localTasks.find(x => x.id === t.id);
    if (!local) return { ...t, syncState: 'Synced' as const };
    return new Date(local.updatedAt) >= new Date(t.updatedAt)
      ? { ...local, syncState: 'Synced' as const }
      : { ...t, syncState: 'Synced' as const };
  });
  return { tasks: merged, performed: true };
}

export { deleteRemoteTask };
