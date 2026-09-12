export const REMINDER_LEAD_MINUTES = 30;
export const DEMO_DELAY_SECONDS = 30;
export const FALLBACK_DELAY_MINUTES = 1;

export const REMINDER_LEAD_MS = REMINDER_LEAD_MINUTES * 60 * 1000;
export const FALLBACK_DELAY_MS = FALLBACK_DELAY_MINUTES * 60 * 1000;
export const DEMO_DELAY_MS = DEMO_DELAY_SECONDS * 1000;

export type ReminderPlan = {
  triggerAt: number;
  usesFallback: boolean;
};

export function createReminderPlan(
  dueAt: string,
  currentTime = Date.now(),
  demo = false
): ReminderPlan {
  const dueTime = new Date(dueAt).getTime();
  if (!Number.isFinite(dueTime)) throw new Error('The task due date is invalid.');
  if (dueTime <= currentTime) throw new Error('The task due date has already passed.');

  if (demo) {
    return { triggerAt: currentTime + DEMO_DELAY_MS, usesFallback: false };
  }

  const regularTriggerTime = dueTime - REMINDER_LEAD_MS;
  if (regularTriggerTime > currentTime) {
    return { triggerAt: regularTriggerTime, usesFallback: false };
  }

  return {
    triggerAt: Math.min(currentTime + FALLBACK_DELAY_MS, dueTime),
    usesFallback: true,
  };
}
