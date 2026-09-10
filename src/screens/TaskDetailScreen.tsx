import React from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Screen } from '../components/Screen';
import { useAppStore } from '../store/useAppStore';
import { scheduleDemoReminder } from '../services/notifications';

export default function TaskDetailScreen({ navigation, route }: any) {
  const task = useAppStore(s => s.tasks.find(t => t.id === route.params.taskId));
  const updateStatus = useAppStore(s => s.updateStatus);
  const addAttachment = useAppStore(s => s.addAttachment);
  const removeAttachment = useAppStore(s => s.removeAttachment);
  const deleteTask = useAppStore(s => s.deleteTask);
  if (!task) return <Screen><Text>Task not found.</Text></Screen>;

  async function addImage() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled) return;
    const asset = result.assets[0];
    await addAttachment(task.id, { id: `${Date.now()}`, uri: asset.uri, name: asset.fileName || `image-${Date.now()}.jpg`, mimeType: asset.mimeType, size: asset.fileSize, createdAt: new Date().toISOString() });
  }

  function remove() {
    Alert.alert('Delete task?', 'This cannot be undone.', [
      {text:'Cancel',style:'cancel'},
      {text:'Delete',style:'destructive',onPress:async()=>{await deleteTask(task.id);navigation.goBack();}}
    ]);
  }

  return (
    <Screen>
      <Text style={styles.title}>{task.title}</Text>
      <Text style={styles.status}>{task.status}</Text>
      <Text style={styles.section}>Description</Text><Text style={styles.body}>{task.description}</Text>
      <Text style={styles.section}>Due</Text><Text style={styles.body}>{new Date(task.dueAt).toLocaleString()}</Text>
      <Text style={styles.section}>Location</Text><Text style={styles.body}>📍 {task.location.address}</Text>
      <View style={styles.actions}>
        {(['In Progress','Completed','Cancelled'] as const).map(s => <Pressable key={s} style={styles.action} onPress={()=>updateStatus(task.id,s)}><Text style={styles.actionText}>{s}</Text></Pressable>)}
      </View>
      <View style={styles.row}><Pressable style={styles.primary} onPress={()=>navigation.navigate('TaskForm',{taskId:task.id})}><Text style={styles.primaryText}>Edit</Text></Pressable><Pressable style={styles.secondary} onPress={addImage}><Text>Add image</Text></Pressable><Pressable style={styles.secondary} onPress={()=>scheduleDemoReminder(task.id,task.title).catch(e=>Alert.alert('Notification',e.message))}><Text>Demo alert</Text></Pressable></View>
      <Text style={styles.section}>Attachments</Text>
      {task.attachments.length === 0 ? <Text style={styles.muted}>No attachments.</Text> : task.attachments.map(a => <View key={a.id} style={styles.attachment}>{a.uri ? <Image source={{uri:a.uri}} style={styles.image} /> : null}<View style={{flex:1}}><Text numberOfLines={1}>{a.name}</Text><Pressable onPress={()=>removeAttachment(task.id,a.id)}><Text style={styles.deleteText}>Remove</Text></Pressable></View></View>)}
      <Text style={styles.section}>History</Text>
      {task.history.map(h => <View key={h.id} style={styles.history}><Text style={styles.historyTime}>{new Date(h.timestamp).toLocaleString()}</Text><Text>{h.description}</Text></View>)}
      <Pressable style={styles.delete} onPress={remove}><Text style={styles.deleteText}>Delete task</Text></Pressable>
    </Screen>
  );
}
const styles=StyleSheet.create({title:{fontSize:26,fontWeight:'800',color:'#111827'},status:{marginTop:5,color:'#2563EB',fontWeight:'700'},section:{fontSize:15,fontWeight:'800',marginTop:20,marginBottom:6,color:'#374151'},body:{fontSize:15,color:'#374151',lineHeight:22},actions:{flexDirection:'row',gap:6,flexWrap:'wrap',marginTop:15},action:{backgroundColor:'#E5E7EB',padding:9,borderRadius:9},actionText:{fontSize:12,fontWeight:'700'},row:{flexDirection:'row',gap:7,flexWrap:'wrap',marginTop:15},primary:{backgroundColor:'#2563EB',padding:11,borderRadius:9},primaryText:{color:'#fff',fontWeight:'700'},secondary:{backgroundColor:'#fff',borderWidth:1,borderColor:'#D1D5DB',padding:11,borderRadius:9},attachment:{flexDirection:'row',alignItems:'center',gap:10,backgroundColor:'#fff',padding:10,borderRadius:10,marginBottom:8},image:{width:60,height:60,borderRadius:8},deleteText:{color:'#DC2626',fontWeight:'700',marginTop:5},history:{backgroundColor:'#fff',padding:10,borderRadius:9,marginBottom:7},historyTime:{fontSize:11,color:'#6B7280',marginBottom:3},muted:{color:'#6B7280'},delete:{alignItems:'center',padding:15,marginTop:20,marginBottom:30}})
