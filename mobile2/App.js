/**
 * App.js — Punto de entrada de la aplicación
 *
 * Gestiona la navegación entre pantallas usando un simple useState.
 * No se usa ninguna librería de navegación para mantener compatibilidad
 * con Expo Go sin módulos nativos adicionales.
 *
 * Pantallas posibles (estado `screen`):
 *   - 'Login'    → formulario de inicio de sesión
 *   - 'Register' → formulario de registro
 *   - 'Piso'     → crear o unirse a un piso
 *   - 'Main'     → app principal con la lista de la compra
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import LoginScreen    from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import PisoScreen     from './screens/PisoScreen';
import CompraScreen   from './screens/CompraScreen';

export default function App() {
  // Pantalla activa
  const [screen, setScreen] = useState('Login');
  // Datos del usuario logueado (nombre, email, pisoId...)
  const [user, setUser]     = useState(null);
  // Datos del piso actual (nombre, codigo de invitación...)
  const [piso, setPiso]     = useState(null);

  /**
   * Se llama tras un login o registro exitoso.
   * Si el usuario ya tiene piso asignado va directo a Main,
   * si no, pasa por la pantalla de configuración de piso.
   */
  const handleLogin = (u) => {
    setUser(u);
    setScreen(u.pisoId ? 'Main' : 'Piso');
  };

  /**
   * Se llama cuando el usuario crea o se une a un piso.
   * Guarda los datos del piso y navega a la app principal.
   */
  const handlePisoListo = (p) => {
    setPiso(p);
    setScreen('Main');
  };

  /**
   * Cierra la sesión: limpia el estado y vuelve al login.
   * El token JWT se pierde al borrar el estado (está en memoria).
   */
  const handleSalir = () => {
    setUser(null);
    setPiso(null);
    setScreen('Login');
  };

  if (screen === 'Login') {
    return (
      <>
        <StatusBar style="auto" />
        <LoginScreen onLogin={handleLogin} onGoRegister={() => setScreen('Register')} />
      </>
    );
  }

  if (screen === 'Register') {
    return (
      <>
        <StatusBar style="auto" />
        <RegisterScreen onLogin={handleLogin} onGoLogin={() => setScreen('Login')} />
      </>
    );
  }

  if (screen === 'Piso') {
    return (
      <>
        <StatusBar style="auto" />
        <PisoScreen onPisoListo={handlePisoListo} />
      </>
    );
  }

  // Pantalla principal — por ahora solo muestra la lista de la compra
  return (
    <View style={s.container}>
      <StatusBar style="light" />
      <View style={s.header}>
        <Text style={s.headerTitle}>🛒 Compra</Text>
        <TouchableOpacity onPress={handleSalir}>
          <Text style={s.salir}>Salir</Text>
        </TouchableOpacity>
      </View>
      <View style={s.content}>
        <CompraScreen />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#F9FAFB' },
  header:      { backgroundColor: '#4F46E5', paddingTop: 48, paddingBottom: 14, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  salir:       { color: '#C7D2FE', fontSize: 14 },
  content:     { flex: 1 },
});
