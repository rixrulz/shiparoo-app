import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, Modal, Alert, Switch,
} from 'react-native';
import { fleet as fleetApi } from '../../services/api';
import { Card, Colors, Spinner, ErrorBanner, Empty, Button, Input, Divider } from '../../components/UI';

const EQUIPMENT_TYPES = ['dry_van', 'flatbed', 'reefer', 'step_deck', 'lowboy', 'tanker', 'auto_carrier'];

export default function FleetScreen() {
  const [vehicles,   setVehicles]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState(null);
  const [showAdd,    setShowAdd]    = useState(false);

  // Form state
  const [make,        setMake]       = useState('');
  const [model,       setModel]      = useState('');
  const [year,        setYear]       = useState('');
  const [plate,       setPlate]      = useState('');
  const [vin,         setVin]        = useState('');
  const [equipment,   setEquipment]  = useState('dry_van');
  const [maxWeight,   setMaxWeight]  = useState('');
  const [saving,      setSaving]     = useState(false);
  const [formErrors,  setFormErrors] = useState({});

  const fetchVehicles = useCallback(async () => {
    try {
      setError(null);
      const data = await fleetApi.vehicles();
      setVehicles(data.vehicles ?? data ?? []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchVehicles(); }, [fetchVehicles]);

  const onRefresh = () => { setRefreshing(true); fetchVehicles(); };

  const handleToggleStatus = async (vehicle) => {
    try {
      const newStatus = vehicle.status === 'available' ? 'unavailable' : 'available';
      await fleetApi.updateVehicle(vehicle.id, { status: newStatus });
      fetchVehicles();
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const validate = () => {
    const e = {};
    if (!make.trim())  e.make  = 'Required';
    if (!model.trim()) e.model = 'Required';
    if (!year.trim() || isNaN(parseInt(year))) e.year = 'Valid year required';
    if (!plate.trim()) e.plate = 'Required';
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleAdd = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await fleetApi.addVehicle({
        make:           make.trim(),
        model:          model.trim(),
        year:           parseInt(year),
        licensePlate:   plate.trim().toUpperCase(),
        vin:            vin.trim() || undefined,
        equipmentType:  equipment,
        maxWeightLbs:   maxWeight ? parseInt(maxWeight) : undefined,
      });
      setShowAdd(false);
      resetForm();
      fetchVehicles();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setMake(''); setModel(''); setYear(''); setPlate('');
    setVin(''); setEquipment('dry_van'); setMaxWeight('');
    setFormErrors({});
  };

  const statusColor = (s) => s === 'available' ? Colors.success : Colors.muted;
  const statusLabel = (s) => s?.replace(/_/g, ' ').toUpperCase() ?? '—';

  const renderVehicle = ({ item }) => (
    <Card>
      <View style={styles.vehicleHeader}>
        <View>
          <Text style={styles.vehicleName}>{item.year} {item.make} {item.model}</Text>
          <Text style={styles.vehiclePlate}>{item.licensePlate}</Text>
        </View>
        <View style={styles.statusToggle}>
          <Text style={[styles.statusLabel, { color: statusColor(item.status) }]}>
            {statusLabel(item.status)}
          </Text>
          <Switch
            value={item.status === 'available'}
            onValueChange={() => handleToggleStatus(item)}
            trackColor={{ false: Colors.border, true: Colors.success }}
            thumbColor="#fff"
          />
        </View>
      </View>
      <Divider />
      <View style={styles.metaRow}>
        <MetaBadge label={item.equipmentType?.replace(/_/g, ' ')} />
        {item.maxWeightLbs && <MetaBadge label={`Max ${item.maxWeightLbs.toLocaleString()} lbs`} />}
        {item.vin && <Text style={styles.vin}>VIN: {item.vin.slice(-6)}</Text>}
      </View>
    </Card>
  );

  if (loading) return <Spinner />;

  return (
    <View style={styles.container}>
      <ErrorBanner message={error} onRetry={fetchVehicles} />

      <FlatList
        data={vehicles}
        keyExtractor={i => i.id}
        renderItem={renderVehicle}
        contentContainerStyle={vehicles.length === 0 ? { flex: 1 } : { paddingBottom: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        ListHeaderComponent={
          <View style={styles.addRow}>
            <Button title="+ Add Vehicle" onPress={() => setShowAdd(true)} />
          </View>
        }
        ListEmptyComponent={
          <Empty icon="🚛" title="No vehicles yet" subtitle="Add your first truck or trailer to get started." />
        }
      />

      {/* Add Vehicle Modal */}
      <Modal visible={showAdd} animationType="slide" presentationStyle="formSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Vehicle</Text>
            <TouchableOpacity onPress={() => { setShowAdd(false); resetForm(); }}>
              <Text style={styles.modalClose}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={[1]}
            keyExtractor={() => 'form'}
            keyboardShouldPersistTaps="handled"
            renderItem={() => (
              <View style={styles.form}>
                <Input label="Make" value={make} onChangeText={setMake} autoCapitalize="words" placeholder="Freightliner, Kenworth…" error={formErrors.make} />
                <Input label="Model" value={model} onChangeText={setModel} autoCapitalize="words" placeholder="Cascadia, W900…" error={formErrors.model} />
                <Input label="Year" value={year} onChangeText={setYear} keyboardType="numeric" placeholder="2020" error={formErrors.year} />
                <Input label="License Plate" value={plate} onChangeText={setPlate} autoCapitalize="characters" placeholder="ABC1234" error={formErrors.plate} />
                <Input label="VIN (optional)" value={vin} onChangeText={setVin} autoCapitalize="characters" placeholder="1HGBH41JXMN109186" />
                <Input label="Max Load Weight (lbs, optional)" value={maxWeight} onChangeText={setMaxWeight} keyboardType="numeric" placeholder="45000" />

                <Text style={styles.equipLabel}>Equipment Type</Text>
                <View style={styles.equipGrid}>
                  {EQUIPMENT_TYPES.map(t => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.equipChip, equipment === t && styles.equipChipActive]}
                      onPress={() => setEquipment(t)}
                    >
                      <Text style={[styles.equipChipText, equipment === t && styles.equipChipTextActive]}>
                        {t.replace(/_/g, ' ')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Button title="Save Vehicle" onPress={handleAdd} loading={saving} style={{ marginTop: 20 }} />
              </View>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

function MetaBadge({ label }) {
  return (
    <View style={styles.metaBadge}>
      <Text style={styles.metaBadgeText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:         { flex: 1, backgroundColor: Colors.bg },
  addRow:            { padding: 16, paddingBottom: 4 },
  vehicleHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  vehicleName:       { fontSize: 16, fontWeight: '700', color: Colors.text },
  vehiclePlate:      { fontSize: 13, color: Colors.muted, marginTop: 2 },
  statusToggle:      { alignItems: 'flex-end', gap: 4 },
  statusLabel:       { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  metaRow:           { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  metaBadge:         { backgroundColor: Colors.badge, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  metaBadgeText:     { fontSize: 12, color: Colors.badgeText, fontWeight: '600' },
  vin:               { fontSize: 12, color: Colors.muted },
  modalContainer:    { flex: 1, backgroundColor: Colors.bg },
  modalHeader:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalTitle:        { fontSize: 20, fontWeight: '800', color: Colors.text },
  modalClose:        { color: Colors.primary, fontWeight: '600', fontSize: 16 },
  form:              { padding: 20 },
  equipLabel:        { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 8 },
  equipGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  equipChip:         { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.card },
  equipChipActive:   { backgroundColor: Colors.primary, borderColor: Colors.primary },
  equipChipText:     { fontSize: 13, fontWeight: '600', color: Colors.muted },
  equipChipTextActive:{ color: '#fff' },
});
