/**
 * App.js - Punto de entrada de la aplicacion
 *
 * Gestiona la navegacion entre pantallas usando useState.
 * No se usa ninguna libreria de navegacion para mantener compatibilidad
 * con Expo Go sin modulos nativos adicionales.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import PisoScreen from './screens/PisoScreen';
import CompraScreen from './screens/CompraScreen';
import IncidenciasScreen from './screens/IncidenciasScreen';
import GastosScreen from './screens/GastosScreen';
import TurnosScreen from './screens/TurnosScreen';
import { api, setToken } from './screens/api';

const TABS = [
  { key: 'compra', label: 'Compra' },
  { key: 'incidencias', label: 'Incidencias' },
  { key: 'gastos', label: 'Gastos' },
  { key: 'turnos', label: 'Turnos' },
];

export default function App() {
  const [screen, setScreen] = useState('Login');
  const [user, setUser] = useState(null);
  const [piso, setPiso] = useState(null);
  const [tab, setTab] = useState('compra');

  useEffect(() => {
    if (screen !== 'Main' || !user?.pisoId || piso) return;

    let active = true;

    api('/piso')
      .then((data) => {
        if (active) setPiso(data.piso);
      })
      .catch((error) => {
        if (active) Alert.alert('Error', error.message);
      });

    return () => {
      active = false;
    };
  }, [screen, user, piso]);

  const handleLogin = (u) => {
    setUser(u);
    setScreen(u.pisoId ? 'Main' : 'Piso');
  };

  const handlePisoListo = (p) => {
    setPiso(p);
    setScreen('Main');
  };

  const handleSalir = () => {
    setToken(null);
    setUser(null);
    setPiso(null);
    setScreen('Login');
  };

  const handleSalirDePiso = async () => {
    try {
      await api('/piso/salir', { method: 'DELETE' });
      setPiso(null);
      setUser((prev) => (prev ? { ...prev, pisoId: null } : prev));
      setScreen('Piso');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleMenu = () => {
    Alert.alert(
      'Tu cuenta',
      'Puedes cerrar sesion o salir del piso actual. Ahora mismo la app solo soporta un piso por usuario.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar sesion', onPress: handleSalir },
        { text: 'Salir del piso', style: 'destructive', onPress: handleSalirDePiso },
      ]
    );
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

  return (
    <View style={s.container}>
      <StatusBar style="dark" />

      <View style={s.header}>
        <View style={s.headerInfo}>
          <Text style={s.headerTitle}>{TABS.find((t) => t.key === tab)?.label}</Text>
          {!!piso?.nombre && (
            <Text style={s.headerSubtitle}>
              {piso.nombre}
              {!!piso?.codigo && ` - Codigo ${piso.codigo}`}
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={handleMenu} style={s.settingsBtn}>
          <Text style={s.settingsIcon}>C</Text>
        </TouchableOpacity>
      </View>

      <View style={s.content}>
        {tab === 'compra' && <CompraScreen />}
        {tab === 'incidencias' && <IncidenciasScreen user={user} />}
        {tab === 'gastos' && <GastosScreen user={user} />}
        {tab === 'turnos' && <TurnosScreen />}
      </View>

      <View style={s.tabBar}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[s.tabItem, tab === t.key && s.tabItemActive]}
            onPress={() => setTab(t.key)}
            activeOpacity={0.8}
          >
            <Text style={[s.tabLabel, tab === t.key && s.tabLabelActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const PURPLE = '#6366F1';

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F7FF' },

  header: {
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? 40 : 56,
    paddingBottom: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerInfo: { flex: 1, paddingRight: 12 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1E1B4B' },
  headerSubtitle: { marginTop: 4, fontSize: 12, color: '#6B7280', fontWeight: '500' },
  settingsBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  settingsIcon: { fontSize: 16, color: PURPLE, fontWeight: '700' },

  content: { flex: 1 },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#EBEBEB',
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingTop: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 14,
  },
  tabItemActive: {
    backgroundColor: '#EEF2FF',
  },
  tabLabel: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
    marginTop: 2,
  },
  tabLabelActive: {
    color: PURPLE,
    fontWeight: '700',
  },
});
