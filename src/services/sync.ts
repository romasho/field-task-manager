import NetInfo from '@react-native-community/netinfo';
import { Task } from '../types';
import { deleteRemoteTask, fetchRemoteTasks, upsertRemoteTask } from './api';

export async function isOnline() {
  const state = await NetInfo.fetch();
  return Boolean(state.isConnected);
}

export async function syncTasks(localTasks: Task[]): Promise<Task[]> {
  if (!(await isOnline())) return localTasks;
  const remote = await fetchRemoteTasks();
  const remoteById = new Map(remote.map(t => [t.id, t]));

  for (const local of localTasks) {
    if (local.syncState === 'Pending Sync' || local.syncState === 'Sync Failed') {
      await upsertRemoteTask({ ...local, syncState: 'Synced' });
      remoteById.set(local.id, { ...local, syncState: 'Synced' });
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
  return merged;
}

export { deleteRemoteTask };