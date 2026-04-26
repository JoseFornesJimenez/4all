/**
 * RegisterScreen.js — Pantalla de registro de nuevo usuario
 *
 * Props:
 *   - onLogin(user)  → llamado tras registro exitoso, igual que en LoginScreen
 *   - onGoLogin()    → navega de vuelta al login
 */

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Image,
} from 'react-native';
import { api, setToken } from './api';

export default function RegisterScreen({ onLogin, onGoLogin }) {
  const [nombre, setNombre]     = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);

  /**
   * Envía los datos de registro al backend.
   * Valida localmente antes de llamar a la API:
   *   - Todos los campos son obligatorios
   *   - La contraseña mínimo 6 caracteres
   * Si tiene éxito, guarda el token y navega como en el login.
   */
  const handleRegister = async () => {
    if (!nombre.trim() || !email.trim() || !password.trim()) {
      return Alert.alert('Error', 'Completa todos los campos');
    }
    if (password.length < 6) {
      return Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
    }
    try {
      setCargando(true);
      const data = await api('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ nombre: nombre.trim(), email: email.trim().toLowerCase(), password }),
      });
      setToken(data.token);
      onLogin(data.user);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.header}>
          <Image source={require('../Logo.png')} style={s.logo} resizeMode="contain" />
          <Text style={s.sub}>Crea tu cuenta</Text>
        </View>
        <View style={s.form}>
          <Text style={s.label}>Nombre</Text>
          <TextInput style={s.input} placeholder="Tu nombre" placeholderTextColor="#9CA3AF"
            value={nombre} onChangeText={setNombre} />
          <Text style={s.label}>Email</Text>
          <TextInput style={s.input} placeholder="tu@email.com" placeholderTextColor="#9CA3AF"
            value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <Text style={s.label}>Contraseña</Text>
          <TextInput style={s.input} placeholder="Mínimo 6 caracteres" placeholderTextColor="#9CA3AF"
            value={password} onChangeText={setPassword} secureTextEntry />
          <TouchableOpacity style={[s.btn, cargando && s.btnOff]} onPress={handleRegister} disabled={cargando}>
            {cargando ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>Crear cuenta</Text>}
          </TouchableOpacity>
        </View>
        <View style={s.footer}>
          <Text style={s.footerTxt}>¿Ya tienes cuenta?</Text>
          <TouchableOpacity onPress={onGoLogin}>
            <Text style={s.link}> Inicia sesión</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0FAFA' },
  scroll:    { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header:    { alignItems: 'center', marginBottom: 40 },
  logo:      { width: 140, height: 140 },
  sub:       { fontSize: 16, color: '#6B7280', marginTop: 12 },
  form:      { backgroundColor: '#fff', borderRadius: 16, padding: 24, elevation: 3 },
  label:     { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  input:     { borderWidth: 1, borderColor: '#C8F0F0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111827', backgroundColor: '#F9FAFB' },
  btn:       { backgroundColor: '#1BBCD4', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  btnOff:    { opacity: 0.6 },
  btnTxt:    { color: '#fff', fontSize: 16, fontWeight: '700' },
  footer:    { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerTxt: { color: '#6B7280', fontSize: 14 },
  link:      { color: '#1BBCD4', fontSize: 14, fontWeight: '600' },
});
