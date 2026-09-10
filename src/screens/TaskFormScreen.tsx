import React, { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Screen } from '../components/Screen';
import { useAppStore } from '../store/useAppStore';
import { TaskStatus } from '../types';

export default function TaskFormScreen({ navigation, route }: any) {
  const existingId = route.params?.taskId;
  const existing = useAppStore(s => s.tasks.find(t => t.id === existingId));
  const createTask = useAppStore(s => s.createTask);
  const updateTask = useAppStore(s => s.updateTask);
  const [title, setTitle] = useState(existing?.title || '');
  const [description, setDescription] = useState(existing?.description || '');
  const [address, setAddress] = useState(existing?.location.address || '');
  const [dueAt, setDueAt] = useState(existing ? new Date(existing.dueAt) : new Date(Date.now() + 60 * 60 * 1000));
  const [status, setStatus] = useState<TaskStatus>(existing?.status || 'New');
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);
  const editing = Boolean(existing);
  const valid = useMemo(() => title.trim() && description.trim() && address.trim() && dueAt.getTime() > Date.now(), [title, description, address, dueAt]);

  async function save() {
    if (!title.trim()) return Alert.alert('Validation', 'Task title is required.');
    if (!description.trim()) return Alert.alert('Validation', 'Task description is required.');
    if (!address.trim()) return Alert.alert('Validation', 'Location address is required.');
    if (dueAt.getTime() <= Date.now()) return Alert.alert('Validation', 'Due date/time must be in the future.');
    try {
      if (editing) {
        await updateTask(existing!.id, { title: title.trim(), description: description.trim(), dueAt: dueAt.toISOString(), location: { ...existing!.location, address: address.trim() }, status });
      } else {
        await createTask({ title: title.trim(), description: description.trim(), dueAt: dueAt.toISOString(), location: { address: address.trim() }, status, attachments: [] });
      }
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Save failed', e?.message || 'Please try again.');
    }
  }

  return (
    <Screen>
      <Text style={styles.label}>Title *</Text><TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. Inspect equipment" />
      <Text style={styles.label}>Description *</Text><TextInput style={[styles.input, styles.multiline]} value={description} onChangeText={setDescription} multiline placeholder="What needs to be done?" />
      <Text style={styles.label}>Location *</Text><TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="Manual address" />
      <Text style={styles.label}>Due date/time *</Text>
      <View style={styles.dateRow}>
        <Pressable style={styles.secondary} onPress={() => setShowDate(true)}><Text>{dueAt.toLocaleDateString()}</Text></Pressable>
        <Pressable style={styles.secondary} onPress={() => setShowTime(true)}><Text>{dueAt.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</Text></Pressable>
      </View>
      {showDate && <DateTimePicker value={dueAt} mode="date" onChange={(_, d) => { setShowDate(false); if(d) setDueAt(new Date(dueAt.getFullYear(),d.getMonth(),d.getDate(),dueAt.getHours(),dueAt.getMinutes())); }} />}
      {showTime && <DateTimePicker value={dueAt} mode="time" onChange={(_, d) => { setShowTime(false); if(d) setDueAt(new Date(dueAt.getFullYear(),dueAt.getMonth(),dueAt.getDate(),d.getHours(),d.getMinutes())); }} />}
      {editing && <>
        <Text style={styles.label}>Status</Text>
        <View style={styles.statusRow}>{(['New','In Progress','Completed','Cancelled'] as TaskStatus[]).map(s => <Pressable key={s} onPress={() => setStatus(s)} style={[styles.status, status===s && styles.statusActive]}><Text style={status===s?styles.statusTextActive:styles.statusText}>{s}</Text></Pressable>)}</View>
      </>}
      <Pressable disabled={!valid} style={[styles.save, !valid && {opacity:.5}]} onPress={save}><Text style={styles.saveText}>{editing ? 'Save changes' : 'Create task'}</Text></Pressable>
    </Screen>
  );
}
const styles=StyleSheet.create({
  label:{fontWeight:'700',color:'#374151',marginBottom:6,marginTop:10},input:{backgroundColor:'#fff',borderWidth:1,borderColor:'#D1D5DB',borderRadius:10,padding:12,fontSize:16},multiline:{minHeight:110,textAlignVertical:'top'},dateRow:{flexDirection:'row',gap:10},secondary:{backgroundColor:'#fff',borderWidth:1,borderColor:'#D1D5DB',borderRadius:10,padding:13,flex:1},statusRow:{flexDirection:'row',gap:6,flexWrap:'wrap'},status:{paddingHorizontal:10,paddingVertical:9,borderRadius:9,backgroundColor:'#E5E7EB'},statusActive:{backgroundColor:'#2563EB'},statusText:{fontSize:12,color:'#374151'},statusTextActive:{fontSize:12,color:'#fff',fontWeight:'700'},save:{backgroundColor:'#2563EB',padding:15,borderRadius:12,alignItems:'center',marginTop:24},saveText:{color:'#fff',fontWeight:'800',fontSize:16}
});