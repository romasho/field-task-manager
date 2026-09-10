import { Task } from '../types';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000';

async function request(path: string, options?: RequestInit) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
    ...options
  });
  if (!response.ok) throw new Error(`Mock server returned ${response.status}`);
  return response;
}

export async function fetchRemoteTasks(): Promise<Task[]> {
  const response = await request('/tasks');
  return response.json();
}

export async function upsertRemoteTask(task: Task) {
  await request(`/tasks/${task.id}`, {
    method: 'PUT',
    body: JSON.stringify(task)
  });
}

export async function deleteRemoteTask(id: string) {
  await request(`/tasks/${id}`, { method: 'DELETE' });
}