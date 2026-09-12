import { Task } from '../types';
import { storageValidators } from '../utils/storageValidation';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000';

async function request(path: string, options?: RequestInit) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
    ...options,
  });
  if (!response.ok) throw new Error(`Mock server returned ${response.status}`);
  return response;
}

export async function fetchRemoteTasks(signal?: AbortSignal): Promise<Task[]> {
  const response = await request('/tasks', { signal });
  const data: unknown = await response.json();
  if (!Array.isArray(data) || !data.every(storageValidators.task)) {
    throw new Error('Mock server returned invalid task data.');
  }
  return data;
}

export async function upsertRemoteTask(task: Task, signal?: AbortSignal) {
  await request(`/tasks/${task.id}`, {
    method: 'PUT',
    body: JSON.stringify(task),
    signal,
  });
}

export async function createRemoteTask(task: Task, signal?: AbortSignal) {
  await request('/tasks', {
    method: 'POST',
    body: JSON.stringify(task),
    signal,
  });
}

export async function deleteRemoteTask(id: string, signal?: AbortSignal) {
  const response = await fetch(`${API_URL}/tasks/${id}`, { method: 'DELETE', signal });
  // A task that was never uploaded has nothing to delete remotely.
  if (!response.ok && response.status !== 404)
    throw new Error(`Mock server returned ${response.status}`);
}
