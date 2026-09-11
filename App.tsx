import React, { useEffect } from 'react';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { Text } from 'react-native';
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

const Stack = createNativeStackNavigator();
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
  const sync = useAppStore(s => s.sync);
  const theme = useAppStore(s => s.theme);
  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    return NetInfo.addEventListener(state => {
      if (initialized && state.isConnected && state.isInternetReachable !== false) {
        sync().catch(() => {});
      }
    });
  }, [initialized, sync]);

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
