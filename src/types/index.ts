export type TaskStatus = 'New' | 'In Progress' | 'Completed' | 'Cancelled';
export type SyncState = 'Pending Sync' | 'Synced' | 'Sync Failed';
export type SortMode = 'dateAdded' | 'dueDate' | 'status';
export type SortDirection = 'asc' | 'desc';

export type Attachment = {
  id: string;
  uri: string;
  name: string;
  mimeType?: string;
  size?: number;
  createdAt: string;
};

export type TaskLocation = {
  address: string;
  latitude?: number;
  longitude?: number;
};

export type HistoryItem = {
  id: string;
  taskId: string;
  timestamp: string;
  action: string;
  description: string;
};

export type Task = {
  id: string;
  title: string;
  description: string;
  dueAt: string;
  location: TaskLocation;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  attachments: Attachment[];
  history: HistoryItem[];
  syncState: SyncState;
};

export type TaskInput = Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'history' | 'syncState'>;
