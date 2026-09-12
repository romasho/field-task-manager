import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Camera, Marker } from '@maplibre/maplibre-react-native';
import * as Location from 'expo-location';
import { Screen } from '../components/Screen';
import { StatusSelect } from '../components/StatusSelect';
import { OPEN_STREET_MAP_STYLE, OpenStreetMap } from '../components/OpenStreetMap';
import { useAppStore } from '../store/useAppStore';
import { Attachment, TaskInput, TaskStatus } from '../types';
import { useAppTheme } from '../theme/useAppTheme';
import { getTaskValidationError, saveTaskWithReminder } from '../services/taskWorkflow';
import { TaskFormScreenProps } from '../types/navigation';
import { TaskAttachmentEditor } from '../components/TaskAttachmentEditor';
import {
  DEMO_DELAY_SECONDS,
  FALLBACK_DELAY_MINUTES,
  REMINDER_LEAD_MINUTES,
} from '../utils/reminderSchedule';

const TOP_CITIES = [
  { name: 'Tokyo, Japan', latitude: 35.6762, longitude: 139.6503 },
  { name: 'Delhi, India', latitude: 28.6139, longitude: 77.209 },
  { name: 'Shanghai, China', latitude: 31.2304, longitude: 121.4737 },
  { name: 'São Paulo, Brazil', latitude: -23.5505, longitude: -46.6333 },
  { name: 'Mexico City, Mexico', latitude: 19.4326, longitude: -99.1332 },
  { name: 'Cairo, Egypt', latitude: 30.0444, longitude: 31.2357 },
  { name: 'Beijing, China', latitude: 39.9042, longitude: 116.4074 },
  { name: 'Mumbai, India', latitude: 19.076, longitude: 72.8777 },
  { name: 'Osaka, Japan', latitude: 34.6937, longitude: 135.5023 },
  { name: 'Chongqing, China', latitude: 29.4316, longitude: 106.9123 },
];

export default function TaskFormScreen({ navigation, route }: TaskFormScreenProps) {
  const existingId = route.params?.taskId;
  const existing = useAppStore(s => s.tasks.find(t => t.id === existingId));
  const createTask = useAppStore(s => s.createTask);
  const updateTask = useAppStore(s => s.updateTask);
  const demoNotifications = useAppStore(s => s.demoNotifications);
  const theme = useAppTheme();
  const [title, setTitle] = useState(existing?.title || '');
  const [description, setDescription] = useState(existing?.description || '');
  const [address, setAddress] = useState(existing?.location.address || '');
  const [coordinates, setCoordinates] = useState(() => {
    const { latitude, longitude } = existing?.location || {};
    return Number.isFinite(latitude) && Number.isFinite(longitude)
      ? { latitude: latitude!, longitude: longitude! }
      : undefined;
  });
  const [latitudeText, setLatitudeText] = useState(coordinates ? String(coordinates.latitude) : '');
  const [longitudeText, setLongitudeText] = useState(
    coordinates ? String(coordinates.longitude) : ''
  );
  const [dueAt, setDueAt] = useState(
    existing ? new Date(existing.dueAt) : new Date(Date.now() + 60 * 60 * 1000)
  );
  const [status, setStatus] = useState<TaskStatus>(existing?.status || 'New');
  const [attachments, setAttachments] = useState<Attachment[]>(existing?.attachments || []);
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const [cityPickerOpen, setCityPickerOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string | null>(
    TOP_CITIES.find(city => city.name === existing?.location.address)?.name || null
  );
  const [locationHint, setLocationHint] = useState<string | null>(null);
  const locationWasSetManually = useRef(Boolean(existing?.location.latitude));
  const editing = existingId !== undefined;
  const draft = useMemo<TaskInput>(
    () => ({
      title,
      description,
      dueAt: Number.isFinite(dueAt.getTime()) ? dueAt.toISOString() : '',
      location: { address, ...coordinates },
      status,
      attachments,
    }),
    [address, attachments, coordinates, description, dueAt, status, title]
  );
  const valid = getTaskValidationError(draft) === null;

  useEffect(() => {
    if (editing) return;
    let cancelled = false;
    loadDeviceLocation(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [editing]);

  if (editing && !existing) {
    return (
      <Screen>
        <Text style={{ color: theme.text }}>This task is no longer available.</Text>
        <Pressable style={styles.save} onPress={() => navigation.goBack()}>
          <Text style={styles.saveText}>Go back</Text>
        </Pressable>
      </Screen>
    );
  }

  function selectCoordinates(
    nextCoordinates: { latitude: number; longitude: number },
    fromDevice = false
  ) {
    if (!fromDevice) locationWasSetManually.current = true;
    setCoordinates(nextCoordinates);
    setLatitudeText(String(nextCoordinates.latitude));
    setLongitudeText(String(nextCoordinates.longitude));
  }

  async function loadDeviceLocation(isCancelled = () => false, force = false) {
    setLocationHint('Getting device location…');
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
      if (!isCancelled())
        setLocationHint('Location permission was not granted. Enter coordinates or choose a city.');
      return;
    }

    try {
      const lastKnown = await Location.getLastKnownPositionAsync({
        maxAge: 5 * 60 * 1000,
        requiredAccuracy: 1_000,
      });
      const position =
        lastKnown ||
        (await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Location request timed out.')), 10_000)
          ),
        ]));
      if (!isCancelled() && (force || !locationWasSetManually.current)) {
        selectCoordinates(
          {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
          true
        );
        setLocationHint('Coordinates filled from the device location.');
      }
    } catch {
      if (!isCancelled())
        setLocationHint('Device location is unavailable. Enter coordinates or choose a city.');
    }
  }

  function updateManualCoordinates(nextLatitude: string, nextLongitude: string) {
    locationWasSetManually.current = true;
    setSelectedCity(null);
    setLatitudeText(nextLatitude);
    setLongitudeText(nextLongitude);
    const latitude = Number(nextLatitude);
    const longitude = Number(nextLongitude);
    if (
      Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180
    ) {
      setCoordinates({ latitude, longitude });
    } else {
      setCoordinates(undefined);
    }
  }

  function selectCity(city: (typeof TOP_CITIES)[number]) {
    selectCoordinates(city);
    setAddress(city.name);
    setSelectedCity(city.name);
    setCityPickerOpen(false);
  }

  async function save() {
    const validationError = getTaskValidationError(draft);
    if (validationError) return Alert.alert('Validation', validationError);
    try {
      const { reminder, reminderError } = await saveTaskWithReminder(
        { draft, existingTaskId: existingId, demoNotifications },
        { createTask, updateTask }
      );
      if (reminderError) {
        Alert.alert('Task saved, reminder unavailable', reminderError.message);
      } else if (reminder) {
        if (demoNotifications) {
          Alert.alert(
            'Demo reminder scheduled',
            `A notification will appear in about ${DEMO_DELAY_SECONDS} seconds.`
          );
        } else if (reminder.usesFallback) {
          Alert.alert(
            `Reminder scheduled in ${FALLBACK_DELAY_MINUTES} minute`,
            `The task is due in less than ${REMINDER_LEAD_MINUTES} minutes, so the usual ${REMINDER_LEAD_MINUTES}-minute reminder is already in the past.`
          );
        }
      }
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Save failed', e?.message || 'Please try again.');
    }
  }

  return (
    <Screen>
      <Text style={[styles.label, { color: theme.text }]}>Title *</Text>
      <TextInput
        style={[
          styles.input,
          { backgroundColor: theme.input, borderColor: theme.border, color: theme.text },
        ]}
        placeholderTextColor={theme.muted}
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. Inspect equipment"
      />
      <Text style={[styles.label, { color: theme.text }]}>Description *</Text>
      <TextInput
        style={[
          styles.input,
          styles.multiline,
          { backgroundColor: theme.input, borderColor: theme.border, color: theme.text },
        ]}
        placeholderTextColor={theme.muted}
        value={description}
        onChangeText={setDescription}
        multiline
        placeholder="What needs to be done?"
      />
      <TaskAttachmentEditor attachments={attachments} onChange={setAttachments} />
      <Text style={[styles.label, { color: theme.text }]}>Location *</Text>
      <TextInput
        style={[
          styles.input,
          { backgroundColor: theme.input, borderColor: theme.border, color: theme.text },
        ]}
        placeholderTextColor={theme.muted}
        value={address}
        onChangeText={setAddress}
        placeholder="Choose a point on the map or enter an address"
      />
      <Text style={[styles.label, { color: theme.text }]}>Coordinates (optional)</Text>
      <Text style={[styles.hint, { color: theme.muted }]}>
        Enter latitude and longitude, choose a city, or tap the map. Choosing a city fills Location.
      </Text>
      {locationHint && (
        <Text style={[styles.locationHint, { color: theme.muted }]}>{locationHint}</Text>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Refresh device location"
        style={[styles.refreshLocation, { borderColor: theme.border }]}
        onPress={() => loadDeviceLocation(() => false, true)}
      >
        <Text style={{ color: theme.text }}>Use current device location</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`City location: ${selectedCity || 'not selected'}. Choose a city`}
        accessibilityState={{ expanded: cityPickerOpen }}
        style={[styles.citySelect, { backgroundColor: theme.input, borderColor: theme.border }]}
        onPress={() => setCityPickerOpen(true)}
      >
        <Text style={[styles.citySelectText, { color: selectedCity ? theme.text : theme.muted }]}>
          {selectedCity || 'Choose from 10 world cities'}
        </Text>
        <Text style={[styles.cityChevron, { color: theme.muted }]}>⌄</Text>
      </Pressable>
      <View style={styles.coordinateRow}>
        <TextInput
          style={[
            styles.coordinateInput,
            { backgroundColor: theme.input, borderColor: theme.border, color: theme.text },
          ]}
          placeholderTextColor={theme.muted}
          value={latitudeText}
          onChangeText={value => updateManualCoordinates(value, longitudeText)}
          keyboardType="decimal-pad"
          placeholder="Latitude"
        />
        <TextInput
          style={[
            styles.coordinateInput,
            { backgroundColor: theme.input, borderColor: theme.border, color: theme.text },
          ]}
          placeholderTextColor={theme.muted}
          value={longitudeText}
          onChangeText={value => updateManualCoordinates(latitudeText, value)}
          keyboardType="decimal-pad"
          placeholder="Longitude"
        />
      </View>
      <View style={styles.map}>
        <OpenStreetMap
          style={StyleSheet.absoluteFill}
          mapStyle={OPEN_STREET_MAP_STYLE}
          onPress={event => {
            const [longitude, latitude] = event.nativeEvent.lngLat;
            selectCoordinates({ latitude, longitude });
            setSelectedCity(null);
          }}
        >
          <Camera
            initialViewState={{
              center: coordinates ? [coordinates.longitude, coordinates.latitude] : [13.405, 52.52],
              zoom: coordinates ? 12 : 10,
            }}
          />
          {coordinates && (
            <Marker id="task-location" lngLat={[coordinates.longitude, coordinates.latitude]}>
              <View style={styles.marker} />
            </Marker>
          )}
        </OpenStreetMap>
      </View>
      <Text style={[styles.coordinates, { color: theme.text }]}>
        {coordinates
          ? `${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}`
          : 'No location selected'}
      </Text>
      <Text style={[styles.label, { color: theme.text }]}>Due date/time *</Text>
      <View style={styles.dateRow}>
        <Pressable
          style={[styles.secondary, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={() => setShowDate(true)}
        >
          <Text style={{ color: theme.text }}>{dueAt.toLocaleDateString()}</Text>
        </Pressable>
        <Pressable
          style={[styles.secondary, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={() => setShowTime(true)}
        >
          <Text style={{ color: theme.text }}>
            {dueAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </Pressable>
      </View>
      {showDate && (
        <DateTimePicker
          value={dueAt}
          mode="date"
          onChange={(_, d) => {
            setShowDate(false);
            if (d)
              setDueAt(
                new Date(
                  dueAt.getFullYear(),
                  d.getMonth(),
                  d.getDate(),
                  dueAt.getHours(),
                  dueAt.getMinutes()
                )
              );
          }}
        />
      )}
      {showTime && (
        <DateTimePicker
          value={dueAt}
          mode="time"
          onChange={(_, d) => {
            setShowTime(false);
            if (d)
              setDueAt(
                new Date(
                  dueAt.getFullYear(),
                  dueAt.getMonth(),
                  dueAt.getDate(),
                  d.getHours(),
                  d.getMinutes()
                )
              );
          }}
        />
      )}
      {editing && (
        <>
          <Text style={[styles.label, { color: theme.text }]}>Status</Text>
          <StatusSelect value={status} onChange={setStatus} />
        </>
      )}
      <Pressable disabled={!valid} style={[styles.save, !valid && { opacity: 0.5 }]} onPress={save}>
        <Text style={styles.saveText}>{editing ? 'Save changes' : 'Create task'}</Text>
      </Pressable>
      <Modal
        visible={cityPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCityPickerOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setCityPickerOpen(false)}>
          <Pressable
            accessibilityViewIsModal
            style={[styles.cityMenu, { backgroundColor: theme.surface }]}
            onPress={event => event.stopPropagation()}
          >
            <Text style={[styles.cityMenuTitle, { color: theme.text }]}>Choose a city</Text>
            <ScrollView style={styles.cityList}>
              {TOP_CITIES.map(city => {
                const selected = city.name === selectedCity;
                return (
                  <Pressable
                    key={city.name}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={[styles.cityOption, selected && { backgroundColor: theme.subtle }]}
                    onPress={() => selectCity(city)}
                  >
                    <Text style={[styles.cityOptionText, { color: theme.text }]}>{city.name}</Text>
                    {selected && <Text style={styles.selectedIcon}>✓</Text>}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}
const styles = StyleSheet.create({
  label: { fontWeight: '700', color: '#374151', marginBottom: 6, marginTop: 10 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
  multiline: { minHeight: 110, textAlignVertical: 'top' },
  hint: { color: '#6B7280', fontSize: 13, marginBottom: 8 },
  locationHint: { fontSize: 13, marginBottom: 8 },
  refreshLocation: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 9,
    marginBottom: 10,
  },
  map: { height: 220, borderRadius: 10, overflow: 'hidden' },
  coordinateRow: { flexDirection: 'row', gap: 10 },
  coordinateInput: { flex: 1, borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 16 },
  citySelect: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
  },
  citySelectText: { flex: 1, fontSize: 16 },
  cityChevron: { fontSize: 20, lineHeight: 18, marginLeft: 10 },
  marker: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#DC2626',
    borderWidth: 2,
    borderColor: '#fff',
  },
  coordinates: { color: '#374151', fontSize: 13, marginTop: 6 },
  dateRow: { flexDirection: 'row', gap: 10 },
  secondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    padding: 13,
    flex: 1,
  },
  save: {
    backgroundColor: '#2563EB',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  saveText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(15, 23, 42, 0.48)',
  },
  cityMenu: { borderRadius: 16, padding: 16, maxHeight: '70%' },
  cityMenuTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  cityList: { flexGrow: 0 },
  cityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  cityOptionText: { flex: 1, fontSize: 16, fontWeight: '600' },
  selectedIcon: { color: '#2563EB', fontWeight: '800' },
});
