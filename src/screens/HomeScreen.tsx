import React, { useMemo } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { Screen } from '../components/Screen';
import TaskCard from '../components/TaskCard';

export default function HomeScreen({ navigation }: any) {
  const tasks = useAppStore(s => s.tasks);
  const sortMode = useAppStore(s => s.sortMode);
  const setSortMode = useAppStore(s => s.setSortMode);
  const sync = useAppStore(s => s.sync);
  const sorted = useMemo(() => [...tasks].sort((a,b) => {
    if (sortMode === 'dateAdded') return b.createdAt.localeCompare(a.createdAt);
    if (sortMode === 'status') return a.status.localeCompare(b.status);
    return a.dueAt.localeCompare(b.dueAt);
  }), [tasks, sortMode]);

  return (
    <Screen>
      <View style={styles.header}>
        <View><Text style={styles.heading}>Field tasks</Text><Text style={styles.sub}>{tasks.length} task(s)</Text></View>
        <Pressable style={styles.add} onPress={() => navigation.navigate('TaskForm')}><Text style={styles.addText}>+ New</Text></Pressable>
      </View>
      <View style={styles.toolbar}>
        {(['dueDate','dateAdded','status'] as const).map(mode => (
          <Pressable key={mode} onPress={() => setSortMode(mode)} style={[styles.chip, sortMode === mode && styles.chipActive]}>
            <Text style={sortMode === mode ? styles.chipTextActive : styles.chipText}>{mode === 'dueDate' ? 'Due date' : mode === 'dateAdded' ? 'Added' : 'Status'}</Text>
          </Pressable>
        ))}
        <Pressable onPress={() => sync().catch(() => Alert.alert('Sync failed', 'Check the mock server/network.'))}><Text style={styles.syncBtn}>Sync</Text></Pressable>
      </View>
      {sorted.length === 0 ? (
        <View style={styles.empty}><Text style={styles.emptyTitle}>No tasks yet</Text><Text style={styles.emptyText}>Create a task to start your field-work list.</Text></View>
      ) : sorted.map(task => <TaskCard key={task.id} task={task} onPress={() => navigation.navigate('TaskDetail', { taskId: task.id })} />)}
    </Screen>
  );
}
const styles = StyleSheet.create({
  header: { flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom: 16 },
  heading: { fontSize: 28, fontWeight:'800', color:'#111827' }, sub:{ color:'#6B7280', marginTop:3 },
  add:{ backgroundColor:'#2563EB', paddingHorizontal:16, paddingVertical:11, borderRadius:12 }, addText:{color:'#fff',fontWeight:'800'},
  toolbar:{flexDirection:'row',alignItems:'center',gap:7,marginBottom:16,flexWrap:'wrap'}, chip:{paddingHorizontal:10,paddingVertical:7,borderRadius:16,backgroundColor:'#E5E7EB'},chipActive:{backgroundColor:'#2563EB'},chipText:{fontSize:12,color:'#374151'},chipTextActive:{fontSize:12,color:'#fff',fontWeight:'700'},syncBtn:{color:'#2563EB',fontWeight:'700',padding:8},
  empty:{flex:1,justifyContent:'center',alignItems:'center',padding:30},emptyTitle:{fontSize:20,fontWeight:'800',color:'#111827'},emptyText:{marginTop:8,color:'#6B7280',textAlign:'center'}
});