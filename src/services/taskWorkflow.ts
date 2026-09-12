import { cancelTaskReminders, ReminderScheduleResult, scheduleTaskReminder } from './notifications';
import { Task, TaskInput } from '../types';

type SaveTaskDependencies = {
  createTask: (input: TaskInput) => Promise<Task>;
  updateTask: (taskId: string, patch: Partial<TaskInput>) => Promise<void>;
};

type SaveTaskOptions = {
  draft: TaskInput;
  existingTaskId?: string;
  demoNotifications: boolean;
};

export type SaveTaskResult = {
  reminder?: ReminderScheduleResult;
  reminderError?: Error;
};

export function getTaskValidationError(task: TaskInput): string | null {
  if (!task.title.trim()) return 'Task title is required.';
  if (!task.description.trim()) return 'Task description is required.';
  if (!task.location.address.trim()) return 'Location address is required.';
  const dueAt = new Date(task.dueAt).getTime();
  if (!Number.isFinite(dueAt) || dueAt <= Date.now()) {
    return 'Due date/time must be in the future.';
  }
  return null;
}

export async function saveTaskWithReminder(
  { draft, existingTaskId, demoNotifications }: SaveTaskOptions,
  { createTask, updateTask }: SaveTaskDependencies
): Promise<SaveTaskResult> {
  const validationError = getTaskValidationError(draft);
  if (validationError) throw new Error(validationError);

  const normalizedDraft: TaskInput = {
    ...draft,
    title: draft.title.trim(),
    description: draft.description.trim(),
    location: { ...draft.location, address: draft.location.address.trim() },
  };
  let taskId = existingTaskId;
  if (taskId) {
    await updateTask(taskId, normalizedDraft);
  } else {
    taskId = (await createTask(normalizedDraft)).id;
  }

  try {
    if (normalizedDraft.status === 'Completed' || normalizedDraft.status === 'Cancelled') {
      await cancelTaskReminders(taskId);
      return {};
    }
    const reminder = await scheduleTaskReminder(
      taskId,
      normalizedDraft.title,
      normalizedDraft.dueAt,
      {
        demo: demoNotifications,
      }
    );
    return { reminder };
  } catch (error) {
    return {
      reminderError: error instanceof Error ? error : new Error('Unable to schedule the reminder.'),
    };
  }
}
