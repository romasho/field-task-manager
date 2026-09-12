import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { createReminderPlan } from '../utils/reminderSchedule';

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
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('tasks', {
      name: 'Task reminders',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const permissions = await Notifications.getPermissionsAsync();
  if (!permissions.granted) {
    const requested = await Notifications.requestPermissionsAsync();
    if (!requested.granted) {
      throw new Error(
        'Notifications are disabled. Enable them in device settings to receive reminders.'
      );
    }
  }
}

export async function cancelTaskReminders(taskId: string) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter(notification => notification.content.data?.taskId === taskId)
      .map(notification => Notifications.cancelScheduledNotificationAsync(notification.identifier))
  );
}

export async function scheduleTaskReminder(
  taskId: string,
  title: string,
  dueAt: string,
  { demo = false }: ScheduleOptions = {}
): Promise<ReminderScheduleResult> {
  createReminderPlan(dueAt, Date.now(), demo);
  await configureNotifications();
  const plan = createReminderPlan(dueAt, Date.now(), demo);
  await cancelTaskReminders(taskId);
  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Upcoming task',
      body: `${title} is due soon.`,
      data: { taskId, mode: demo ? 'demo' : 'scheduled' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: new Date(plan.triggerAt),
      channelId: Platform.OS === 'android' ? 'tasks' : undefined,
    },
  });
  return { identifier, usesFallback: plan.usesFallback };
}
