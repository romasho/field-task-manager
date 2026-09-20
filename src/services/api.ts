import { HistoryItem, Task, TaskStatus } from '../types';
import { storageValidators } from '../utils/storageValidation';

// Android Emulator: 10.0.2.2. Physical device: your development machine's LAN IP.
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000/api';

type Activity = { id: string; text: string; at: string };
type FieldJob = {
  id: string;
  customerName: string;
  phone: string;
  source: string;
  type: string;
  description: string;
  address: string;
  city: string;
  zip: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  technician: string;
  status: TaskStatus;
  activities: Activity[];
};

async function request(path: string, options?: RequestInit) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
    ...options,
  });
  if (!response.ok) throw new Error(`Shared job API returned ${response.status}`);
  return response;
}

function toHistory(job: FieldJob): HistoryItem[] {
  return job.activities.map(activity => ({
    id: activity.id,
    taskId: job.id,
    timestamp: activity.at,
    action: activity.text.toLowerCase().includes('started') ? 'status_changed' : 'sync',
    description: activity.text,
  }));
}

function toTask(job: FieldJob): Task {
  const history = toHistory(job);
  const timestamp = history[0]?.timestamp || new Date().toISOString();
  return {
    id: job.id,
    title: `${job.type} — ${job.customerName}`,
    description: job.description || `${job.type} for ${job.customerName}. Phone: ${job.phone}`,
    dueAt: `${job.scheduledDate}T${job.startTime}:00`,
    location: { address: [job.address, job.city, job.zip].filter(Boolean).join(', ') },
    status: job.status,
    createdAt: history[history.length - 1]?.timestamp || timestamp,
    updatedAt: timestamp,
    attachments: [],
    history,
    syncState: 'Synced',
  };
}

function toFieldJob(task: Task) {
  const [scheduledDate = new Date().toISOString().slice(0, 10), time = '09:00'] =
    task.dueAt.split('T');
  return {
    customerName: task.title,
    phone: '',
    source: 'Mobile app',
    type: 'General plumbing',
    description: task.description,
    address: task.location.address,
    city: '',
    zip: '',
    scheduledDate,
    startTime: time.slice(0, 5),
    endTime: time.slice(0, 5),
    technician: 'Unassigned',
  };
}

export async function fetchRemoteTasks(signal?: AbortSignal): Promise<Task[]> {
  const response = await request('/jobs', { signal });
  const data: unknown = await response.json();
  if (!Array.isArray(data)) throw new Error('Shared job API returned invalid job data.');
  const tasks = (data as FieldJob[]).map(toTask);
  if (!tasks.every(storageValidators.task))
    throw new Error('Shared job API returned invalid task data.');
  return tasks;
}

export async function upsertRemoteTask(task: Task, signal?: AbortSignal) {
  // The field app owns workflow status; the dispatcher owns assignment and schedule.
  await request(`/jobs/${task.id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: task.status }),
    signal,
  });
}

export async function createRemoteTask(task: Task, signal?: AbortSignal) {
  await request('/jobs', { method: 'POST', body: JSON.stringify(toFieldJob(task)), signal });
}

export async function deleteRemoteTask(_id: string, _signal?: AbortSignal) {
  // Technicians may hide a local task, but do not delete the office work order.
}
