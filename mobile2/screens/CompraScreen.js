/**
 * CompraScreen.js — Lista de la compra compartida del piso
 *
 * Funcionalidades:
 *   - Ver lista de productos (con pull-to-refresh)
 *   - Añadir producto nuevo
 *   - Marcar como comprado / pendiente (toggle)
 *   - Eliminar producto con swipe o botón
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  ActivityIndicator, Alert, StatusBar, Platform,
} from 'react-native';
import { api } from './api';

export default function CompraScreen() {
  const [items, setItems]         = useState([]);
  const [cargando, setCargando]   = useState(true);
  const [texto, setTexto]         = useState('');
  const [guardando, setGuardando] = useState(false);

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

  useEffect(() => { cargar(); }, [cargar]);

  const añadir = async () => {
    if (!texto.trim()) return;
    try {
      setGuardando(true);
      const data = await api('/compra', { method: 'POST', body: JSON.stringify({ nombre: texto.trim() }) });
      setItems(prev => [data.item, ...prev]);
      setTexto('');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setGuardando(false);
    }
  };

  const toggle = async (id) => {
    try {
      const data = await api(`/compra/${id}/toggle`, { method: 'PATCH' });
      setItems(prev => prev.map(i => i.id === id ? data.item : i));
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const eliminar = async (id, nombre) => {
    Alert.alert('Eliminar', `¿Quitar "${nombre}" de la lista?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive', onPress: async () => {
          try {
            await api(`/compra/${id}`, { method: 'DELETE' });
            setItems(prev => prev.filter(i => i.id !== id));
          } catch (e) {
            Alert.alert('Error', e.message);
          }
        }
      }
    ]);
  };

  const pendientes = items.filter(i => !i.completado).length;
  const completados = items.filter(i => i.completado).length;

  if (cargando) return (
    <View style={s.center}>
      <ActivityIndicator size="large" color="#6366F1" />
      <Text style={s.loadingTxt}>Cargando lista...</Text>
    </View>
  );

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F7FF" />

      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Lista de la compra</Text>
        <View style={s.badges}>
          {pendientes > 0 && (
            <View style={s.badge}>
              <Text style={s.badgeTxt}>{pendientes} pendiente{pendientes !== 1 ? 's' : ''}</Text>
            </View>
          )}
          {completados > 0 && (
            <View style={[s.badge, s.badgeDone]}>
              <Text style={[s.badgeTxt, s.badgeDoneTxt]}>{completados} comprado{completados !== 1 ? 's' : ''}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Input añadir */}
      <View style={s.inputRow}>
        <TextInput
          style={s.input}
          placeholder="¿Qué necesitas comprar?"
          placeholderTextColor="#A5B4FC"
          value={texto}
          onChangeText={setTexto}
          onSubmitEditing={añadir}
          returnKeyType="done"
        />
        <TouchableOpacity style={[s.addBtn, (!texto.trim() || guardando) && s.btnOff]} onPress={añadir} disabled={guardando || !texto.trim()}>
          {guardando
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={s.addBtnTxt}>+</Text>
          }
        </TouchableOpacity>
      </View>

      {/* Lista */}
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        onRefresh={cargar}
        refreshing={cargando}
        contentContainerStyle={items.length === 0 && s.emptyContainer}
        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <Text style={s.emptyTitle}>La lista está vacía</Text>
            <Text style={s.emptySubtitle}>Añade productos usando el campo de arriba</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[s.card, item.completado && s.cardDone]}
            onPress={() => toggle(item.id)}
            onLongPress={() => eliminar(item.id, item.nombre)}
            activeOpacity={0.7}
          >
            {/* Checkbox */}
            <View style={[s.checkbox, item.completado && s.checkboxDone]}>
              {item.completado && <Text style={s.checkmark}>✓</Text>}
            </View>

            {/* Nombre */}
            <Text style={[s.nombre, item.completado && s.tachado]} numberOfLines={2}>
              {item.nombre}
            </Text>

            {/* Botón eliminar */}
            <TouchableOpacity style={s.delBtn} onPress={() => eliminar(item.id, item.nombre)}>
              <Text style={s.delIcon}>×</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      />
    </View>
  );
}

const PURPLE = '#6366F1';
const PURPLE_LIGHT = '#EEF2FF';
const GREEN = '#10B981';
const GREEN_LIGHT = '#ECFDF5';

const s = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#F8F7FF', paddingTop: Platform.OS === 'android' ? 8 : 0 },
  center:        { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingTxt:    { color: '#6366F1', fontSize: 14 },

  // Header
  header:        { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
  headerTitle:   { fontSize: 26, fontWeight: '800', color: '#1E1B4B', letterSpacing: -0.5 },
  badges:        { flexDirection: 'row', gap: 8, marginTop: 6 },
  badge:         { backgroundColor: PURPLE_LIGHT, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeTxt:      { color: PURPLE, fontSize: 12, fontWeight: '600' },
  badgeDone:     { backgroundColor: GREEN_LIGHT },
  badgeDoneTxt:  { color: GREEN },

  // Input
  inputRow:      { flexDirection: 'row', marginHorizontal: 20, marginBottom: 16, gap: 10 },
  input:         {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1E1B4B',
    shadowColor: '#6366F1',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  addBtn:        {
    backgroundColor: PURPLE,
    borderRadius: 14,
    width: 52,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: PURPLE,
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  btnOff:        { opacity: 0.4 },
  addBtnTxt:     { color: '#fff', fontSize: 28, fontWeight: '300', lineHeight: 32 },

  // Cards
  card:          {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 14,
    paddingLeft: 16,
    paddingRight: 12,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
  },
  cardDone:      { backgroundColor: '#FAFAFA', opacity: 0.75 },

  // Checkbox
  checkbox:      {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#C7D2FE',
    marginRight: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxDone:  { backgroundColor: GREEN, borderColor: GREEN },
  checkmark:     { color: '#fff', fontSize: 14, fontWeight: '700' },

  nombre:        { flex: 1, fontSize: 16, color: '#1E1B4B', fontWeight: '500' },
  tachado:       { textDecorationLine: 'line-through', color: '#9CA3AF', fontWeight: '400' },

  delBtn:        {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  delIcon:       { color: '#EF4444', fontSize: 20, fontWeight: '400', lineHeight: 22 },

  // Empty state
  emptyContainer: { flex: 1 },
  emptyWrap:     { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyTitle:    { fontSize: 18, fontWeight: '600', color: '#6B7280', marginBottom: 6 },
  emptySubtitle: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', paddingHorizontal: 40 },
});
