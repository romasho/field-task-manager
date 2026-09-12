import React, { useEffect } from 'react';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAppStore } from './src/store/useAppStore';
import { colors } from './src/theme/colors';
import HomeScreen from './src/screens/HomeScreen';
import TaskFormScreen from './src/screens/TaskFormScreen';
import TaskDetailScreen from './src/screens/TaskDetailScreen';
import MapScreen from './src/screens/MapScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { RootStackParamList } from './src/types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator();

function TabsNavigator() {
  const dark = useAppStore(s => s.theme === 'dark');
  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: dark ? colors.dark.surface : colors.light.surface,
          borderTopColor: dark ? colors.dark.border : colors.light.border,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: dark ? colors.dark.muted : colors.light.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="Tasks"
        component={HomeScreen}
        options={{
          title: 'Tasks',
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <Text style={{ color, fontSize: focused ? 24 : 22, fontWeight: '700' }}>☑</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="Map"
        component={MapScreen}
        options={{
          title: 'Map',
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <Text style={{ color, fontSize: focused ? 24 : 22, fontWeight: '700' }}>⌖</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="History"
        component={HistoryScreen}
        options={{
          title: 'History',
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <Text style={{ color, fontSize: focused ? 24 : 22, fontWeight: '700' }}>◷</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
            <Text style={{ color, fontSize: focused ? 24 : 22, fontWeight: '700' }}>⚙</Text>
          ),
        }}
      />
    </Tabs.Navigator>
  );
}

export default function App() {
  const initialize = useAppStore(s => s.initialize);
  const initialized = useAppStore(s => s.initialized);
  const initializationError = useAppStore(s => s.initializationError);
  const sync = useAppStore(s => s.sync);
  const theme = useAppStore(s => s.theme);
  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    return NetInfo.addEventListener(state => {
      if (initialized && state.isConnected && state.isInternetReachable !== false) {
        sync().catch(() => {});
      }
    });
  }, [initialized, sync]);

  if (!initialized) {
    return (
      <View style={styles.startupState}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.startupText}>Loading local tasks…</Text>
      </View>
    );
  }

  if (initializationError) {
    return (
      <View style={styles.startupState}>
        <Text style={styles.startupTitle}>Unable to load local data</Text>
        <Text style={styles.startupText}>{initializationError}</Text>
        <Pressable style={styles.retryButton} onPress={() => void initialize()}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <NavigationContainer theme={theme === 'dark' ? DarkTheme : DefaultTheme}>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <Stack.Navigator>
        <Stack.Screen name="Root" component={TabsNavigator} options={{ headerShown: false }} />
        <Stack.Screen name="TaskForm" component={TaskFormScreen} options={{ title: 'Task' }} />
        <Stack.Screen
          name="TaskDetail"
          component={TaskDetailScreen}
          options={{ title: 'Task details' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  startupState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.light.background,
  },
  startupTitle: { fontSize: 20, fontWeight: '800', color: colors.light.text },
  startupText: { marginTop: 10, color: colors.light.muted, textAlign: 'center' },
  retryButton: {
    marginTop: 18,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: colors.primary,
  },
  retryText: { color: '#fff', fontWeight: '800' },
});
