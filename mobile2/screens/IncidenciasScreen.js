import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList,
  ActivityIndicator, Alert, StatusBar, Platform, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { api } from './api';

const PURPLE = '#6366F1';
const PURPLE_DARK = '#1E1B4B';
const PURPLE_LIGHT = '#EEF2FF';
const BG = '#F8F7FF';
const CARD = '#FFFFFF';
const BORDER = '#E5E7EB';
const MUTED = '#6B7280';

const ESTADOS = ['TODAS', 'ABIERTA', 'EN_PROGRESO', 'RESUELTA'];
const PRIORIDADES = ['BAJA', 'MEDIA', 'ALTA', 'URGENTE'];

const ESTADO_LABELS = {
  ABIERTA: 'Abierta',
  EN_PROGRESO: 'En progreso',
  RESUELTA: 'Resuelta',
};

const PRIORIDAD_LABELS = {
  BAJA: 'Baja',
  MEDIA: 'Media',
  ALTA: 'Alta',
  URGENTE: 'Urgente',
};

const ESTADO_COLORS = {
  ABIERTA: { bg: '#FEF3C7', text: '#B45309' },
  EN_PROGRESO: { bg: PURPLE_LIGHT, text: PURPLE },
  RESUELTA: { bg: '#DCFCE7', text: '#15803D' },
};

const PRIORIDAD_COLORS = {
  BAJA: { bg: '#F3F4F6', text: '#4B5563' },
  MEDIA: { bg: PURPLE_LIGHT, text: PURPLE },
  ALTA: { bg: '#FEE2E2', text: '#B91C1C' },
  URGENTE: { bg: '#FFE4E6', text: '#BE123C' },
};

function getNextEstado(estadoActual) {
  if (estadoActual === 'ABIERTA') return 'EN_PROGRESO';
  if (estadoActual === 'EN_PROGRESO') return 'RESUELTA';
  return 'ABIERTA';
}

function getEstadoActionLabel(estadoActual) {
  if (estadoActual === 'ABIERTA') return 'Empezar';
  if (estadoActual === 'EN_PROGRESO') return 'Resolver';
  return 'Reabrir';
}

function formatFecha(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function buildImageData(asset) {
  if (!asset?.base64) return null;
  const mimeType = asset.mimeType || 'image/jpeg';
  return `data:${mimeType};base64,${asset.base64}`;
}

export default function IncidenciasScreen({ user }) {
  const [incidencias, setIncidencias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [accionandoId, setAccionandoId] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState('TODAS');
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [prioridad, setPrioridad] = useState('MEDIA');
  const [foto, setFoto] = useState(null);

  const cargar = useCallback(async () => {
    try {
      const query = filtroEstado === 'TODAS' ? '' : `?estado=${filtroEstado}`;
      const data = await api(`/incidencias${query}`);
      setIncidencias(data.incidencias);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setCargando(false);
    }
  }, [filtroEstado]);

  useEffect(() => {
    setCargando(true);
    cargar();
  }, [cargar]);

  async function seleccionarDeGaleria() {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert('Permiso requerido', 'Necesitas permitir el acceso a tus fotos.');
      return;
    }

    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      base64: true,
    });

    if (!resultado.canceled && resultado.assets?.[0]) {
      setFoto(buildImageData(resultado.assets[0]));
    }
  }

  async function hacerFoto() {
    const permiso = await ImagePicker.requestCameraPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert('Permiso requerido', 'Necesitas permitir el uso de la camara.');
      return;
    }

    const resultado = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      base64: true,
    });

    if (!resultado.canceled && resultado.assets?.[0]) {
      setFoto(buildImageData(resultado.assets[0]));
    }
  }

  const crearIncidencia = async () => {
    if (!titulo.trim()) {
      return Alert.alert('Error', 'Escribe un titulo para la incidencia');
    }

    try {
      setGuardando(true);
      const data = await api('/incidencias', {
        method: 'POST',
        body: JSON.stringify({
          titulo: titulo.trim(),
          descripcion: descripcion.trim() || undefined,
          prioridad,
          foto: foto || undefined,
        }),
      });

      setTitulo('');
      setDescripcion('');
      setPrioridad('MEDIA');
      setFoto(null);
      setMostrarFormulario(false);

      if (filtroEstado === 'TODAS' || filtroEstado === data.incidencia.estado) {
        setIncidencias(prev => [data.incidencia, ...prev]);
      }
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setGuardando(false);
    }
  };

  const cambiarEstado = async (incidencia) => {
    const estado = getNextEstado(incidencia.estado);

    try {
      setAccionandoId(incidencia.id);
      const data = await api(`/incidencias/${incidencia.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ estado }),
      });

      if (filtroEstado !== 'TODAS' && filtroEstado !== data.incidencia.estado) {
        setIncidencias(prev => prev.filter(item => item.id !== incidencia.id));
      } else {
        setIncidencias(prev =>
          prev.map(item => item.id === incidencia.id ? data.incidencia : item)
        );
      }
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setAccionandoId(null);
    }
  };

  const eliminarIncidencia = async (incidencia) => {
    Alert.alert(
      'Eliminar incidencia',
      `Se eliminara "${incidencia.titulo}".`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setAccionandoId(incidencia.id);
              await api(`/incidencias/${incidencia.id}`, { method: 'DELETE' });
              setIncidencias(prev => prev.filter(item => item.id !== incidencia.id));
            } catch (e) {
              Alert.alert('Error', e.message);
            } finally {
              setAccionandoId(null);
            }
          },
        },
      ]
    );
  };

  if (cargando) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={PURPLE} />
        <Text style={s.loadingTxt}>Cargando incidencias...</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor={BG} />

      <FlatList
        data={incidencias}
        keyExtractor={(item) => item.id}
        onRefresh={cargar}
        refreshing={cargando}
        ListHeaderComponent={
          <>
            <View style={s.header}>
              <Text style={s.headerTitle}>Incidencias del piso</Text>
              <Text style={s.headerSubtitle}>
                Registra problemas, añade una foto y revisa lo que sigue pendiente.
              </Text>
            </View>

            <TouchableOpacity
              style={s.toggleCreateBtn}
              onPress={() => setMostrarFormulario(prev => !prev)}
              activeOpacity={0.85}
            >
              <Text style={s.toggleCreateBtnTxt}>
                {mostrarFormulario ? 'Ocultar formulario' : 'Crear nueva incidencia'}
              </Text>
            </TouchableOpacity>

            {mostrarFormulario && (
              <View style={s.formCard}>
                <Text style={s.sectionTitle}>1. Titulo</Text>
                <TextInput
                  style={s.input}
                  placeholder="Ej: Se ha roto la cisterna"
                  placeholderTextColor="#9CA3AF"
                  value={titulo}
                  onChangeText={setTitulo}
                />

                <Text style={s.sectionTitle}>2. Descripcion</Text>
                <TextInput
                  style={[s.input, s.textarea]}
                  placeholder="Describe que pasa, donde ocurre o que se necesita"
                  placeholderTextColor="#9CA3AF"
                  value={descripcion}
                  onChangeText={setDescripcion}
                  multiline
                  textAlignVertical="top"
                />

                <Text style={s.sectionTitle}>3. Foto</Text>
                <View style={s.photoActions}>
                  <TouchableOpacity style={s.photoBtn} onPress={hacerFoto}>
                    <Text style={s.photoBtnTxt}>Hacer foto</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.photoBtn} onPress={seleccionarDeGaleria}>
                    <Text style={s.photoBtnTxt}>Subir desde fotos</Text>
                  </TouchableOpacity>
                </View>

                {foto && (
                  <View style={s.photoPreviewWrap}>
                    <Image source={{ uri: foto }} style={s.photoPreview} resizeMode="contain" />
                    <TouchableOpacity style={s.removePhotoBtn} onPress={() => setFoto(null)}>
                      <Text style={s.removePhotoBtnTxt}>Quitar foto</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <Text style={s.sectionTitle}>4. Prioridad</Text>
                <View style={s.priorityRow}>
                  {PRIORIDADES.map((nivel) => {
                    const active = prioridad === nivel;
                    return (
                      <TouchableOpacity
                        key={nivel}
                        style={[s.priorityChip, active && s.priorityChipActive]}
                        onPress={() => setPrioridad(nivel)}
                      >
                        <Text style={[s.priorityChipTxt, active && s.priorityChipTxtActive]}>
                          {PRIORIDAD_LABELS[nivel]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={s.sectionTitle}>5. Crear</Text>
                <TouchableOpacity
                  style={[s.createBtn, guardando && s.btnOff]}
                  onPress={crearIncidencia}
                  disabled={guardando}
                >
                  {guardando
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={s.createBtnTxt}>Crear incidencia</Text>}
                </TouchableOpacity>
              </View>
            )}

            <View style={s.filtersRow}>
              {ESTADOS.map((estado) => {
                const active = filtroEstado === estado;
                return (
                  <TouchableOpacity
                    key={estado}
                    style={[s.filterChip, active && s.filterChipActive]}
                    onPress={() => setFiltroEstado(estado)}
                  >
                    <Text style={[s.filterChipTxt, active && s.filterChipTxtActive]}>
                      {estado === 'TODAS' ? 'Todas' : ESTADO_LABELS[estado]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        }
        contentContainerStyle={s.listContent}
        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <Text style={s.emptyTitle}>No hay incidencias en este filtro</Text>
            <Text style={s.emptySubtitle}>
              Crea una nueva o cambia el filtro para revisar otras.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const estadoStyle = ESTADO_COLORS[item.estado] || ESTADO_COLORS.ABIERTA;
          const prioridadStyle = PRIORIDAD_COLORS[item.prioridad] || PRIORIDAD_COLORS.MEDIA;
          const accionando = accionandoId === item.id;

          return (
            <View style={s.card}>
              <View style={s.postHeader}>
                <View style={s.userBadge}>
                  <Text style={s.userBadgeTxt}>
                    {(item.creadaPor?.nombre || 'U').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={s.postHeaderInfo}>
                  <Text style={s.postUserName}>{item.creadaPor?.nombre || 'Usuario'}</Text>
                  <Text style={s.postDate}>{formatFecha(item.createdAt)}</Text>
                </View>
                <View style={s.badges}>
                  <View style={[s.badge, { backgroundColor: estadoStyle.bg }]}>
                    <Text style={[s.badgeTxt, { color: estadoStyle.text }]}>
                      {ESTADO_LABELS[item.estado]}
                    </Text>
                  </View>
                  <View style={[s.badge, { backgroundColor: prioridadStyle.bg }]}>
                    <Text style={[s.badgeTxt, { color: prioridadStyle.text }]}>
                      {PRIORIDAD_LABELS[item.prioridad]}
                    </Text>
                  </View>
                </View>
              </View>

              <Text style={s.cardTitle}>{item.titulo}</Text>

              {!!item.descripcion && (
                <Text style={s.cardDescription}>{item.descripcion}</Text>
              )}

              {!!item.foto && (
                <Image source={{ uri: item.foto }} style={s.cardPhoto} resizeMode="contain" />
              )}

              <View style={s.commentRow}>
                <Text style={s.commentIcon}>💬</Text>
                <Text style={s.commentText}>
                  Comentarios proximamente
                </Text>
                {user?.id !== item.creadaPor?.id && (
                  <View style={s.commentDot} />
                )}
              </View>

              {item.resueltaAt && (
                <Text style={s.metaText}>
                  Resuelta el {formatFecha(item.resueltaAt)}
                </Text>
              )}

              <View style={s.cardActions}>
                <TouchableOpacity
                  style={[s.actionBtn, accionando && s.btnOff]}
                  onPress={() => cambiarEstado(item)}
                  disabled={accionando}
                >
                  {accionando
                    ? <ActivityIndicator color={PURPLE} size="small" />
                    : <Text style={s.actionBtnTxt}>{getEstadoActionLabel(item.estado)}</Text>}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[s.deleteBtn, accionando && s.btnOff]}
                  onPress={() => eliminarIncidencia(item)}
                  disabled={accionando}
                >
                  <Text style={s.deleteBtnTxt}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
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
    color: PURPLE,
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: PURPLE_DARK,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: MUTED,
  },
  toggleCreateBtn: {
    backgroundColor: PURPLE,
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 14,
    marginBottom: 14,
    shadowColor: PURPLE,
    shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 3,
  },
  toggleCreateBtnTxt: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  formCard: {
    backgroundColor: CARD,
    borderRadius: 18,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: PURPLE_DARK,
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: PURPLE_DARK,
    borderWidth: 1,
    borderColor: BORDER,
    marginBottom: 12,
  },
  textarea: {
    minHeight: 88,
  },
  photoActions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  photoBtn: {
    flex: 1,
    backgroundColor: PURPLE_LIGHT,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  photoBtnTxt: {
    color: PURPLE,
    fontSize: 13,
    fontWeight: '700',
  },
  photoPreviewWrap: {
    marginBottom: 14,
  },
  photoPreview: {
    width: '100%',
    height: 320,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
  },
  removePhotoBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  removePhotoBtnTxt: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '700',
  },
  priorityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  priorityChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: PURPLE_LIGHT,
  },
  priorityChipActive: {
    backgroundColor: PURPLE,
  },
  priorityChipTxt: {
    color: PURPLE,
    fontSize: 13,
    fontWeight: '600',
  },
  priorityChipTxtActive: {
    color: '#FFFFFF',
  },
  createBtn: {
    backgroundColor: PURPLE,
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 14,
  },
  createBtnTxt: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  btnOff: {
    opacity: 0.55,
  },
  filtersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: PURPLE_LIGHT,
  },
  filterChipActive: {
    backgroundColor: PURPLE_DARK,
  },
  filterChipTxt: {
    color: PURPLE,
    fontSize: 13,
    fontWeight: '600',
  },
  filterChipTxtActive: {
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: CARD,
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  userBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PURPLE_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userBadgeTxt: {
    color: PURPLE,
    fontSize: 15,
    fontWeight: '800',
  },
  postHeaderInfo: {
    flex: 1,
  },
  postUserName: {
    color: PURPLE_DARK,
    fontSize: 14,
    fontWeight: '700',
  },
  postDate: {
    marginTop: 2,
    color: MUTED,
    fontSize: 12,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: PURPLE_DARK,
  },
  badges: {
    alignItems: 'flex-end',
    gap: 6,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeTxt: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardDescription: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
    color: '#57534E',
  },
  cardPhoto: {
    width: '100%',
    height: 320,
    borderRadius: 14,
    marginTop: 12,
    backgroundColor: '#E5E7EB',
  },
  commentRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commentIcon: {
    fontSize: 16,
  },
  commentText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: '600',
  },
  commentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: PURPLE,
    marginLeft: 'auto',
  },
  metaText: {
    marginTop: 8,
    fontSize: 12,
    color: '#78716C',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: PURPLE_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  actionBtnTxt: {
    color: PURPLE,
    fontSize: 14,
    fontWeight: '700',
  },
  deleteBtn: {
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  deleteBtnTxt: {
    color: '#B91C1C',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyWrap: {
    backgroundColor: CARD,
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: PURPLE_DARK,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: MUTED,
    textAlign: 'center',
  },
});
