import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList,
  ActivityIndicator, Alert, Platform,
} from 'react-native';
import { api } from './api';

const BLUE = '#2563EB';
const BLUE_DARK = '#0F172A';
const BLUE_LIGHT = '#DBEAFE';
const BG = '#F5F8FF';
const CARD = '#FFFFFF';
const BORDER = '#DCE5F8';
const MUTED = '#64748B';
const GREEN = '#16A34A';
const GREEN_LIGHT = '#DCFCE7';
const ORANGE = '#EA580C';
const ORANGE_LIGHT = '#FFEDD5';

const SHIFT_OPTIONS = [
  'Limpieza cocina',
  'Limpieza bano',
  'Sacar basura',
  'Aspirar salon',
  'Compra semanal',
  'Otro',
];

function toIsoDate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseIsoLocalDate(value) {
  if (typeof value !== 'string') return new Date(value);
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return new Date(value);
  return new Date(year, month - 1, day, 12, 0, 0);
}

function getWeekRange(baseDate) {
  const start = parseIsoLocalDate(baseDate);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + mondayOffset);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function buildWeekDays(baseDate) {
  const { start } = getWeekRange(baseDate);
  const days = [];
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}

function formatDateLong(value) {
  return parseIsoLocalDate(value).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });
}

function titleCaseFirst(text) {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatWeekLabel(baseDate) {
  const { start, end } = getWeekRange(baseDate);
  const startLabel = start.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  const endLabel = end.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  return `${startLabel} - ${endLabel}`;
}

export default function TurnosScreen() {
  const [turnos, setTurnos] = useState([]);
  const [miembros, setMiembros] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [miUsuario, setMiUsuario] = useState(null);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [generandoAuto, setGenerandoAuto] = useState(false);
  const [accionandoId, setAccionandoId] = useState(null);

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [titulo, setTitulo] = useState(SHIFT_OPTIONS[0]);
  const [fecha, setFecha] = useState(toIsoDate(new Date()));
  const [asignadoAId, setAsignadoAId] = useState('');
  const [notas, setNotas] = useState('');

  const [weekAnchor, setWeekAnchor] = useState(toIsoDate(new Date()));
  const [selectedDay, setSelectedDay] = useState(toIsoDate(new Date()));

  const [openSwapTurnoId, setOpenSwapTurnoId] = useState(null);
  const [swapToId, setSwapToId] = useState('');
  const [swapMensaje, setSwapMensaje] = useState('');

  const weekDays = useMemo(() => buildWeekDays(weekAnchor), [weekAnchor]);
  const weekRange = useMemo(() => getWeekRange(weekAnchor), [weekAnchor]);

  const cargarTodo = useCallback(async () => {
    try {
      const desde = encodeURIComponent(weekRange.start.toISOString());
      const hasta = encodeURIComponent(weekRange.end.toISOString());

      const [turnosData, pisoData, meData, solicitudesData] = await Promise.all([
        api(`/turnos?desde=${desde}&hasta=${hasta}`),
        api('/piso'),
        api('/auth/me'),
        api('/turnos/solicitudes'),
      ]);

      setTurnos(turnosData.turnos || []);
      const miembrosPiso = pisoData.piso?.miembros || [];
      setMiembros(miembrosPiso);
      setSolicitudes(solicitudesData.solicitudes || []);
      setMiUsuario(meData.user || null);

      if (!asignadoAId && miembrosPiso.length > 0) {
        setAsignadoAId(miembrosPiso[0].id);
      }
      if (!swapToId && miembrosPiso.length > 0) {
        setSwapToId(miembrosPiso[0].id);
      }
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setCargando(false);
    }
  }, [asignadoAId, swapToId, weekRange.end, weekRange.start]);

  useEffect(() => {
    setCargando(true);
    cargarTodo();
  }, [cargarTodo]);

  const turnosPorDia = useMemo(() => {
    const map = {};
    turnos.forEach((turno) => {
      const key = toIsoDate(turno.fecha);
      if (!map[key]) map[key] = [];
      map[key].push(turno);
    });
    return map;
  }, [turnos]);

  const turnosDelDiaSeleccionado = turnosPorDia[selectedDay] || [];

  const stats = useMemo(() => {
    const pendientes = turnos.filter((t) => t.estado === 'PENDIENTE').length;
    const hechos = turnos.filter((t) => t.estado === 'HECHO').length;
    return {
      total: turnos.length,
      pendientes,
      hechos,
    };
  }, [turnos]);

  const solicitudesEntrantes = useMemo(
    () => solicitudes.filter((s) => s.nuevoAsignadoId === miUsuario?.id && s.estado === 'PENDIENTE'),
    [miUsuario?.id, solicitudes]
  );

  const crearTurno = async () => {
    if (!titulo.trim() || !fecha.trim() || !asignadoAId) {
      return Alert.alert('Error', 'Completa titulo, fecha y persona asignada');
    }

    try {
      setGuardando(true);
      await api('/turnos', {
        method: 'POST',
        body: JSON.stringify({
          titulo: titulo.trim(),
          fecha: parseIsoLocalDate(fecha).toISOString(),
          asignadoAId,
          notas: notas.trim(),
        }),
      });

      setNotas('');
      setFecha(toIsoDate(new Date()));
      setMostrarFormulario(false);
      await cargarTodo();
      setSelectedDay(fecha);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setGuardando(false);
    }
  };

  const autoGenerarSemana = async () => {
    try {
      setGenerandoAuto(true);
      await api('/turnos/auto-generar-semana', {
        method: 'POST',
        body: JSON.stringify({ fechaBase: weekRange.start.toISOString() }),
      });
      await cargarTodo();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setGenerandoAuto(false);
    }
  };

  const toggleTurno = async (id) => {
    try {
      setAccionandoId(id);
      await api(`/turnos/${id}/toggle`, { method: 'PATCH' });
      await cargarTodo();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setAccionandoId(null);
    }
  };

  const eliminarTurno = async (turno) => {
    Alert.alert('Eliminar turno', `Se eliminara "${turno.titulo}".`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            setAccionandoId(turno.id);
            await api(`/turnos/${turno.id}`, { method: 'DELETE' });
            await cargarTodo();
          } catch (e) {
            Alert.alert('Error', e.message);
          } finally {
            setAccionandoId(null);
          }
        },
      },
    ]);
  };

  const solicitarCambio = async (turnoId) => {
    if (!swapToId) {
      return Alert.alert('Error', 'Selecciona una persona para proponer el cambio');
    }

    try {
      setAccionandoId(turnoId);
      await api(`/turnos/${turnoId}/solicitar-cambio`, {
        method: 'POST',
        body: JSON.stringify({
          nuevoAsignadoId: swapToId,
          mensaje: swapMensaje.trim(),
        }),
      });
      setSwapMensaje('');
      setOpenSwapTurnoId(null);
      await cargarTodo();
      Alert.alert('Solicitud enviada', 'La otra persona podra aceptarla o rechazarla.');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setAccionandoId(null);
    }
  };

  const responderSolicitud = async (solicitudId, accion) => {
    try {
      setAccionandoId(solicitudId);
      await api(`/turnos/solicitudes/${solicitudId}/responder`, {
        method: 'PATCH',
        body: JSON.stringify({ accion }),
      });
      await cargarTodo();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setAccionandoId(null);
    }
  };

  const cambiarSemana = (delta) => {
    const d = parseIsoLocalDate(weekAnchor);
    d.setDate(d.getDate() + delta * 7);
    const nextAnchor = toIsoDate(d);
    setWeekAnchor(nextAnchor);
    const firstDay = toIsoDate(getWeekRange(nextAnchor).start);
    setSelectedDay(firstDay);
  };

  const weekLabel = formatWeekLabel(weekAnchor);

  const renderHeader = () => (
    <View style={s.header}>
      <Text style={s.headerTitle}>Calendario de turnos</Text>
      <Text style={s.headerSubtitle}>
        Todos teneis el mismo rol. El estado lo cambia quien tiene el turno, y los cambios se aceptan entre vosotros.
      </Text>
    </View>
  );

  const renderStats = () => (
    <View style={s.statsRow}>
      <View style={s.statsCard}>
        <Text style={s.statsLabel}>Total semana</Text>
        <Text style={s.statsValue}>{stats.total}</Text>
      </View>
      <View style={s.statsCard}>
        <Text style={s.statsLabel}>Pendientes</Text>
        <Text style={s.statsValue}>{stats.pendientes}</Text>
      </View>
      <View style={s.statsCard}>
        <Text style={s.statsLabel}>Hechos</Text>
        <Text style={s.statsValue}>{stats.hechos}</Text>
      </View>
    </View>
  );

  const renderWeekNav = () => (
    <View style={s.weekNavCard}>
      <View style={s.weekTopRow}>
        <TouchableOpacity style={s.navBtn} onPress={() => cambiarSemana(-1)}>
          <Text style={s.navBtnTxt}>Semana anterior</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.navBtn} onPress={() => cambiarSemana(1)}>
          <Text style={s.navBtnTxt}>Semana siguiente</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.weekLabel}>{weekLabel}</Text>

      <TouchableOpacity
        style={[s.autoBtn, generandoAuto && s.btnOff]}
        onPress={autoGenerarSemana}
        disabled={generandoAuto}
      >
        {generandoAuto
          ? <ActivityIndicator color="#fff" />
          : <Text style={s.autoBtnTxt}>Auto-generar semana</Text>}
      </TouchableOpacity>
    </View>
  );

  const renderForm = () => (
    <>
      <TouchableOpacity
        style={s.toggleCreateBtn}
        onPress={() => setMostrarFormulario((prev) => !prev)}
        activeOpacity={0.85}
      >
        <Text style={s.toggleCreateBtnTxt}>
          {mostrarFormulario ? 'Ocultar formulario' : 'Crear turno manual'}
        </Text>
      </TouchableOpacity>

      {mostrarFormulario && (
        <View style={s.formCard}>
          <Text style={s.sectionTitle}>Tipo de turno</Text>
          <View style={s.chipsWrap}>
            {SHIFT_OPTIONS.map((option) => {
              const active = titulo === option;
              return (
                <TouchableOpacity
                  key={option}
                  style={[s.chip, active && s.chipActive]}
                  onPress={() => setTitulo(option)}
                >
                  <Text style={[s.chipTxt, active && s.chipTxtActive]}>{option}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={s.sectionTitle}>Fecha (YYYY-MM-DD)</Text>
          <TextInput
            style={s.input}
            placeholder="2026-03-28"
            placeholderTextColor="#94A3B8"
            value={fecha}
            onChangeText={setFecha}
            autoCapitalize="none"
          />

          <Text style={s.sectionTitle}>Asignar a</Text>
          <View style={s.chipsWrap}>
            {miembros.map((m) => {
              const active = asignadoAId === m.id;
              return (
                <TouchableOpacity
                  key={m.id}
                  style={[s.chip, active && s.chipActive]}
                  onPress={() => setAsignadoAId(m.id)}
                >
                  <Text style={[s.chipTxt, active && s.chipTxtActive]}>{m.nombre}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={s.sectionTitle}>Notas (opcional)</Text>
          <TextInput
            style={[s.input, s.inputArea]}
            multiline
            value={notas}
            onChangeText={setNotas}
            placeholder="Ej: dejar cubo limpio y sin bolsas sueltas"
            placeholderTextColor="#94A3B8"
          />

          <TouchableOpacity
            style={[s.createBtn, guardando && s.btnOff]}
            onPress={crearTurno}
            disabled={guardando}
          >
            {guardando
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.createBtnTxt}>Guardar turno</Text>}
          </TouchableOpacity>
        </View>
      )}
    </>
  );

  const renderCalendar = () => (
    <View style={s.calendarCard}>
      <Text style={s.calendarTitle}>Semana en curso</Text>
      <View style={s.weekRow}>
        {weekDays.map((day) => {
          const dayKey = toIsoDate(day);
          const active = dayKey === selectedDay;
          const cantidad = (turnosPorDia[dayKey] || []).length;
          const label = day.toLocaleDateString('es-ES', { weekday: 'short' }).slice(0, 2);

          return (
            <TouchableOpacity
              key={dayKey}
              style={[s.dayCell, active && s.dayCellActive]}
              onPress={() => setSelectedDay(dayKey)}
            >
              <Text style={[s.dayLabel, active && s.dayLabelActive]}>{label}</Text>
              <Text style={[s.dayNumber, active && s.dayNumberActive]}>{day.getDate()}</Text>
              {cantidad > 0 && (
                <View style={[s.countDot, active && s.countDotActive]}>
                  <Text style={[s.countDotTxt, active && s.countDotTxtActive]}>{cantidad}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderSolicitudes = () => (
    <View style={s.requestsCard}>
      <Text style={s.requestsTitle}>Solicitudes de cambio para ti</Text>
      {solicitudesEntrantes.length === 0 ? (
        <Text style={s.requestsEmpty}>No tienes solicitudes pendientes.</Text>
      ) : (
        solicitudesEntrantes.map((sol) => {
          const loading = accionandoId === sol.id;
          return (
            <View key={sol.id} style={s.requestItem}>
              <Text style={s.requestText}>
                {sol.solicitante?.nombre} te pide cubrir: {sol.turno?.titulo}
              </Text>
              {!!sol.mensaje && <Text style={s.requestMessage}>{sol.mensaje}</Text>}
              <View style={s.requestActions}>
                <TouchableOpacity
                  style={[s.requestBtn, s.requestAccept, loading && s.btnOff]}
                  onPress={() => responderSolicitud(sol.id, 'ACEPTAR')}
                  disabled={loading}
                >
                  <Text style={s.requestAcceptTxt}>Aceptar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.requestBtn, s.requestReject, loading && s.btnOff]}
                  onPress={() => responderSolicitud(sol.id, 'RECHAZAR')}
                  disabled={loading}
                >
                  <Text style={s.requestRejectTxt}>Rechazar</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}
    </View>
  );

  const renderTurno = ({ item }) => {
    const hecho = item.estado === 'HECHO';
    const accionando = accionandoId === item.id;
    const esMio = item.asignadoAId === miUsuario?.id;
    const openSwap = openSwapTurnoId === item.id;
    const posibles = miembros.filter((m) => m.id !== miUsuario?.id);

    return (
      <View style={s.card}>
        <View style={s.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle}>{item.titulo}</Text>
            <Text style={s.cardMeta}>
              Asignado a {item.asignadoA?.nombre || 'Usuario'}
            </Text>
            {!!item.notas && <Text style={s.cardNotes}>{item.notas}</Text>}
          </View>
          <View style={[s.statusBadge, hecho ? s.statusDone : s.statusPending]}>
            <Text style={[s.statusBadgeTxt, hecho ? s.statusDoneTxt : s.statusPendingTxt]}>
              {hecho ? 'Hecho' : 'Pendiente'}
            </Text>
          </View>
        </View>

        <View style={s.actionsRow}>
          <TouchableOpacity
            style={[s.actionBtn, s.actionDone, (!esMio || accionando) && s.btnOff]}
            onPress={() => toggleTurno(item.id)}
            disabled={accionando || !esMio}
          >
            <Text style={s.actionDoneTxt}>{esMio ? (hecho ? 'Marcar pendiente' : 'Marcar hecho') : 'Solo asignado'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.actionBtn, s.actionDelete, accionando && s.btnOff]}
            onPress={() => eliminarTurno(item)}
            disabled={accionando}
          >
            <Text style={s.actionDeleteTxt}>Eliminar</Text>
          </TouchableOpacity>
        </View>

        {esMio && (
          <View style={s.swapWrap}>
            <TouchableOpacity
              style={s.swapToggle}
              onPress={() => {
                setOpenSwapTurnoId(openSwap ? null : item.id);
                if (posibles.length > 0) setSwapToId(posibles[0].id);
              }}
            >
              <Text style={s.swapToggleTxt}>Solicitar cambio de turno</Text>
            </TouchableOpacity>

            {openSwap && (
              <View style={s.swapPanel}>
                <Text style={s.swapTitle}>Pedir a quien quieres pasarlo</Text>
                <View style={s.chipsWrap}>
                  {posibles.map((m) => {
                    const active = swapToId === m.id;
                    return (
                      <TouchableOpacity
                        key={m.id}
                        style={[s.chip, active && s.chipActive]}
                        onPress={() => setSwapToId(m.id)}
                      >
                        <Text style={[s.chipTxt, active && s.chipTxtActive]}>{m.nombre}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TextInput
                  style={[s.input, s.inputArea, { marginBottom: 8 }]}
                  multiline
                  value={swapMensaje}
                  onChangeText={setSwapMensaje}
                  placeholder="Mensaje opcional"
                  placeholderTextColor="#94A3B8"
                />

                <TouchableOpacity
                  style={[s.createBtn, accionando && s.btnOff]}
                  onPress={() => solicitarCambio(item.id)}
                  disabled={accionando}
                >
                  <Text style={s.createBtnTxt}>Enviar solicitud</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  if (cargando) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={BLUE} />
        <Text style={s.loadingTxt}>Cargando turnos...</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <FlatList
        data={turnosDelDiaSeleccionado}
        keyExtractor={(item) => item.id}
        onRefresh={cargarTodo}
        refreshing={cargando}
        contentContainerStyle={s.listContent}
        ListHeaderComponent={
          <>
            {renderHeader()}
            {renderStats()}
            {renderWeekNav()}
            {renderForm()}
            {renderSolicitudes()}
            {renderCalendar()}

            <View style={s.dayHeader}>
              <Text style={s.dayHeaderTitle}>
                {titleCaseFirst(formatDateLong(selectedDay))}
              </Text>
              <Text style={s.dayHeaderSubtitle}>
                {turnosDelDiaSeleccionado.length} turno{turnosDelDiaSeleccionado.length !== 1 ? 's' : ''}
              </Text>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <Text style={s.emptyTitle}>No hay turnos para este dia</Text>
            <Text style={s.emptySubtitle}>Crea uno manual o usa Auto-generar semana.</Text>
          </View>
        }
        renderItem={renderTurno}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
    paddingTop: Platform.OS === 'android' ? 8 : 0,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    backgroundColor: BG,
  },
  loadingTxt: {
    color: BLUE,
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: BLUE_DARK,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: MUTED,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  statsCard: {
    flex: 1,
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 14,
  },
  statsLabel: {
    fontSize: 12,
    color: MUTED,
    marginBottom: 6,
  },
  statsValue: {
    color: BLUE_DARK,
    fontSize: 18,
    fontWeight: '800',
  },
  weekNavCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
    marginBottom: 12,
  },
  weekTopRow: {
    flexDirection: 'row',
    gap: 8,
  },
  navBtn: {
    flex: 1,
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  navBtnTxt: {
    color: '#1D4ED8',
    fontSize: 12,
    fontWeight: '700',
  },
  weekLabel: {
    marginTop: 10,
    color: BLUE_DARK,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  autoBtn: {
    marginTop: 10,
    backgroundColor: BLUE,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  autoBtnTxt: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  toggleCreateBtn: {
    backgroundColor: BLUE,
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 14,
    marginBottom: 12,
  },
  toggleCreateBtnTxt: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  formCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: BLUE_DARK,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: BLUE_DARK,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 12,
  },
  inputArea: {
    minHeight: 78,
    textAlignVertical: 'top',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    backgroundColor: BLUE_LIGHT,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: BLUE_DARK,
  },
  chipTxt: {
    color: BLUE,
    fontSize: 13,
    fontWeight: '700',
  },
  chipTxtActive: {
    color: '#FFFFFF',
  },
  createBtn: {
    backgroundColor: BLUE,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 12,
  },
  createBtnTxt: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  btnOff: {
    opacity: 0.55,
  },
  requestsCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    marginBottom: 12,
  },
  requestsTitle: {
    color: BLUE_DARK,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 8,
  },
  requestsEmpty: {
    color: MUTED,
    fontSize: 13,
  },
  requestItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    marginTop: 8,
  },
  requestText: {
    color: BLUE_DARK,
    fontSize: 13,
    fontWeight: '700',
  },
  requestMessage: {
    color: MUTED,
    fontSize: 12,
    marginTop: 4,
  },
  requestActions: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 8,
  },
  requestBtn: {
    flex: 1,
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 9,
  },
  requestAccept: {
    backgroundColor: GREEN_LIGHT,
  },
  requestReject: {
    backgroundColor: '#FEE2E2',
  },
  requestAcceptTxt: {
    color: GREEN,
    fontSize: 12,
    fontWeight: '700',
  },
  requestRejectTxt: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '700',
  },
  calendarCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    marginBottom: 12,
  },
  calendarTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: BLUE_DARK,
    marginBottom: 10,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  dayCell: {
    flex: 1,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  dayCellActive: {
    backgroundColor: BLUE,
  },
  dayLabel: {
    color: '#1D4ED8',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  dayLabelActive: {
    color: '#DBEAFE',
  },
  dayNumber: {
    marginTop: 2,
    color: BLUE_DARK,
    fontSize: 15,
    fontWeight: '800',
  },
  dayNumberActive: {
    color: '#FFFFFF',
  },
  countDot: {
    marginTop: 5,
    minWidth: 22,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#BFDBFE',
    alignItems: 'center',
  },
  countDotActive: {
    backgroundColor: '#93C5FD',
  },
  countDotTxt: {
    color: '#1E3A8A',
    fontSize: 11,
    fontWeight: '700',
  },
  countDotTxtActive: {
    color: BLUE_DARK,
  },
  dayHeader: {
    marginBottom: 10,
  },
  dayHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: BLUE_DARK,
  },
  dayHeaderSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: MUTED,
  },
  card: {
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  cardTitle: {
    color: BLUE_DARK,
    fontSize: 16,
    fontWeight: '800',
  },
  cardMeta: {
    marginTop: 4,
    color: MUTED,
    fontSize: 13,
  },
  cardNotes: {
    marginTop: 8,
    color: '#334155',
    fontSize: 13,
    lineHeight: 18,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusPending: {
    backgroundColor: ORANGE_LIGHT,
  },
  statusDone: {
    backgroundColor: GREEN_LIGHT,
  },
  statusBadgeTxt: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusPendingTxt: {
    color: ORANGE,
  },
  statusDoneTxt: {
    color: GREEN,
  },
  actionsRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionDone: {
    backgroundColor: GREEN_LIGHT,
  },
  actionDelete: {
    backgroundColor: '#FEE2E2',
  },
  actionDoneTxt: {
    color: GREEN,
    fontWeight: '700',
    fontSize: 12,
  },
  actionDeleteTxt: {
    color: '#B91C1C',
    fontWeight: '700',
    fontSize: 12,
  },
  swapWrap: {
    marginTop: 10,
  },
  swapToggle: {
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 10,
  },
  swapToggleTxt: {
    color: '#1D4ED8',
    fontWeight: '700',
    fontSize: 13,
  },
  swapPanel: {
    marginTop: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 10,
  },
  swapTitle: {
    color: BLUE_DARK,
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 8,
  },
  emptyWrap: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: BLUE_DARK,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: MUTED,
    textAlign: 'center',
  },
});
