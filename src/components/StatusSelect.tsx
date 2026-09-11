import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { TaskStatus } from '../types';
import { colors } from '../theme/colors';
import { useAppTheme } from '../theme/useAppTheme';

type SelectableTaskStatus = Exclude<TaskStatus, 'New'>;

const selectableStatuses: SelectableTaskStatus[] = ['In Progress', 'Completed', 'Cancelled'];

const statusColor = (status: TaskStatus) => {
  if (status === 'Completed') return colors.success;
  if (status === 'Cancelled') return colors.danger;
  if (status === 'In Progress') return colors.warning;
  return colors.primary;
};

type Props = {
  value: TaskStatus;
  onChange: (status: TaskStatus) => void | Promise<void>;
  options?: SelectableTaskStatus[];
  disabled?: boolean;
};

export function StatusSelect({
  value,
  onChange,
  options = selectableStatuses,
  disabled = false,
}: Props) {
  const theme = useAppTheme();
  const [open, setOpen] = useState(false);

  async function selectStatus(status: TaskStatus) {
    setOpen(false);
    if (status !== value) await onChange(status);
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Task status: ${value}. Change status`}
        accessibilityState={{ disabled, expanded: open }}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={[
          styles.trigger,
          { backgroundColor: theme.surface, borderColor: theme.border },
          disabled && styles.disabled,
        ]}
      >
        <View style={[styles.dot, { backgroundColor: statusColor(value) }]} />
        <Text style={[styles.value, { color: theme.text }]}>{value}</Text>
        <Text style={[styles.chevron, { color: theme.muted }]}>⌄</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            accessibilityViewIsModal
            style={[styles.menu, { backgroundColor: theme.surface }]}
            onPress={event => event.stopPropagation()}
          >
            <Text style={[styles.heading, { color: theme.text }]}>Change status</Text>
            {options.map(status => {
              const selected = status === value;
              return (
                <Pressable
                  key={status}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => selectStatus(status)}
                  style={[styles.option, selected && { backgroundColor: theme.subtle }]}
                >
                  <View style={[styles.dot, { backgroundColor: statusColor(status) }]} />
                  <Text style={[styles.optionText, { color: theme.text }]}>{status}</Text>
                  {selected && <Text style={{ color: colors.primary, fontWeight: '800' }}>✓</Text>}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 176,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dot: { width: 9, height: 9, borderRadius: 5, marginRight: 9 },
  value: { flex: 1, fontWeight: '700' },
  chevron: { fontSize: 20, lineHeight: 18, marginLeft: 10 },
  disabled: { opacity: 0.5 },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(15, 23, 42, 0.48)',
  },
  menu: { borderRadius: 16, padding: 16, elevation: 8 },
  heading: { fontSize: 17, fontWeight: '800', marginBottom: 8 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  optionText: { flex: 1, fontSize: 16, fontWeight: '600' },
});
