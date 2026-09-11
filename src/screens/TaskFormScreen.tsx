import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
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
import * as ImagePicker from 'expo-image-picker';
import { Screen } from '../components/Screen';
import { StatusSelect } from '../components/StatusSelect';
import { OPEN_STREET_MAP_STYLE, OpenStreetMap } from '../components/OpenStreetMap';
import { useAppStore } from '../store/useAppStore';
import { Attachment, TaskStatus } from '../types';
import { useAppTheme } from '../theme/useAppTheme';
import { scheduleTaskReminder } from '../services/notifications';

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

export default function TaskFormScreen({ navigation, route }: any) {
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
  const editing = Boolean(existing);
  const valid = useMemo(
    () =>
      Boolean(title.trim() && description.trim() && address.trim() && dueAt.getTime() > Date.now()),
    [title, description, address, dueAt]
  );

  function selectCoordinates(nextCoordinates: { latitude: number; longitude: number }) {
    setCoordinates(nextCoordinates);
    setLatitudeText(String(nextCoordinates.latitude));
    setLongitudeText(String(nextCoordinates.longitude));
  }

  function updateManualCoordinates(nextLatitude: string, nextLongitude: string) {
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

  async function addImages() {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.8,
      });
      if (result.canceled) return;

      const createdAt = new Date().toISOString();
      setAttachments(current => [
        ...current,
        ...result.assets.map((asset, index) => ({
          id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
          uri: asset.uri,
          name: asset.fileName || `image-${Date.now()}-${index + 1}.jpg`,
          mimeType: asset.mimeType,
          size: asset.fileSize,
          createdAt,
        })),
      ]);
    } catch (error: any) {
      Alert.alert('Unable to add images', error?.message || 'Please try again.');
    }
  }

  async function save() {
    if (!title.trim()) return Alert.alert('Validation', 'Task title is required.');
    if (!description.trim()) return Alert.alert('Validation', 'Task description is required.');
    if (!address.trim()) return Alert.alert('Validation', 'Location address is required.');
    if (dueAt.getTime() <= Date.now())
      return Alert.alert('Validation', 'Due date/time must be in the future.');
    try {
      let taskId: string;
      if (editing) {
        await updateTask(existing!.id, {
          title: title.trim(),
          description: description.trim(),
          dueAt: dueAt.toISOString(),
          location: { address: address.trim(), ...coordinates },
          status,
          attachments,
        });
        taskId = existing!.id;
      } else {
        const task = await createTask({
          title: title.trim(),
          description: description.trim(),
          dueAt: dueAt.toISOString(),
          location: { address: address.trim(), ...coordinates },
          status,
          attachments,
        });
        taskId = task.id;
      }
      try {
        const reminder = await scheduleTaskReminder(taskId, title.trim(), dueAt.toISOString(), {
          demo: demoNotifications,
        });
        if (demoNotifications) {
          Alert.alert('Demo reminder scheduled', 'A notification will appear in about 45 seconds.');
        } else if (reminder.usesFallback) {
          Alert.alert(
            'Reminder scheduled in one minute',
            'The task is due in less than 30 minutes, so the usual 30-minute reminder is already in the past.'
          );
        }
      } catch (notificationError: any) {
        Alert.alert(
          'Task saved, reminder unavailable',
          notificationError?.message || 'Enable notifications in device settings and try again.'
        );
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
      <Text style={[styles.label, { color: theme.text }]}>Attachments (optional)</Text>
      <Text style={[styles.hint, { color: theme.muted }]}>
        Add photos before creating the task.
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add task images"
        style={[styles.addImages, { backgroundColor: theme.surface, borderColor: theme.border }]}
        onPress={addImages}
      >
        <Text style={{ color: theme.text }}>Add images</Text>
      </Pressable>
      {attachments.length > 0 && (
        <View style={styles.attachmentList}>
          {attachments.map(attachment => (
            <View
              key={attachment.id}
              style={[styles.attachment, { backgroundColor: theme.surface }]}
            >
              <Image source={{ uri: attachment.uri }} style={styles.attachmentImage} />
              <Text style={[styles.attachmentName, { color: theme.text }]} numberOfLines={1}>
                {attachment.name}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove ${attachment.name}`}
                onPress={() =>
                  setAttachments(current => current.filter(item => item.id !== attachment.id))
                }
              >
                <Text style={styles.removeAttachment}>Remove</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}
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
  addImages: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  attachmentList: { gap: 8, marginTop: 10 },
  attachment: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, padding: 8, gap: 9 },
  attachmentImage: { width: 44, height: 44, borderRadius: 7 },
  attachmentName: { flex: 1, fontSize: 13 },
  removeAttachment: { color: '#DC2626', fontWeight: '700', fontSize: 13 },
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
