import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Task } from '../types';
import { colors } from '../theme/colors';
import { useAppTheme } from '../theme/useAppTheme';

export default function TaskCard({ task, onPress }: { task: Task; onPress: () => void }) {
  const theme = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open task ${task.title}`}
      onPress={onPress}
      style={[styles.card, { backgroundColor: theme.surface }]}
    >
      <View style={styles.row}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
          {task.title}
        </Text>
        <Text
          style={[
            styles.status,
            task.status === 'Completed' && { color: colors.success },
            task.status === 'Cancelled' && { color: colors.danger },
          ]}
        >
          {task.status}
        </Text>
      </View>
      <Text style={[styles.meta, { color: theme.muted }]}>
        {new Date(task.dueAt).toLocaleString()}
      </Text>
      <Text style={[styles.location, { color: theme.muted }]} numberOfLines={1}>
        📍 {task.location.address || 'No location'}
      </Text>
      <View
        style={[
          styles.sync,
          task.syncState === 'Synced'
            ? styles.syncSuccess
            : task.syncState === 'Sync Failed'
              ? styles.syncFailed
              : styles.syncPending,
        ]}
      >
        <Text
          style={[
            styles.syncText,
            task.syncState === 'Synced'
              ? styles.syncSuccessText
              : task.syncState === 'Sync Failed'
                ? styles.syncFailedText
                : styles.syncPendingText,
          ]}
        >
          {task.syncState}
        </Text>
      </View>
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
  sync: {
    alignSelf: 'flex-start',
    marginTop: 9,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  syncText: { fontSize: 11, fontWeight: '800' },
  syncSuccess: { backgroundColor: '#DCFCE7' },
  syncSuccessText: { color: '#166534' },
  syncPending: { backgroundColor: '#FEF3C7' },
  syncPendingText: { color: '#92400E' },
  syncFailed: { backgroundColor: '#FEE2E2' },
  syncFailedText: { color: '#B91C1C' },
});
