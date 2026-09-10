import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true
  })
});

export async function configureNotifications() {
  const permissions = await Notifications.getPermissionsAsync();
  if (!permissions.granted) {
    const requested = await Notifications.requestPermissionsAsync();
    if (!requested.granted) throw new Error('Notification permission was not granted.');
  }
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('tasks', {
      name: 'Task reminders',
      importance: Notifications.AndroidImportance.HIGH
    });
  }
}

export async function scheduleTaskReminder(taskId: string, title: string, dueAt: string) {
  await configureNotifications();
  const due = new Date(dueAt).getTime();
  const reminder = due - 30 * 60 * 1000;
  const now = Date.now();
  const triggerDate = reminder > now ? new Date(reminder) : new Date(now + 60 * 1000);
  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Upcoming task',
      body: `${title} is due soon.`,
      data: { taskId }
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate }
  });
}

export async function scheduleDemoReminder(taskId: string, title: string) {
  await configureNotifications();
  return Notifications.scheduleNotificationAsync({
    content: { title: 'Demo task reminder', body: `${title} demo notification fired.`, data: { taskId } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 45, repeats: false }
  });
}