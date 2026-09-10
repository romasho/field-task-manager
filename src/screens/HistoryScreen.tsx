import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { useAppStore } from '../store/useAppStore';

export default function HistoryScreen() {
  const logs = useAppStore(s => s.logs);
  return <Screen>
    <Text style={styles.title}>History</Text>
    {logs.length === 0 ? <Text style={styles.empty}>No history yet.</Text> : logs.map(log => <View key={log.id} style={styles.item}>
      <Text style={styles.time}>{new Date(log.timestamp).toLocaleString()}</Text>
      <Text style={styles.action}>{log.action}</Text>
      <Text>{log.description}</Text>
    </View>)}
  </Screen>;
}
const styles=StyleSheet.create({title:{fontSize:28,fontWeight:'800',marginBottom:15},item:{backgroundColor:'#fff',padding:13,borderRadius:10,marginBottom:8},time:{fontSize:11,color:'#6B7280'},action:{fontWeight:'800',color:'#2563EB',marginTop:3},empty:{color:'#6B7280'}})
