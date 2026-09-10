import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { useAppStore } from '../store/useAppStore';
import { configureNotifications } from '../services/notifications';

export default function SettingsScreen() {
  const theme = useAppStore(s => s.theme);
  const setTheme = useAppStore(s => s.setTheme);
  const [demoMode, setDemoMode] = useState(true);
  return <Screen>
    <Text style={styles.title}>Settings</Text>
    <View style={styles.row}><Text style={styles.label}>Dark theme</Text><Switch value={theme==='dark'} onValueChange={v=>setTheme(v?'dark':'light')} /></View>
    <View style={styles.row}><Text style={styles.label}>Demo notification mode</Text><Switch value={demoMode} onValueChange={setDemoMode} /></View>
    <Pressable style={styles.button} onPress={()=>configureNotifications().then(()=>Alert.alert('Notifications','Permission is ready.')).catch(e=>Alert.alert('Notifications',e.message))}><Text style={styles.buttonText}>Check notification permission</Text></Pressable>
    <Text style={styles.section}>Candidate code</Text>
    <Text style={styles.code}>SA-RN-5837</Text>
    <Text style={styles.about}>Field Task Manager — offline-first task management demo.</Text>
    <Text style={styles.small}>Local changes are queued for synchronization. The mock server uses last-write-wins based on updatedAt.</Text>
  </Screen>
}
const styles=StyleSheet.create({title:{fontSize:28,fontWeight:'800',marginBottom:20},row:{backgroundColor:'#fff',padding:15,borderRadius:10,marginBottom:10,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},label:{fontSize:16,fontWeight:'600'},button:{backgroundColor:'#2563EB',padding:14,borderRadius:10,alignItems:'center',marginTop:10},buttonText:{color:'#fff',fontWeight:'800'},section:{fontWeight:'800',marginTop:30},code:{fontSize:24,fontWeight:'900',letterSpacing:2,marginTop:7},about:{marginTop:25,fontWeight:'700'},small:{marginTop:8,color:'#6B7280',lineHeight:20}})
