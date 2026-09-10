import React from 'react';
import { ScrollView, StyleSheet, View, useColorScheme } from 'react-native';
import { colors } from '../theme/colors';

export function Screen({ children, scroll = true }: { children: React.ReactNode; scroll?: boolean }) {
  const dark = useColorScheme() === 'dark';
  const content = <View style={[styles.container, { backgroundColor: dark ? colors.dark.background : colors.light.background }]}>{children}</View>;
  return scroll ? <ScrollView contentContainerStyle={styles.scroll}>{content}</ScrollView> : content;
}
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  scroll: { flexGrow: 1 }
});