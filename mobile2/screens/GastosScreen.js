import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList,
  ActivityIndicator, Alert, Platform,
} from 'react-native';
import { api } from './api';

const PURPLE = '#6366F1';
const PURPLE_DARK = '#1E1B4B';
const PURPLE_LIGHT = '#EEF2FF';
const BG = '#F8F7FF';
const CARD = '#FFFFFF';
const BORDER = '#E5E7EB';
const MUTED = '#6B7280';
const GREEN = '#10B981';
const GREEN_LIGHT = '#ECFDF5';
const RED = '#DC2626';
const RED_LIGHT = '#FEF2F2';

function formatMoney(value) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(Number(value) || 0);
}

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function buildLiquidaciones(balance) {
  const acreedores = balance
    .filter((item) => item.neto > 0.009)
    .map((item) => ({ ...item, restante: Number(item.neto) }))
    .sort((a, b) => b.restante - a.restante);

  const deudores = balance
    .filter((item) => item.neto < -0.009)
    .map((item) => ({ ...item, restante: Math.abs(Number(item.neto)) }))
    .sort((a, b) => b.restante - a.restante);

  const pagos = [];
  let i = 0;
  let j = 0;

  while (i < deudores.length && j < acreedores.length) {
    const deudor = deudores[i];
    const acreedor = acreedores[j];
    const monto = Math.min(deudor.restante, acreedor.restante);

    if (monto > 0.009) {
      pagos.push({
        fromId: deudor.id,
        from: deudor.nombre,
        toId: acreedor.id,
        to: acreedor.nombre,
        amount: Number(monto.toFixed(2)),
      });
    }

    deudor.restante = Number((deudor.restante - monto).toFixed(2));
    acreedor.restante = Number((acreedor.restante - monto).toFixed(2));

    if (deudor.restante <= 0.009) i += 1;
    if (acreedor.restante <= 0.009) j += 1;
  }

  return pagos;
}

export default function GastosScreen({ user }) {
  const [gastos, setGastos] = useState([]);
  const [balance, setBalance] = useState([]);
  const [miembros, setMiembros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [accionandoId, setAccionandoId] = useState(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [descripcion, setDescripcion] = useState('');
  const [monto, setMonto] = useState('');
  const [tab, setTab] = useState('gastos');

  const cargarTodo = useCallback(async () => {
    try {
      const [gastosData, balanceData, pisoData] = await Promise.all([
        api('/gastos'),
        api('/gastos/balance'),
        api('/piso'),
      ]);

      setGastos(gastosData.gastos);
      setBalance(balanceData.balance);
      setMiembros(pisoData.piso?.miembros || []);
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    setCargando(true);
    cargarTodo();
  }, [cargarTodo]);

  const liquidaciones = useMemo(() => buildLiquidaciones(balance), [balance]);
  const totalPendiente = useMemo(
    () => gastos.reduce((acc, gasto) => (
      acc + gasto.deudas.filter((deuda) => !deuda.pagada).reduce((sum, deuda) => sum + Number(deuda.monto), 0)
    ), 0),
    [gastos]
  );

  const crearGasto = async () => {
    if (!descripcion.trim() || !monto.trim()) {
      return Alert.alert('Error', 'Escribe una descripcion y un importe');
    }

    const parsedMonto = Number(monto.replace(',', '.'));
    if (Number.isNaN(parsedMonto) || parsedMonto <= 0) {
      return Alert.alert('Error', 'El importe debe ser mayor que 0');
    }

    try {
      setGuardando(true);
      const data = await api('/gastos', {
        method: 'POST',
        body: JSON.stringify({
          descripcion: descripcion.trim(),
          monto: parsedMonto,
        }),
      });

      setDescripcion('');
      setMonto('');
      setMostrarFormulario(false);
      setGastos((prev) => [data.gasto, ...prev]);
      await cargarTodo();
      setTab('gastos');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setGuardando(false);
    }
  };

  const marcarDeudaPagada = async (deudaId) => {
    try {
      setAccionandoId(deudaId);
      await api(`/gastos/deuda/${deudaId}/pagar`, { method: 'PATCH' });
      await cargarTodo();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setAccionandoId(null);
    }
  };

  const eliminarGasto = async (gasto) => {
    Alert.alert(
      'Eliminar gasto',
      `Se eliminara "${gasto.descripcion}".`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setAccionandoId(gasto.id);
              await api(`/gastos/${gasto.id}`, { method: 'DELETE' });
              await cargarTodo();
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

  const renderResumen = () => (
    <View style={s.summaryWrap}>
      <View style={s.summaryCard}>
        <Text style={s.summaryLabel}>Miembros</Text>
        <Text style={s.summaryValue}>{miembros.length}</Text>
      </View>
      <View style={s.summaryCard}>
        <Text style={s.summaryLabel}>Gastos registrados</Text>
        <Text style={s.summaryValue}>{gastos.length}</Text>
      </View>
      <View style={s.summaryCard}>
        <Text style={s.summaryLabel}>Pendiente total</Text>
        <Text style={s.summaryValue}>{formatMoney(totalPendiente)}</Text>
      </View>
    </View>
  );

  const renderFormulario = () => (
    <>
      <TouchableOpacity
        style={s.toggleCreateBtn}
        onPress={() => setMostrarFormulario((prev) => !prev)}
        activeOpacity={0.85}
      >
        <Text style={s.toggleCreateBtnTxt}>
          {mostrarFormulario ? 'Ocultar formulario' : 'Registrar gasto'}
        </Text>
      </TouchableOpacity>

      {mostrarFormulario && (
        <View style={s.formCard}>
          <Text style={s.sectionTitle}>1. Que has pagado</Text>
          <TextInput
            style={s.input}
            placeholder="Ej: Compra del super, bombillas, detergente"
            placeholderTextColor="#9CA3AF"
            value={descripcion}
            onChangeText={setDescripcion}
          />

          <Text style={s.sectionTitle}>2. Importe total</Text>
          <TextInput
            style={s.input}
            placeholder="Ej: 24.90"
            placeholderTextColor="#9CA3AF"
            keyboardType="decimal-pad"
            value={monto}
            onChangeText={setMonto}
          />

          <Text style={s.sectionTitle}>3. A quien se reparte</Text>
          
          <View style={s.membersWrap}>
            {miembros.map((miembro) => (
              <View key={miembro.id} style={s.memberChip}>
                <Text style={s.memberChipTxt}>{miembro.nombre}</Text>
              </View>
            ))}
          </View>

          <Text style={s.sectionTitle}>4. Guardar gasto</Text>
          <TouchableOpacity
            style={[s.createBtn, guardando && s.btnOff]}
            onPress={crearGasto}
            disabled={guardando}
          >
            {guardando
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.createBtnTxt}>Guardar gasto</Text>}
          </TouchableOpacity>
        </View>
      )}
    </>
  );

  const renderTabs = () => (
    <View style={s.tabsRow}>
      {[
        { key: 'gastos', label: 'Gastos' },
        { key: 'deudas', label: 'Mis deudas' },
        { key: 'balance', label: 'Balance final' },
      ].map((item) => {
        const active = tab === item.key;
        return (
          <TouchableOpacity
            key={item.key}
            style={[s.tabChip, active && s.tabChipActive]}
            onPress={() => setTab(item.key)}
          >
            <Text style={[s.tabChipTxt, active && s.tabChipTxtActive]}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderGasto = ({ item }) => {
    const deudasPendientes = item.deudas.filter((deuda) => !deuda.pagada);

    return (
      <View style={s.card}>
        <View style={s.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle}>{item.descripcion}</Text>
            <Text style={s.cardMeta}>
              Pago hecho por {item.pagadoPor?.nombre || 'Usuario'} el {formatDate(item.fecha)}
            </Text>
          </View>
          <View style={s.priceBadge}>
            <Text style={s.priceBadgeTxt}>{formatMoney(item.monto)}</Text>
          </View>
        </View>

        {deudasPendientes.length > 0 ? (
          <View style={s.debtList}>
            {deudasPendientes.map((deuda) => {
              const accionando = accionandoId === deuda.id;
              return (
                <View key={deuda.id} style={s.debtRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.debtText}>
                      {deuda.deudor?.nombre} debe a {deuda.acreedor?.nombre}
                    </Text>
                    <Text style={s.debtAmount}>{formatMoney(deuda.monto)}</Text>
                  </View>
                  <TouchableOpacity
                    style={[s.payBtn, accionando && s.btnOff]}
                    onPress={() => marcarDeudaPagada(deuda.id)}
                    disabled={accionando}
                  >
                    {accionando
                      ? <ActivityIndicator color={GREEN} size="small" />
                      : <Text style={s.payBtnTxt}>Marcar pagado</Text>}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={s.settledWrap}>
            <Text style={s.settledTxt}>Este gasto ya esta saldado.</Text>
          </View>
        )}

        <TouchableOpacity
          style={[s.deleteBtn, accionandoId === item.id && s.btnOff]}
          onPress={() => eliminarGasto(item)}
          disabled={accionandoId === item.id}
        >
          <Text style={s.deleteBtnTxt}>Eliminar gasto</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderDeudas = () => {
    const deudasPendientes = gastos.flatMap((gasto) =>
      gasto.deudas
        .filter((deuda) => !deuda.pagada && deuda.deudorId === user?.id)
        .map((deuda) => ({ ...deuda, gastoDescripcion: gasto.descripcion }))
    );

    if (deudasPendientes.length === 0) {
      return (
        <View style={s.emptyWrap}>
          <Text style={s.emptyTitle}>No tienes deudas pendientes</Text>
          <Text style={s.emptySubtitle}>Ahora mismo no debes nada a nadie.</Text>
        </View>
      );
    }

    return (
      <View style={s.sectionBlock}>
        {deudasPendientes.map((deuda) => {
          const accionando = accionandoId === deuda.id;
          return (
            <View key={deuda.id} style={s.card}>
              <Text style={s.cardTitle}>{deuda.gastoDescripcion}</Text>
              <Text style={s.cardMeta}>
                Debes a {deuda.acreedor?.nombre}
              </Text>
              <Text style={s.bigDebtAmount}>{formatMoney(deuda.monto)}</Text>
              <TouchableOpacity
                style={[s.payBtnWide, accionando && s.btnOff]}
                onPress={() => marcarDeudaPagada(deuda.id)}
                disabled={accionando}
              >
                {accionando
                  ? <ActivityIndicator color={GREEN} size="small" />
                  : <Text style={s.payBtnTxt}>Marcar como pagada</Text>}
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    );
  };

  const renderBalance = () => (
    <View style={s.sectionBlock}>
      <View style={s.card}>
        <Text style={s.cardTitle}>Balance por persona</Text>
        <Text style={s.cardMeta}>
          Positivo significa que le deben dinero. Negativo, que debe pagar.
        </Text>

        <View style={s.balanceList}>
          {balance.map((item) => {
            const positivo = Number(item.neto) >= 0;
            return (
              <View key={item.id} style={s.balanceRow}>
                <Text style={s.balanceName}>{item.nombre}</Text>
                <View style={[s.balanceBadge, positivo ? s.balancePositive : s.balanceNegative]}>
                  <Text style={[s.balanceBadgeTxt, positivo ? s.balancePositiveTxt : s.balanceNegativeTxt]}>
                    {formatMoney(item.neto)}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>Liquidacion final minima</Text>
        <Text style={s.cardMeta}>
          Este resumen simplifica quien deberia pagar a quien para dejar las cuentas cuadradas.
        </Text>

        {liquidaciones.length === 0 ? (
          <View style={s.settledWrap}>
            <Text style={s.settledTxt}>No hace falta que nadie pague nada ahora mismo.</Text>
          </View>
        ) : (
          <View style={s.liquidationList}>
            {liquidaciones.map((item, index) => (
              <View key={`${item.fromId}-${item.toId}-${index}`} style={s.liquidationRow}>
                <Text style={s.liquidationText}>
                  {item.from} paga a {item.to}
                </Text>
                <Text style={s.liquidationAmount}>{formatMoney(item.amount)}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );

  if (cargando) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={PURPLE} />
        <Text style={s.loadingTxt}>Cargando gastos...</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <FlatList
        data={tab === 'gastos' ? gastos : []}
        keyExtractor={(item) => item.id}
        onRefresh={cargarTodo}
        refreshing={cargando}
        contentContainerStyle={s.listContent}
        ListHeaderComponent={
          <>
            <View style={s.header}>
              <Text style={s.headerTitle}>Cuentas del piso</Text>
              <Text style={s.headerSubtitle}>
                Registra lo que pagas, revisa quien debe a quien y mira el cierre final de cuentas.
              </Text>
            </View>

            {renderResumen()}
            {renderFormulario()}
            {renderTabs()}

            {tab === 'deudas' && renderDeudas()}
            {tab === 'balance' && renderBalance()}
          </>
        }
        ListEmptyComponent={
          tab === 'gastos' ? (
            <View style={s.emptyWrap}>
              <Text style={s.emptyTitle}>Todavia no hay gastos registrados</Text>
              <Text style={s.emptySubtitle}>
                Añade el primer gasto del piso para empezar a repartir cuentas.
              </Text>
            </View>
          ) : null
        }
        renderItem={tab === 'gastos' ? renderGasto : null}
        ItemSeparatorComponent={tab === 'gastos' ? (() => <View style={{ height: 12 }} />) : null}
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
  summaryWrap: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 14,
  },
  summaryLabel: {
    fontSize: 12,
    color: MUTED,
    marginBottom: 6,
  },
  summaryValue: {
    color: PURPLE_DARK,
    fontSize: 18,
    fontWeight: '800',
  },
  toggleCreateBtn: {
    backgroundColor: PURPLE,
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 14,
    marginBottom: 14,
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
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: PURPLE_DARK,
    marginBottom: 10,
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
    marginBottom: 14,
  },
  helperText: {
    color: MUTED,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  membersWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  memberChip: {
    backgroundColor: PURPLE_LIGHT,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  memberChipTxt: {
    color: PURPLE,
    fontSize: 13,
    fontWeight: '600',
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
  tabsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  tabChip: {
    backgroundColor: PURPLE_LIGHT,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tabChipActive: {
    backgroundColor: PURPLE_DARK,
  },
  tabChipTxt: {
    color: PURPLE,
    fontSize: 13,
    fontWeight: '700',
  },
  tabChipTxtActive: {
    color: '#FFFFFF',
  },
  sectionBlock: {
    gap: 12,
    marginBottom: 12,
  },
  card: {
    backgroundColor: CARD,
    borderRadius: 18,
    padding: 16,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: PURPLE_DARK,
  },
  cardMeta: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: MUTED,
  },
  priceBadge: {
    backgroundColor: PURPLE_LIGHT,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  priceBadgeTxt: {
    color: PURPLE,
    fontSize: 13,
    fontWeight: '800',
  },
  debtList: {
    marginTop: 14,
    gap: 10,
  },
  debtRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 12,
  },
  debtText: {
    color: PURPLE_DARK,
    fontSize: 14,
    fontWeight: '600',
  },
  debtAmount: {
    marginTop: 4,
    color: MUTED,
    fontSize: 13,
  },
  payBtn: {
    backgroundColor: GREEN_LIGHT,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  payBtnWide: {
    marginTop: 12,
    backgroundColor: GREEN_LIGHT,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  payBtnTxt: {
    color: GREEN,
    fontSize: 13,
    fontWeight: '700',
  },
  settledWrap: {
    marginTop: 14,
    backgroundColor: GREEN_LIGHT,
    borderRadius: 14,
    padding: 14,
  },
  settledTxt: {
    color: GREEN,
    fontSize: 14,
    fontWeight: '600',
  },
  deleteBtn: {
    marginTop: 14,
    alignSelf: 'flex-start',
    backgroundColor: RED_LIGHT,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  deleteBtnTxt: {
    color: RED,
    fontSize: 13,
    fontWeight: '700',
  },
  bigDebtAmount: {
    marginTop: 10,
    color: PURPLE,
    fontSize: 22,
    fontWeight: '800',
  },
  balanceList: {
    marginTop: 14,
    gap: 10,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 12,
  },
  balanceName: {
    color: PURPLE_DARK,
    fontSize: 14,
    fontWeight: '700',
  },
  balanceBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  balancePositive: {
    backgroundColor: GREEN_LIGHT,
  },
  balanceNegative: {
    backgroundColor: RED_LIGHT,
  },
  balanceBadgeTxt: {
    fontSize: 13,
    fontWeight: '800',
  },
  balancePositiveTxt: {
    color: GREEN,
  },
  balanceNegativeTxt: {
    color: RED,
  },
  liquidationList: {
    marginTop: 14,
    gap: 10,
  },
  liquidationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 12,
  },
  liquidationText: {
    flex: 1,
    color: PURPLE_DARK,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '600',
  },
  liquidationAmount: {
    color: PURPLE,
    fontSize: 14,
    fontWeight: '800',
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
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: MUTED,
    textAlign: 'center',
  },
});
