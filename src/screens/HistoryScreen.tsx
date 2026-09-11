import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { useAppStore } from '../store/useAppStore';
import { useAppTheme } from '../theme/useAppTheme';

export default function HistoryScreen() {
  const logs = useAppStore(s => s.logs);
  const theme = useAppTheme();
  return (
    <Screen>
      <Text style={[styles.title, { color: theme.text }]}>History</Text>
      {logs.length === 0 ? (
        <Text style={[styles.empty, { color: theme.muted }]}>No history yet.</Text>
      ) : (
        logs.map(log => (
          <View key={log.id} style={[styles.item, { backgroundColor: theme.surface }]}>
            <Text style={[styles.time, { color: theme.muted }]}>
              {new Date(log.timestamp).toLocaleString()}
            </Text>
            <Text style={styles.action}>{log.action}</Text>
            <Text style={{ color: theme.text }}>{log.description}</Text>
          </View>
        ))
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '800', marginBottom: 15 },
  item: { backgroundColor: '#fff', padding: 13, borderRadius: 10, marginBottom: 8 },
  time: { fontSize: 11, color: '#6B7280' },
  action: { fontWeight: '800', color: '#2563EB', marginTop: 3 },
  empty: { color: '#6B7280' },
});
