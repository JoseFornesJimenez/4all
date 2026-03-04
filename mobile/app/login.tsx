// ─── Pantalla de Login - 4all App ─────────────────────────────────────────────
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Por favor, completa todos los campos');
      return;
    }

    try {
      setCargando(true);

      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al iniciar sesión');
      }

      // Guardar token y datos del usuario en AsyncStorage
      await AsyncStorage.setItem('token', data.token);
      await AsyncStorage.setItem('user', JSON.stringify(data.user));

      // Navegar según si el usuario ya tiene piso o no
      if (data.user.pisoId) {
        router.replace('/(tabs)/inicio');
      } else {
        router.replace('/piso/seleccionar');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'No se pudo conectar con el servidor');
    } finally {
      setCargando(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Logo / Título */}
        <View style={styles.header}>
          <Text style={styles.logo}>4all</Text>
          <Text style={styles.subtitulo}>Gestiona tu piso fácilmente</Text>
        </View>

        {/* Formulario */}
        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="tu@email.com"
            placeholderTextColor="#9CA3AF"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            returnKeyType="next"
          />

          <Text style={styles.label}>Contraseña</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#9CA3AF"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            returnKeyType="done"
            onSubmitEditing={handleLogin}
          />

          <TouchableOpacity
            style={[styles.boton, cargando && styles.botonDesactivado]}
            onPress={handleLogin}
            disabled={cargando}
            activeOpacity={0.8}
          >
            {cargando ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.botonTexto}>Iniciar sesión</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Registro */}
        <View style={styles.footer}>
          <Text style={styles.footerTexto}>¿No tienes cuenta?</Text>
          <TouchableOpacity onPress={() => router.push('/register')}>
            <Text style={styles.enlace}> Regístrate</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    fontSize: 56,
    fontWeight: '900',
    color: '#4F46E5',
    letterSpacing: -2,
  },
  subtitulo: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
  },
  form: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  boton: {
    backgroundColor: '#4F46E5',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  botonDesactivado: {
    opacity: 0.6,
  },
  botonTexto: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerTexto: {
    color: '#6B7280',
    fontSize: 14,
  },
  enlace: {
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: '600',
  },
});
