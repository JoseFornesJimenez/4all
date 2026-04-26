/**
 * App.js - Punto de entrada de la aplicacion
 *
 * Gestiona la navegacion entre pantallas usando useState.
 * No se usa ninguna libreria de navegacion para mantener compatibilidad
 * con Expo Go sin modulos nativos adicionales.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Alert, Modal, Pressable } from 'react-native';
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
  const [menuVisible, setMenuVisible] = useState(false);

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

  const handleMenu = () => setMenuVisible(true);

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

      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <Pressable style={s.modalOverlay} onPress={() => setMenuVisible(false)}>
          <Pressable style={s.menuCard} onPress={() => {}}>
            <View style={s.menuHandle} />
            <Text style={s.menuTitle}>Tu cuenta</Text>
            {!!piso?.nombre && <Text style={s.menuPiso}>{piso.nombre}</Text>}

            <TouchableOpacity style={s.menuBtn} onPress={() => { setMenuVisible(false); handleSalir(); }}>
              <Text style={s.menuBtnTxt}>Cerrar sesión</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[s.menuBtn, s.menuBtnDanger]} onPress={() => { setMenuVisible(false); handleSalirDePiso(); }}>
              <Text style={[s.menuBtnTxt, s.menuBtnDangerTxt]}>Salir del piso</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.menuCancel} onPress={() => setMenuVisible(false)}>
              <Text style={s.menuCancelTxt}>Cancelar</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const TEAL = '#1BBCD4';

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0FAFA' },

  header: {
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? 40 : 56,
    paddingBottom: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: '#C8F0F0',
  },
  headerInfo: { flex: 1, paddingRight: 12 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#0A7A8A' },
  headerSubtitle: { marginTop: 4, fontSize: 12, color: '#6B7280', fontWeight: '500' },
  settingsBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#D6F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  settingsIcon: { fontSize: 16, color: TEAL, fontWeight: '700' },

  content: { flex: 1 },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#C8F0F0',
    paddingBottom: Platform.OS === 'ios' ? 24 : 20,
    paddingTop: 10,
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
    backgroundColor: '#D6F5F5',
  },
  tabLabel: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
    marginTop: 2,
  },
  tabLabelActive: {
    color: TEAL,
    fontWeight: '700',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  menuCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  menuHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginBottom: 20,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0A7A8A',
    marginBottom: 4,
  },
  menuPiso: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 20,
  },
  menuBtn: {
    backgroundColor: '#F0FAFA',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#C8F0F0',
  },
  menuBtnTxt: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0A7A8A',
  },
  menuBtnDanger: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FECACA',
  },
  menuBtnDangerTxt: {
    color: '#DC2626',
  },
  menuCancel: {
    marginTop: 4,
    paddingVertical: 14,
    alignItems: 'center',
  },
  menuCancelTxt: {
    fontSize: 15,
    color: '#9CA3AF',
    fontWeight: '500',
  },
});
