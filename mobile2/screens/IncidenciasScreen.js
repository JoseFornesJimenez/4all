import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function IncidenciasScreen() {
  return (
    <View style={s.container}>
      <Text style={s.txt}>Incidencias — próximamente</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F7FF' },
  txt:       { color: '#9CA3AF', fontSize: 15 },
});
