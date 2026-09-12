import NetInfo from '@react-native-community/netinfo';
import { Task } from '../types';
import { createRemoteTask, deleteRemoteTask, fetchRemoteTasks, upsertRemoteTask } from './api';
import { selectNewestTask } from '../utils/syncConflict';

export async function isOnline() {
  const state = await NetInfo.fetch();
  return Boolean(state.isConnected);
}

export type SyncResult = { tasks: Task[]; performed: boolean };

export async function syncTasks(
  localTasks: Task[],
  deletedTaskIds: string[] = [],
  signal?: AbortSignal
): Promise<SyncResult> {
  if (!(await isOnline())) return { tasks: localTasks, performed: false };
  const remote = await fetchRemoteTasks(signal);
  const remoteById = new Map(remote.map(t => [t.id, t]));

  for (const taskId of deletedTaskIds) {
    await deleteRemoteTask(taskId, signal);
    remoteById.delete(taskId);
  }

  for (const local of localTasks) {
    if (local.syncState === 'Pending Sync' || local.syncState === 'Sync Failed') {
      const remoteTask = remoteById.get(local.id);
      const syncedTask = { ...local, syncState: 'Synced' as const };
      if (!remoteTask) {
        await createRemoteTask(syncedTask, signal);
        remoteById.set(local.id, syncedTask);
      } else if (selectNewestTask(local, remoteTask) === local) {
        await upsertRemoteTask(syncedTask, signal);
        remoteById.set(local.id, syncedTask);
      } else {
        remoteById.set(local.id, { ...remoteTask, syncState: 'Synced' });
      }
    }
  }

  // Resolve already-synced records too, so a newer version received from another
  // client is not replaced merely because this client has a local copy.
  const merged = Array.from(remoteById.values()).map(t => {
    const local = localTasks.find(x => x.id === t.id);
    if (!local) return { ...t, syncState: 'Synced' as const };
    return { ...selectNewestTask(local, t), syncState: 'Synced' as const };
  });
  return { tasks: merged, performed: true };
}

export { deleteRemoteTask };
