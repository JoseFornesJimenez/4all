/**
 * LoginScreen.js — Pantalla de inicio de sesión
 *
 * Props:
 *   - onLogin(user)   → llamado tras login exitoso, recibe el objeto user del backend
 *   - onGoRegister()  → navega a la pantalla de registro
 */

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { api, setToken } from './api';

export default function LoginScreen({ onLogin, onGoRegister }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);

  /**
   * Envía las credenciales al backend.
   * Si son correctas guarda el token JWT y llama a onLogin con los datos del usuario.
   */
  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      return Alert.alert('Error', 'Completa todos los campos');
    }
    try {
      setCargando(true);
      const data = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      setToken(data.token); // guarda el JWT para peticiones futuras
      onLogin(data.user);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    // KeyboardAvoidingView sube el formulario cuando aparece el teclado en iOS
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.header}>
          <Text style={s.logo}>4all</Text>
          <Text style={s.sub}>Gestiona tu piso fácilmente</Text>
        </View>
        <View style={s.form}>
          <Text style={s.label}>Email</Text>
          <TextInput style={s.input} placeholder="tu@email.com" placeholderTextColor="#9CA3AF"
            value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <Text style={s.label}>Contraseña</Text>
          <TextInput style={s.input} placeholder="••••••••" placeholderTextColor="#9CA3AF"
            value={password} onChangeText={setPassword} secureTextEntry onSubmitEditing={handleLogin} />
          <TouchableOpacity style={[s.btn, cargando && s.btnOff]} onPress={handleLogin} disabled={cargando}>
            {cargando ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>Iniciar sesión</Text>}
          </TouchableOpacity>
        </View>
        <View style={s.footer}>
          <Text style={s.footerTxt}>¿No tienes cuenta?</Text>
          <TouchableOpacity onPress={onGoRegister}>
            <Text style={s.link}> Regístrate</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scroll:    { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header:    { alignItems: 'center', marginBottom: 40 },
  logo:      { fontSize: 56, fontWeight: '900', color: '#4F46E5', letterSpacing: -2 },
  sub:       { fontSize: 16, color: '#6B7280', marginTop: 8 },
  form:      { backgroundColor: '#fff', borderRadius: 16, padding: 24, elevation: 3 },
  label:     { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 12 },
  input:     { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111827', backgroundColor: '#F9FAFB' },
  btn:       { backgroundColor: '#4F46E5', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  btnOff:    { opacity: 0.6 },
  btnTxt:    { color: '#fff', fontSize: 16, fontWeight: '700' },
  footer:    { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerTxt: { color: '#6B7280', fontSize: 14 },
  link:      { color: '#4F46E5', fontSize: 14, fontWeight: '600' },
});
