# Field Task Manager

React Native / Expo + TypeScript assignment implementation.

**Candidate code: SA-RN-5837**

## Overview

Field Task Manager is an offline-first Android task application for field employees. It supports task creation/editing, status management, image attachments, local persistence, history, map markers, local reminders, and synchronization against a small `json-server` REST API.

## Main features

- Required title, description, due date/time and manual address validation.
- Statuses: New, In Progress, Completed, Cancelled.
- Task list with sorting by due date, date added and status.
- Detail view with history, attachments and actions.
- Image attachment using the device gallery.
- Graceful attachment rendering: inaccessible URIs do not prevent the task itself from loading.
- Local push reminder 30 minutes before due time.
- If the reminder time is already in the past, the app schedules a fallback within one minute and never later than the due time.
- Demo notification action schedules the same notification style after 45 seconds.
- Map markers for tasks containing coordinates. The seeded demo task has coordinates.
- Persistent history for creation, edits, status changes, attachment changes, deletion and sync.
- Offline task operations through AsyncStorage.
- Mock REST synchronization with `json-server`.
- Sync states: Pending Sync, Synced, Sync Failed. Failed requests are marked visibly and retried when connectivity returns or the user taps Sync.
- Light/dark theme toggle.
- Accessibility labels on primary interactive task controls.

## Architecture

- **UI:** React Navigation + small reusable components.
- **State management:** Zustand. It keeps task mutations and app state straightforward without introducing a large Redux layer.
- **Local storage:** AsyncStorage. The assignment data volume is intentionally small, and JSON persistence keeps the sample easy to inspect. SQLite would be a better choice for a very large task/history dataset.
- **Sync:** `src/services/sync.ts` owns connectivity checks and mock REST synchronization. The selected conflict policy is last-write-wins using `updatedAt`; locally deleted task IDs remain in a small outbox until the server confirms their deletion.
- **Notifications:** `src/services/notifications.ts` owns permission handling and reminder scheduling.
- **Task workflow:** `src/services/taskWorkflow.ts` coordinates validation, persistence and reminders without coupling that logic to the form UI.
- **Storage validation:** persisted and remote task payloads are validated before they enter application state.
- **Map/location:** MapLibre renders OpenStreetMap tiles without a Google Maps key. Manual Location entry is required; coordinates are optional and can be entered manually, selected from a predefined list, or chosen by tapping the map. The map displays markers for tasks that have coordinates.
- **Attachments:** Expo Image Picker stores local URI and metadata in the task record. The image itself remains in the OS/app media storage.
- **History:** Each task contains task-local history and the global local store maintains an aggregated history list.

## Installation

Requirements:

- Node.js LTS
- npm
- Android Studio/Android SDK for local Android testing, or an Expo-compatible development device
- Expo/EAS CLI for cloud builds

Install dependencies:

```bash
npm install
```

Start the Expo development server:

```bash
npm start
```

Android:

```bash
npm run android
```

Type-check:

```bash
npm run typecheck
```

Run the core unit tests:

```bash
npm test
```

## Mock REST server

From the project root:

```bash
npm run mock-server
```

The server listens on port 3000.

For Android Emulator, the app defaults to:

```text
http://10.0.2.2:3000
```

For a physical Android device, set the machine's LAN address:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.50:3000 npx expo start
```

The same URL can be supplied through an EAS environment variable when needed.

Sample data is in:

```text
mock-server/db.json
```

## APK build

The `preview` EAS profile explicitly requests an APK:

```bash
npm install --global eas-cli
eas login
eas build --platform android --profile preview
```

The resulting artifact is an installable `.apk`.

For a store-oriented Android App Bundle:

```bash
eas build --platform android --profile production
```

The repository intentionally uses `android.buildType: apk` for the preview profile because the assignment requires an installable/testable APK.

## Notification demo

Normal task creation schedules a reminder for 30 minutes before the due time.

If the due time is less than 30 minutes away, the app schedules a fallback up to one minute from now. For tasks due sooner than one minute, it schedules at the due time so the reminder never arrives after the deadline.

Enable **Demo notification mode** in Settings to make the next saved task use the same notification flow after 45 seconds. Demo mode replaces the regular reminder for that save, ensuring that each task has only one scheduled notification. This is intended for the video demonstration.

Notification permission must be granted on the Android device. The app requests it when a reminder is first scheduled and reports a clear error if permission is denied or scheduling fails.

## Map

The Android map uses MapLibre and OpenStreetMap raster tiles. No Google Cloud project, API key, or billing account is required. The map keeps the OpenStreetMap attribution visible and only loads tiles for the area the user is viewing.

The map form supports manual coordinate entry, a small predefined list of locations, and point selection by tapping the map. Real geocoding is intentionally not required: the task address remains a required manual field.

```powershell
npm run android
```

The mock seed contains a task at Alexanderplatz with latitude/longitude so the reviewer can immediately see a marker.

Manual address input is always required. The current implementation does not perform automatic geocoding. Tasks created manually without coordinates still work normally; they simply do not appear as map markers.
