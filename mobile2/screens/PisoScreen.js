/**
 * PisoScreen.js — Pantalla de configuración de piso
 *
 * Se muestra cuando el usuario está logueado pero no tiene piso asignado.
 * Permite dos acciones mediante tabs:
 *   - Crear un piso nuevo (genera un código de invitación automáticamente)
 *   - Unirse a un piso existente mediante su código de 6 caracteres
 *
 * Props:
 *   - onPisoListo(piso) → llamado cuando el piso está listo, recibe el objeto piso
 */

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { api } from './api';

export default function PisoScreen({ onPisoListo }) {
  const [tab, setTab]           = useState('crear'); // 'crear' | 'unirse'
  const [nombre, setNombre]     = useState('');
  const [codigo, setCodigo]     = useState('');
  const [cargando, setCargando] = useState(false);

  /** Crea un piso nuevo con el nombre indicado */
  const crearPiso = async () => {
    if (!nombre.trim()) return Alert.alert('Error', 'Escribe un nombre');
    try {
      setCargando(true);
      const data = await api('/piso/crear', { method: 'POST', body: JSON.stringify({ nombre: nombre.trim() }) });
      onPisoListo(data.piso);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setCargando(false);
    }
  };

  /** Une al usuario al piso que corresponde al código introducido */
  const unirse = async () => {
    if (!codigo.trim()) return Alert.alert('Error', 'Escribe el código');
    try {
      setCargando(true);
      const data = await api('/piso/unirse', { method: 'POST', body: JSON.stringify({ codigo: codigo.trim().toUpperCase() }) });
      onPisoListo(data.piso);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.header}>
          <Text style={s.logo}>4all</Text>
          <Text style={s.sub}>Configura tu piso</Text>
        </View>
        {/* Selector de acción */}
        <View style={s.tabs}>
          <TouchableOpacity style={[s.tab, tab === 'crear' && s.tabActive]} onPress={() => setTab('crear')}>
            <Text style={[s.tabTxt, tab === 'crear' && s.tabTxtActive]}>Crear piso</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.tab, tab === 'unirse' && s.tabActive]} onPress={() => setTab('unirse')}>
            <Text style={[s.tabTxt, tab === 'unirse' && s.tabTxtActive]}>Unirse</Text>
          </TouchableOpacity>
        </View>
        {tab === 'crear' ? (
          <View style={s.form}>
            <Text style={s.label}>Nombre del piso</Text>
            <TextInput style={s.input} placeholder="Ej: Piso Gracia" placeholderTextColor="#9CA3AF"
              value={nombre} onChangeText={setNombre} />
            <TouchableOpacity style={[s.btn, cargando && s.btnOff]} onPress={crearPiso} disabled={cargando}>
              {cargando ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>Crear piso</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.form}>
            <Text style={s.label}>Código de invitación</Text>
            {/* autoCapitalize="characters" facilita introducir el código en mayúsculas */}
            <TextInput style={s.input} placeholder="XXXXXX" placeholderTextColor="#9CA3AF"
              value={codigo} onChangeText={setCodigo} autoCapitalize="characters" />
            <TouchableOpacity style={[s.btn, cargando && s.btnOff]} onPress={unirse} disabled={cargando}>
              {cargando ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>Unirse al piso</Text>}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#F9FAFB' },
  scroll:       { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header:       { alignItems: 'center', marginBottom: 32 },
  logo:         { fontSize: 56, fontWeight: '900', color: '#4F46E5', letterSpacing: -2 },
  sub:          { fontSize: 16, color: '#6B7280', marginTop: 8 },
  tabs:         { flexDirection: 'row', backgroundColor: '#E5E7EB', borderRadius: 12, padding: 4, marginBottom: 20 },
  tab:          { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabActive:    { backgroundColor: '#fff', elevation: 2 },
  tabTxt:       { color: '#6B7280', fontWeight: '600' },
  tabTxtActive: { color: '#4F46E5' },
  form:         { backgroundColor: '#fff', borderRadius: 16, padding: 24, elevation: 3 },
  label:        { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input:        { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111827', backgroundColor: '#F9FAFB' },
  btn:          { backgroundColor: '#4F46E5', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  btnOff:       { opacity: 0.6 },
  btnTxt:       { color: '#fff', fontSize: 16, fontWeight: '700' },
});
