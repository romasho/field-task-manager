import React, { useMemo } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { Screen } from '../components/Screen';
import TaskCard from '../components/TaskCard';
import { useAppTheme } from '../theme/useAppTheme';
import { RootNavigation } from '../types/navigation';

export default function HomeScreen({ navigation }: { navigation: RootNavigation }) {
  const tasks = useAppStore(s => s.tasks);
  const sortMode = useAppStore(s => s.sortMode);
  const setSortMode = useAppStore(s => s.setSortMode);
  const sortDirection = useAppStore(s => s.sortDirection);
  const setSortDirection = useAppStore(s => s.setSortDirection);
  const sync = useAppStore(s => s.sync);
  const syncStatus = useAppStore(s => s.syncStatus);
  const syncMessage = useAppStore(s => s.syncMessage);
  const theme = useAppTheme();
  const sorted = useMemo(
    () =>
      [...tasks].sort((a, b) => {
        const result =
          sortMode === 'dateAdded'
            ? a.createdAt.localeCompare(b.createdAt)
            : sortMode === 'status'
              ? a.status.localeCompare(b.status)
              : a.dueAt.localeCompare(b.dueAt);
        return sortDirection === 'asc' ? result : -result;
      }),
    [tasks, sortDirection, sortMode]
  );

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={[styles.heading, { color: theme.text }]} numberOfLines={1}>
            Field tasks
          </Text>
          <Text style={[styles.sub, { color: theme.muted }]}>{tasks.length} task(s)</Text>
        </View>
        <Pressable style={styles.add} onPress={() => navigation.navigate('TaskForm')}>
          <Text style={styles.addText}>+ New</Text>
        </Pressable>
      </View>
      <View style={styles.toolbar}>
        {(['dueDate', 'dateAdded', 'status'] as const).map(mode => (
          <Pressable
            key={mode}
            accessibilityRole="button"
            accessibilityLabel={`${mode === 'dueDate' ? 'Due date' : mode === 'dateAdded' ? 'Added date' : 'Status'}: ${sortDirection === 'asc' ? 'ascending' : 'descending'}`}
            accessibilityHint={
              sortMode === mode ? 'Changes the sorting direction' : 'Sorts tasks by this value'
            }
            onPress={() => {
              if (sortMode === mode) {
                setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
              } else {
                setSortMode(mode);
              }
            }}
            style={[
              styles.chip,
              { backgroundColor: theme.subtle },
              sortMode === mode && styles.chipActive,
            ]}
          >
            <Text
              style={[
                sortMode === mode ? styles.chipTextActive : styles.chipText,
                sortMode !== mode && { color: theme.text },
              ]}
            >
              {mode === 'dueDate' ? 'Due date' : mode === 'dateAdded' ? 'Added' : 'Status'}
            </Text>
            {sortMode === mode && (
              <Text style={[styles.sortIcon, styles.chipTextActive]}>
                {sortDirection === 'asc' ? '↑' : '↓'}
              </Text>
            )}
          </Pressable>
        ))}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Synchronize tasks"
          disabled={syncStatus === 'syncing'}
          onPress={() =>
            sync().catch(error =>
              Alert.alert(
                'Sync failed',
                error?.message || 'Check the mock server connection and try again.'
              )
            )
          }
        >
          <Text style={[styles.syncBtn, syncStatus === 'syncing' && styles.syncBtnDisabled]}>
            {syncStatus === 'syncing' ? 'Syncing…' : 'Sync'}
          </Text>
        </Pressable>
      </View>
      {syncMessage && (
        <View
          accessibilityLiveRegion="polite"
          style={[
            styles.syncNotice,
            syncStatus === 'success'
              ? styles.syncNoticeSuccess
              : syncStatus === 'failed'
                ? styles.syncNoticeFailed
                : styles.syncNoticeNeutral,
          ]}
        >
          <Text
            style={[
              styles.syncNoticeText,
              syncStatus === 'success'
                ? styles.syncNoticeSuccessText
                : syncStatus === 'failed'
                  ? styles.syncNoticeFailedText
                  : styles.syncNoticeNeutralText,
            ]}
          >
            {syncMessage}
          </Text>
        </View>
      )}
      {sorted.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No tasks yet</Text>
          <Text style={[styles.emptyText, { color: theme.muted }]}>
            Create a task to start your field-work list.
          </Text>
        </View>
      ) : (
        sorted.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })}
          />
        ))
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  headerCopy: { flex: 1, minWidth: 0 },
  heading: { fontSize: 28, fontWeight: '800', color: '#111827' },
  sub: { color: '#6B7280', marginTop: 3 },
  add: { backgroundColor: '#2563EB', paddingHorizontal: 16, paddingVertical: 11, borderRadius: 12 },
  addText: { color: '#fff', fontWeight: '800' },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
  },
  chipActive: { backgroundColor: '#2563EB' },
  chipText: { fontSize: 12, color: '#374151' },
  chipTextActive: { fontSize: 12, color: '#fff', fontWeight: '700' },
  sortIcon: { fontSize: 14, fontWeight: '800' },
  syncBtn: { color: '#2563EB', fontWeight: '700', padding: 8 },
  syncBtnDisabled: { color: '#9CA3AF' },
  syncNotice: { borderRadius: 10, padding: 11, marginBottom: 14 },
  syncNoticeText: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  syncNoticeSuccess: { backgroundColor: '#DCFCE7' },
  syncNoticeSuccessText: { color: '#166534' },
  syncNoticeFailed: { backgroundColor: '#FEE2E2' },
  syncNoticeFailedText: { color: '#B91C1C' },
  syncNoticeNeutral: { backgroundColor: '#E0F2FE' },
  syncNoticeNeutralText: { color: '#075985' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  emptyText: { marginTop: 8, color: '#6B7280', textAlign: 'center' },
});
