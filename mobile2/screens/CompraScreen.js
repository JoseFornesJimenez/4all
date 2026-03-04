/**
 * CompraScreen.js — Lista de la compra compartida del piso
 *
 * Muestra todos los items de la lista del piso actual.
 * Los items son compartidos: cualquier miembro puede añadir, marcar o eliminar.
 *
 * Funcionalidades:
 *   - Ver lista de productos (con pull-to-refresh)
 *   - Añadir producto nuevo
 *   - Marcar como comprado / pendiente (toggle)
 *   - Eliminar producto
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import { api } from './api';

export default function CompraScreen() {
  const [items, setItems]         = useState([]);
  const [cargando, setCargando]   = useState(true);
  const [texto, setTexto]         = useState('');
  const [guardando, setGuardando] = useState(false);

  /**
   * Carga los items del backend.
   * useCallback evita que se recree la función en cada render,
   * necesario para usarla como dependencia de useEffect.
   */
  const cargar = useCallback(async () => {
    try {
      const data = await api('/compra');
      setItems(data.items);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setCargando(false);
    }
  }, []);

  // Carga inicial al montar el componente
  useEffect(() => { cargar(); }, [cargar]);

  /** Añade un nuevo producto a la lista */
  const añadir = async () => {
    if (!texto.trim()) return;
    try {
      setGuardando(true);
      const data = await api('/compra', { method: 'POST', body: JSON.stringify({ nombre: texto.trim() }) });
      // Añade el nuevo item al principio de la lista sin recargar todo
      setItems(prev => [data.item, ...prev]);
      setTexto('');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setGuardando(false);
    }
  };

  /** Cambia el estado completado/pendiente de un item */
  const toggle = async (id) => {
    try {
      const data = await api(`/compra/${id}/toggle`, { method: 'PATCH' });
      // Actualiza solo el item modificado en el estado local
      setItems(prev => prev.map(i => i.id === id ? data.item : i));
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  /** Elimina un item de la lista */
  const eliminar = async (id) => {
    try {
      await api(`/compra/${id}`, { method: 'DELETE' });
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  if (cargando) return <View style={s.center}><ActivityIndicator size="large" color="#4F46E5" /></View>;

  return (
    <View style={s.container}>
      {/* Barra para añadir nuevo producto */}
      <View style={s.inputRow}>
        <TextInput style={s.input} placeholder="Añadir producto..." placeholderTextColor="#9CA3AF"
          value={texto} onChangeText={setTexto} onSubmitEditing={añadir} returnKeyType="done" />
        <TouchableOpacity style={[s.addBtn, guardando && s.btnOff]} onPress={añadir} disabled={guardando}>
          {guardando ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.addBtnTxt}>+</Text>}
        </TouchableOpacity>
      </View>

      {/* Lista de productos con pull-to-refresh */}
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        onRefresh={cargar}
        refreshing={cargando}
        ListEmptyComponent={<Text style={s.empty}>Lista vacía</Text>}
        renderItem={({ item }) => (
          <View style={s.card}>
            {/* Botón de toggle: cambia entre completado y pendiente */}
            <TouchableOpacity style={s.check} onPress={() => toggle(item.id)}>
              <Text style={s.checkIcon}>{item.completado ? '✅' : '⬜'}</Text>
            </TouchableOpacity>
            {/* Nombre tachado si está completado */}
            <Text style={[s.nombre, item.completado && s.tachado]}>{item.nombre}</Text>
            <TouchableOpacity onPress={() => eliminar(item.id)}>
              <Text style={s.del}>🗑</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB', padding: 16 },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  inputRow:  { flexDirection: 'row', marginBottom: 16, gap: 8 },
  input:     { flex: 1, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111827', backgroundColor: '#fff' },
  addBtn:    { backgroundColor: '#4F46E5', borderRadius: 10, paddingHorizontal: 18, justifyContent: 'center' },
  btnOff:    { opacity: 0.6 },
  addBtnTxt: { color: '#fff', fontSize: 24, fontWeight: '700' },
  card:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, elevation: 1 },
  check:     { marginRight: 12 },
  checkIcon: { fontSize: 20 },
  nombre:    { flex: 1, fontSize: 15, color: '#111827' },
  tachado:   { textDecorationLine: 'line-through', color: '#9CA3AF' },
  del:       { fontSize: 18, marginLeft: 8 },
  empty:     { textAlign: 'center', color: '#9CA3AF', marginTop: 40, fontSize: 15 },
});
