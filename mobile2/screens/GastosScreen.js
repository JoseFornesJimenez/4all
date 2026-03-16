import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function GastosScreen() {
  return (
    <View style={s.container}>
      <Text style={s.txt}>Gastos — próximamente</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F7FF' },
  txt:       { color: '#9CA3AF', fontSize: 15 },
});
