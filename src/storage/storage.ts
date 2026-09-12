import AsyncStorage from '@react-native-async-storage/async-storage';
import { HistoryItem, Task } from '../types';
import { parseStoredArray, storageValidators } from '../utils/storageValidation';

const TASKS = '@field_tasks/tasks';
const LOGS = '@field_tasks/logs';
const THEME = '@field_tasks/theme';
const DELETED_TASK_IDS = '@field_tasks/deleted_task_ids';

export async function loadTasks(): Promise<Task[]> {
  const raw = await AsyncStorage.getItem(TASKS);
  return parseStoredArray(raw, storageValidators.task);
}
export async function saveTasks(tasks: Task[]) {
  await AsyncStorage.setItem(TASKS, JSON.stringify(tasks));
}
export async function loadLogs(): Promise<HistoryItem[]> {
  const raw = await AsyncStorage.getItem(LOGS);
  return parseStoredArray(raw, storageValidators.historyItem);
}
export async function saveLogs(logs: HistoryItem[]) {
  await AsyncStorage.setItem(LOGS, JSON.stringify(logs));
}
export async function loadDeletedTaskIds(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(DELETED_TASK_IDS);
  return parseStoredArray(raw, storageValidators.string);
}
export async function saveDeletedTaskIds(ids: string[]) {
  await AsyncStorage.setItem(DELETED_TASK_IDS, JSON.stringify(ids));
}
export async function loadTheme(): Promise<'light' | 'dark'> {
  const theme = await AsyncStorage.getItem(THEME);
  return theme === 'dark' ? 'dark' : 'light';
}
export async function saveTheme(theme: 'light' | 'dark') {
  await AsyncStorage.setItem(THEME, theme);
}
