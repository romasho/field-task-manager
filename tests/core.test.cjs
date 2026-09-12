const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function loadTypeScriptModule(relativePath, moduleOverrides = {}) {
  const filename = path.resolve(__dirname, relativePath);
  const source = fs.readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const loadedModule = { exports: {} };
  const localRequire = moduleId =>
    Object.prototype.hasOwnProperty.call(moduleOverrides, moduleId)
      ? moduleOverrides[moduleId]
      : require(moduleId);
  new Function('require', 'module', 'exports', output)(
    localRequire,
    loadedModule,
    loadedModule.exports
  );
  return loadedModule.exports;
}

const { parseStoredArray, storageValidators } = loadTypeScriptModule(
  '../src/utils/storageValidation.ts'
);
const { selectNewestTask } = loadTypeScriptModule('../src/utils/syncConflict.ts');
const { createReminderPlan, DEMO_DELAY_MS, REMINDER_LEAD_MS } = loadTypeScriptModule(
  '../src/utils/reminderSchedule.ts'
);

function task(updatedAt) {
  return {
    id: 'task-1',
    title: 'Inspect equipment',
    description: 'Check the pump',
    dueAt: '2026-09-12T12:00:00.000Z',
    location: { address: 'Site A' },
    status: 'New',
    createdAt: '2026-09-10T12:00:00.000Z',
    updatedAt,
    attachments: [],
    history: [],
    syncState: 'Synced',
  };
}

test('invalid persisted JSON falls back to an empty collection', () => {
  assert.deepEqual(parseStoredArray('{broken', storageValidators.task), []);
});

test('invalid records are removed from persisted collections', () => {
  const validTask = task('2026-09-11T12:00:00.000Z');
  assert.deepEqual(
    parseStoredArray(JSON.stringify([validTask, { id: 'invalid' }]), storageValidators.task),
    [validTask]
  );
});

test('last-write-wins keeps a newer remote task', () => {
  const localTask = task('2026-09-11T10:00:00.000Z');
  const remoteTask = { ...task('2026-09-11T11:00:00.000Z'), title: 'Updated remotely' };
  assert.equal(selectNewestTask(localTask, remoteTask), remoteTask);
});

test('last-write-wins keeps local data when timestamps are equal', () => {
  const localTask = task('2026-09-11T10:00:00.000Z');
  const remoteTask = { ...localTask, title: 'Remote copy' };
  assert.equal(selectNewestTask(localTask, remoteTask), localTask);
});

test('regular reminders are scheduled 30 minutes before the due time', () => {
  const now = Date.parse('2026-09-11T10:00:00.000Z');
  const due = Date.parse('2026-09-11T12:00:00.000Z');
  assert.deepEqual(createReminderPlan(new Date(due).toISOString(), now), {
    triggerAt: due - REMINDER_LEAD_MS,
    usesFallback: false,
  });
});

test('fallback reminders run within one minute but never after the due time', () => {
  const now = Date.parse('2026-09-11T10:00:00.000Z');
  const dueInTenMinutes = now + 10 * 60 * 1000;
  const dueInThirtySeconds = now + 30 * 1000;
  assert.equal(
    createReminderPlan(new Date(dueInTenMinutes).toISOString(), now).triggerAt,
    now + 60_000
  );
  assert.equal(
    createReminderPlan(new Date(dueInThirtySeconds).toISOString(), now).triggerAt,
    dueInThirtySeconds
  );
});

test('demo mode schedules the same flow after 45 seconds', () => {
  const now = Date.parse('2026-09-11T10:00:00.000Z');
  const due = new Date(now + 60 * 60 * 1000).toISOString();
  assert.equal(createReminderPlan(due, now, true).triggerAt, now + DEMO_DELAY_MS);
});

test('past due dates are rejected before requesting notification permission', () => {
  const now = Date.parse('2026-09-11T10:00:00.000Z');
  assert.throws(() => createReminderPlan('2026-09-11T09:59:00.000Z', now), /already passed/);
});

test('notification service uses one Android channel and replaces old task reminders', async () => {
  const calls = [];
  const scheduledNotifications = [
    { identifier: 'old-regular', content: { data: { taskId: 'task-1', kind: 'task' } } },
    { identifier: 'old-demo', content: { data: { taskId: 'task-1', kind: 'demo' } } },
    { identifier: 'other-task', content: { data: { taskId: 'task-2' } } },
  ];
  const notificationsMock = {
    AndroidImportance: { HIGH: 4 },
    SchedulableTriggerInputTypes: { DATE: 'date' },
    setNotificationHandler: () => {},
    setNotificationChannelAsync: async (id, settings) => calls.push(['channel', id, settings]),
    getPermissionsAsync: async () => {
      calls.push(['permissions']);
      return { granted: true };
    },
    requestPermissionsAsync: async () => ({ granted: true }),
    getAllScheduledNotificationsAsync: async () => scheduledNotifications,
    cancelScheduledNotificationAsync: async identifier => calls.push(['cancel', identifier]),
    scheduleNotificationAsync: async request => {
      calls.push(['schedule', request]);
      return 'new-reminder';
    },
  };
  const notificationService = loadTypeScriptModule('../src/services/notifications.ts', {
    'expo-notifications': notificationsMock,
    'react-native': { Platform: { OS: 'android' } },
    '../utils/reminderSchedule': { createReminderPlan },
  });

  await notificationService.scheduleTaskReminder(
    'task-1',
    'Inspect equipment',
    new Date(Date.now() + 60 * 60 * 1000).toISOString()
  );

  assert.deepEqual(calls[0].slice(0, 2), ['channel', 'tasks']);
  assert.deepEqual(
    calls.filter(call => call[0] === 'cancel').map(call => call[1]),
    ['old-regular', 'old-demo']
  );
  const request = calls.find(call => call[0] === 'schedule')[1];
  assert.equal(request.trigger.channelId, 'tasks');
  assert.equal(request.content.title, 'Upcoming task');
  assert.equal(request.content.body, 'Inspect equipment is due soon.');
});

test('notification permission denial returns a user-friendly error', async () => {
  const notificationsMock = {
    AndroidImportance: { HIGH: 4 },
    SchedulableTriggerInputTypes: { DATE: 'date' },
    setNotificationHandler: () => {},
    setNotificationChannelAsync: async () => {},
    getPermissionsAsync: async () => ({ granted: false }),
    requestPermissionsAsync: async () => ({ granted: false }),
  };
  const notificationService = loadTypeScriptModule('../src/services/notifications.ts', {
    'expo-notifications': notificationsMock,
    'react-native': { Platform: { OS: 'android' } },
    '../utils/reminderSchedule': { createReminderPlan },
  });

  await assert.rejects(
    notificationService.scheduleTaskReminder(
      'task-1',
      'Inspect equipment',
      new Date(Date.now() + 60 * 60 * 1000).toISOString()
    ),
    /Notifications are disabled/
  );
});
