import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const REMINDER_LEAD_MS = 30 * 60 * 1000;
const FALLBACK_DELAY_MS = 60 * 1000;
const DEMO_DELAY_SECONDS = 45;

type ScheduleOptions = { demo?: boolean };

export type ReminderScheduleResult = {
  identifier: string;
  usesFallback: boolean;
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function configureNotifications() {
  const permissions = await Notifications.getPermissionsAsync();
  if (!permissions.granted) {
    const requested = await Notifications.requestPermissionsAsync();
    if (!requested.granted) {
      throw new Error(
        'Notifications are disabled. Enable them in device settings to receive reminders.'
      );
    }
  }
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('tasks', {
      name: 'Task reminders',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
}

async function cancelTaskReminders(taskId: string, kind: 'task' | 'demo') {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter(
        notification =>
          notification.content.data?.taskId === taskId && notification.content.data?.kind === kind
      )
      .map(notification => Notifications.cancelScheduledNotificationAsync(notification.identifier))
  );
}

export async function scheduleTaskReminder(
  taskId: string,
  title: string,
  dueAt: string,
  { demo = false }: ScheduleOptions = {}
): Promise<ReminderScheduleResult> {
  await configureNotifications();
  await cancelTaskReminders(taskId, demo ? 'demo' : 'task');
  const due = new Date(dueAt).getTime();
  if (!Number.isFinite(due)) throw new Error('The task due date is invalid.');
  const now = Date.now();
  const reminder = due - REMINDER_LEAD_MS;
  const usesFallback = !demo && reminder <= now;
  const trigger = demo
    ? {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL as const,
        seconds: DEMO_DELAY_SECONDS,
        repeats: false,
      }
    : {
        type: Notifications.SchedulableTriggerInputTypes.DATE as const,
        date: new Date(usesFallback ? now + FALLBACK_DELAY_MS : reminder),
      };
  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: demo ? 'Demo task reminder' : 'Upcoming task',
      body: demo ? `${title} demo notification fired.` : `${title} is due soon.`,
      data: { taskId, kind: demo ? 'demo' : 'task' },
    },
    trigger,
  });
  return { identifier, usesFallback };
}

export async function scheduleDemoReminder(taskId: string, title: string) {
  return scheduleTaskReminder(taskId, title, new Date().toISOString(), { demo: true });
}
