import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Task } from '../types';
import { colors } from '../theme/colors';

export default function TaskCard({ task, onPress }: { task: Task; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Open task ${task.title}`} onPress={onPress} style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.title} numberOfLines={1}>{task.title}</Text>
        <Text style={[styles.status, task.status === 'Completed' && { color: colors.success }, task.status === 'Cancelled' && { color: colors.danger }]}>{task.status}</Text>
      </View>
      <Text style={styles.meta}>{new Date(task.dueAt).toLocaleString()}</Text>
      <Text style={styles.location} numberOfLines={1}>📍 {task.location.address}</Text>
      <Text style={styles.sync}>{task.syncState}</Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, elevation: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontSize: 17, fontWeight: '700', color: '#111827' },
  status: { fontSize: 12, fontWeight: '700', color: colors.primary },
  meta: { marginTop: 8, color: '#4B5563' },
  location: { marginTop: 5, color: '#4B5563' },
  sync: { marginTop: 8, fontSize: 11, color: '#9CA3AF' }
});