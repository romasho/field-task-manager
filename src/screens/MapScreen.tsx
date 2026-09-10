import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useAppStore } from '../store/useAppStore';

export default function MapScreen({ navigation }: any) {
  const tasks = useAppStore(s => s.tasks).filter(t => t.location.latitude && t.location.longitude);
  const first = tasks[0];
  const region = first ? { latitude: first.location.latitude!, longitude: first.location.longitude!, latitudeDelta: 0.08, longitudeDelta: 0.08 } : { latitude: 52.52, longitude: 13.405, latitudeDelta: 0.15, longitudeDelta: 0.15 };
  return (
    <View style={styles.container}>
      <MapView style={StyleSheet.absoluteFill} initialRegion={region}>
        {tasks.map(t => <Marker key={t.id} coordinate={{latitude:t.location.latitude!,longitude:t.location.longitude!}} title={t.title} description={t.location.address} onCalloutPress={()=>navigation.navigate('TaskDetail',{taskId:t.id})} />)}
      </MapView>
      {tasks.length === 0 && <View style={styles.banner}><Text>No coordinate data. Enter coordinates in a future enhancement or use the seeded demo task.</Text></View>}
    </View>
  );
}
const styles=StyleSheet.create({container:{flex:1},banner:{position:'absolute',top:20,left:16,right:16,backgroundColor:'#fff',padding:12,borderRadius:10,elevation:3}})
