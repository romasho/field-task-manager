import React from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { useAppStore } from '../store/useAppStore';
import { useAppTheme } from '../theme/useAppTheme';
import { DEMO_DELAY_SECONDS } from '../utils/reminderSchedule';

export default function SettingsScreen() {
  const theme = useAppStore(s => s.theme);
  const setTheme = useAppStore(s => s.setTheme);
  const demoNotifications = useAppStore(s => s.demoNotifications);
  const setDemoNotifications = useAppStore(s => s.setDemoNotifications);
  const palette = useAppTheme();
  return (
    <Screen>
      <Text style={[styles.title, { color: palette.text }]}>Settings</Text>
      <View style={[styles.row, { backgroundColor: palette.surface }]}>
        <Text style={[styles.label, { color: palette.text }]}>Dark theme</Text>
        <Switch
          value={theme === 'dark'}
          onValueChange={value =>
            setTheme(value ? 'dark' : 'light').catch(error =>
              Alert.alert(
                'Unable to save theme',
                error instanceof Error ? error.message : 'Please try again.'
              )
            )
          }
          trackColor={{ false: palette.border, true: '#93C5FD' }}
        />
      </View>
      <View style={[styles.row, { backgroundColor: palette.surface }]}>
        <Text style={[styles.label, { color: palette.text }]}>Demo notification mode</Text>
        <Switch
          value={demoNotifications}
          onValueChange={setDemoNotifications}
          trackColor={{ false: palette.border, true: '#93C5FD' }}
        />
      </View>
      <Text style={[styles.hint, { color: palette.muted }]}>
        When enabled, saving a task schedules its reminder after {DEMO_DELAY_SECONDS} seconds.
      </Text>
      <Text style={[styles.section, { color: palette.text }]}>Candidate code</Text>
      <Text style={[styles.code, { color: palette.text }]}>SA-RN-5837</Text>
      <Text style={[styles.about, { color: palette.text }]}>
        Field Task Manager — offline-first task management demo.
      </Text>
      <Text style={[styles.small, { color: palette.muted }]}>
        Local changes are queued for synchronization. The mock server uses last-write-wins based on
        updatedAt.
      </Text>
    </Screen>
  );
}
const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '800', marginBottom: 20 },
  row: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: { fontSize: 16, fontWeight: '600' },
  hint: { fontSize: 13, lineHeight: 18, marginTop: -3, marginBottom: 10 },
  section: { fontWeight: '800', marginTop: 30 },
  code: { fontSize: 24, fontWeight: '900', letterSpacing: 2, marginTop: 7 },
  about: { marginTop: 25, fontWeight: '700' },
  small: { marginTop: 8, color: '#6B7280', lineHeight: 20 },
});
