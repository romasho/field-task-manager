import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Camera, Marker } from '@maplibre/maplibre-react-native';
import { useAppStore } from '../store/useAppStore';
import { useAppTheme } from '../theme/useAppTheme';
import { OPEN_STREET_MAP_STYLE, OpenStreetMap } from '../components/OpenStreetMap';
import { RootNavigation } from '../types/navigation';

export default function MapScreen({ navigation }: { navigation: RootNavigation }) {
  const tasks = useAppStore(s => s.tasks).filter(
    t => Number.isFinite(t.location.latitude) && Number.isFinite(t.location.longitude)
  );
  const theme = useAppTheme();
  const first = tasks[0];
  const center: [longitude: number, latitude: number] = first
    ? [first.location.longitude!, first.location.latitude!]
    : [13.405, 52.52];
  return (
    <View style={styles.container}>
      <OpenStreetMap style={StyleSheet.absoluteFill} mapStyle={OPEN_STREET_MAP_STYLE}>
        <Camera initialViewState={{ center, zoom: first ? 12 : 10 }} />
        {tasks.map(t => (
          <Marker
            key={t.id}
            id={t.id}
            lngLat={[t.location.longitude!, t.location.latitude!]}
            onPress={() => navigation.navigate('TaskDetail', { taskId: t.id })}
          >
            <View style={styles.marker}>
              <Text style={styles.markerText}>{t.title.slice(0, 1)}</Text>
            </View>
          </Marker>
        ))}
      </OpenStreetMap>
      {tasks.length === 0 && (
        <View style={[styles.banner, { backgroundColor: theme.surface }]}>
          <Text style={{ color: theme.text }}>
            No task locations selected yet. Create a task and choose a point on the map.
          </Text>
        </View>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1 },
  marker: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  markerText: { color: '#fff', fontWeight: '800' },
  banner: {
    position: 'absolute',
    top: 20,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    elevation: 3,
  },
});
