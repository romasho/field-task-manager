import React, { useState } from 'react';
import { Alert, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Marker } from '@maplibre/maplibre-react-native';
import { Screen } from '../components/Screen';
import { StatusSelect } from '../components/StatusSelect';
import { OPEN_STREET_MAP_STYLE, OpenStreetMap } from '../components/OpenStreetMap';
import { useAppStore } from '../store/useAppStore';
import { scheduleDemoReminder } from '../services/notifications';
import { useAppTheme } from '../theme/useAppTheme';
import { Attachment } from '../types';

export default function TaskDetailScreen({ navigation, route }: any) {
  const task = useAppStore(s => s.tasks.find(t => t.id === route.params.taskId));
  const updateStatus = useAppStore(s => s.updateStatus);
  const addAttachment = useAppStore(s => s.addAttachment);
  const removeAttachment = useAppStore(s => s.removeAttachment);
  const deleteTask = useAppStore(s => s.deleteTask);
  const theme = useAppTheme();
  const [preview, setPreview] = useState<Attachment | null>(null);
  if (!task)
    return (
      <Screen>
        <Text style={{ color: theme.text }}>Task not found.</Text>
      </Screen>
    );

  async function addImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    await addAttachment(task!.id, {
      id: `${Date.now()}`,
      uri: asset.uri,
      name: asset.fileName || `image-${Date.now()}.jpg`,
      mimeType: asset.mimeType,
      size: asset.fileSize,
      createdAt: new Date().toISOString(),
    });
  }

  function remove() {
    Alert.alert('Delete task?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteTask(task!.id);
          navigation.goBack();
        },
      },
    ]);
  }

  return (
    <Screen>
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
          {task.title}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit task"
          style={[styles.edit, { backgroundColor: theme.subtle }]}
          onPress={() => navigation.navigate('TaskForm', { taskId: task.id })}
        >
          <Text style={[styles.editText, { color: theme.text }]}>✎ Edit</Text>
        </Pressable>
      </View>
      <View style={styles.statusSection}>
        <Text style={[styles.statusLabel, { color: theme.muted }]}>Current status</Text>
        <StatusSelect value={task.status} onChange={status => updateStatus(task.id, status)} />
      </View>
      <Text style={[styles.section, { color: theme.text }]}>Description</Text>
      <Text style={[styles.body, { color: theme.text }]}>{task.description}</Text>
      <Text style={[styles.section, { color: theme.text }]}>Due</Text>
      <Text style={[styles.body, { color: theme.text }]}>
        {new Date(task.dueAt).toLocaleString()}
      </Text>
      <Text style={[styles.section, { color: theme.text }]}>Location</Text>
      <Text style={[styles.body, { color: theme.text }]}>
        📍 {task.location.address || 'No location'}
      </Text>
      {Number.isFinite(task.location.latitude) && Number.isFinite(task.location.longitude) && (
        <>
          <Text style={[styles.coordinates, { color: theme.muted }]}>
            {task.location.latitude!.toFixed(6)}, {task.location.longitude!.toFixed(6)}
          </Text>
          <Text style={[styles.section, { color: theme.text }]}>Map</Text>
          <View style={styles.map}>
            <OpenStreetMap style={StyleSheet.absoluteFill} mapStyle={OPEN_STREET_MAP_STYLE}>
              <Camera
                initialViewState={{
                  center: [task.location.longitude!, task.location.latitude!],
                  zoom: 14,
                }}
              />
              <Marker
                id={`task-location-${task.id}`}
                lngLat={[task.location.longitude!, task.location.latitude!]}
              >
                <View style={styles.mapMarker} />
              </Marker>
            </OpenStreetMap>
          </View>
        </>
      )}
      <View style={styles.row}>
        <Pressable
          style={[styles.secondary, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={addImage}
        >
          <Text style={{ color: theme.text }}>Add image</Text>
        </Pressable>
        <Pressable
          style={[styles.secondary, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={() =>
            scheduleDemoReminder(task.id, task.title)
              .then(() =>
                Alert.alert(
                  'Demo reminder scheduled',
                  'A notification will appear in about 45 seconds.'
                )
              )
              .catch(e =>
                Alert.alert(
                  'Notification unavailable',
                  e?.message || 'Enable notifications in device settings and try again.'
                )
              )
          }
        >
          <Text style={{ color: theme.text }}>Demo alert</Text>
        </Pressable>
      </View>
      <Text style={[styles.section, { color: theme.text }]}>Attachments</Text>
      {task.attachments.length === 0 ? (
        <Text style={[styles.muted, { color: theme.muted }]}>No attachments.</Text>
      ) : (
        task.attachments.map(a => (
          <View key={a.id} style={[styles.attachment, { backgroundColor: theme.surface }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Preview ${a.name}`}
              onPress={() => setPreview(a)}
            >
              {a.uri ? <Image source={{ uri: a.uri }} style={styles.image} /> : null}
            </Pressable>
            <View style={{ flex: 1 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Preview ${a.name}`}
                onPress={() => setPreview(a)}
              >
                <Text style={{ color: theme.text }} numberOfLines={1}>
                  {a.name}
                </Text>
                <Text style={[styles.previewHint, { color: theme.muted }]}>Tap to preview</Text>
              </Pressable>
              <Pressable onPress={() => removeAttachment(task.id, a.id)}>
                <Text style={styles.deleteText}>Remove</Text>
              </Pressable>
            </View>
          </View>
        ))
      )}
      <Text style={[styles.section, { color: theme.text }]}>History</Text>
      {task.history.map(h => (
        <View key={h.id} style={[styles.history, { backgroundColor: theme.surface }]}>
          <Text style={[styles.historyTime, { color: theme.muted }]}>
            {new Date(h.timestamp).toLocaleString()}
          </Text>
          <Text style={{ color: theme.text }}>{h.description}</Text>
        </View>
      ))}
      <Pressable style={styles.delete} onPress={remove}>
        <Text style={styles.deleteText}>Delete task</Text>
      </Pressable>
      <Modal
        visible={Boolean(preview)}
        transparent
        animationType="fade"
        onRequestClose={() => setPreview(null)}
      >
        <View style={styles.previewOverlay}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close preview"
            style={styles.closePreview}
            onPress={() => setPreview(null)}
          >
            <Text style={styles.closePreviewText}>Close</Text>
          </Pressable>
          {preview?.uri && (
            <Image source={{ uri: preview.uri }} style={styles.previewImage} resizeMode="contain" />
          )}
          <Text style={styles.previewName} numberOfLines={2}>
            {preview?.name}
          </Text>
        </View>
      </Modal>
    </Screen>
  );
}
const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  title: { flex: 1, fontSize: 26, fontWeight: '800', color: '#111827' },
  edit: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10 },
  editText: { fontWeight: '800' },
  statusSection: { marginTop: 14 },
  statusLabel: { fontSize: 13, fontWeight: '700', marginBottom: 6 },
  section: { fontSize: 15, fontWeight: '800', marginTop: 20, marginBottom: 6, color: '#374151' },
  body: { fontSize: 15, color: '#374151', lineHeight: 22 },
  coordinates: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  map: { height: 200, borderRadius: 12, overflow: 'hidden' },
  mapMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#DC2626',
    borderWidth: 3,
    borderColor: '#fff',
  },
  row: { flexDirection: 'row', gap: 7, flexWrap: 'wrap', marginTop: 15 },
  secondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    padding: 11,
    borderRadius: 9,
  },
  attachment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
  },
  image: { width: 60, height: 60, borderRadius: 8 },
  previewHint: { fontSize: 12, marginTop: 3 },
  deleteText: { color: '#DC2626', fontWeight: '700', marginTop: 5 },
  history: { backgroundColor: '#fff', padding: 10, borderRadius: 9, marginBottom: 7 },
  historyTime: { fontSize: 11, color: '#6B7280', marginBottom: 3 },
  muted: { color: '#6B7280' },
  delete: { alignItems: 'center', padding: 15, marginTop: 20, marginBottom: 30 },
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.94)',
    padding: 20,
    justifyContent: 'center',
  },
  closePreview: {
    position: 'absolute',
    top: 52,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  closePreviewText: { color: '#fff', fontWeight: '800' },
  previewImage: { width: '100%', height: '78%' },
  previewName: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '700',
    marginTop: 18,
    fontSize: 16,
  },
});
