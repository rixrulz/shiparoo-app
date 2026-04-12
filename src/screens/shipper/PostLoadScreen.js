import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { loads as loadsApi } from '../../services/api';
import { Button, Input, Colors, ErrorBanner } from '../../components/UI';

const EQUIPMENT_TYPES = ['dry_van', 'flatbed', 'reefer', 'step_deck', 'lowboy', 'tanker', 'auto_carrier'];
const COMMODITY_TYPES = ['General Freight', 'Produce', 'Refrigerated', 'Hazmat', 'Oversized', 'Livestock', 'Auto', 'Building Materials', 'Machinery'];

export default function PostLoadScreen({ route, navigation }) {
  const editId = route?.params?.loadId;

  // Origin
  const [originAddr,  setOriginAddr]  = useState('');
  const [originCity,  setOriginCity]  = useState('');
  const [originState, setOriginState] = useState('');
  const [originZip,   setOriginZip]   = useState('');

  // Destination
  const [destAddr,    setDestAddr]    = useState('');
  const [destCity,    setDestCity]    = useState('');
  const [destState,   setDestState]   = useState('');
  const [destZip,     setDestZip]     = useState('');

  // Load details
  const [pickup,      setPickup]      = useState('');
  const [delivery,    setDelivery]    = useState('');
  const [equipment,   setEquipment]   = useState('dry_van');
  const [weight,      setWeight]      = useState('');
  const [rate,        setRate]        = useState('');
  const [commodity,   setCommodity]   = useState('General Freight');
  const [pieces,      setPieces]      = useState('');
  const [length,      setLength]      = useState('');
  const [notes,       setNotes]       = useState('');
  const [hazmat,      setHazmat]      = useState(false);

  const [saving,      setSaving]      = useState(false);
  const [publishing,  setPublishing]  = useState(false);
  const [error,       setError]       = useState(null);
  const [formErrors,  setFormErrors]  = useState({});

  const validate = () => {
    const e = {};
    if (!originCity.trim())  e.originCity  = 'Required';
    if (!originState.trim()) e.originState = 'Required';
    if (!destCity.trim())    e.destCity    = 'Required';
    if (!destState.trim())   e.destState   = 'Required';
    if (!pickup.trim())      e.pickup      = 'Required (YYYY-MM-DD)';
    if (!weight.trim() || isNaN(parseInt(weight))) e.weight = 'Valid weight required';
    if (!rate.trim()   || isNaN(parseFloat(rate))) e.rate   = 'Valid rate required';
    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const buildPayload = () => ({
    originAddress:   originAddr.trim() || undefined,
    originCity:      originCity.trim(),
    originState:     originState.trim().toUpperCase().slice(0, 2),
    originZip:       originZip.trim()  || undefined,
    destAddress:     destAddr.trim()   || undefined,
    destCity:        destCity.trim(),
    destState:       destState.trim().toUpperCase().slice(0, 2),
    destZip:         destZip.trim()    || undefined,
    pickupDate:      pickup.trim(),
    deliveryDate:    delivery.trim()   || undefined,
    equipmentType:   equipment,
    weight:          parseInt(weight),
    offeredRateCents: Math.round(parseFloat(rate) * 100),
    commodity:       commodity,
    pieces:          pieces ? parseInt(pieces) : undefined,
    length:          length ? parseFloat(length) : undefined,
    notes:           notes.trim() || undefined,
    hazmat,
  });

  const handleSaveDraft = async () => {
    if (!validate()) return;
    setSaving(true);
    setError(null);
    try {
      if (editId) {
        await loadsApi.update(editId, buildPayload());
      } else {
        await loadsApi.create(buildPayload());
      }
      navigation.goBack();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!validate()) return;
    setPublishing(true);
    setError(null);
    try {
      let loadId = editId;
      if (editId) {
        await loadsApi.update(editId, buildPayload());
      } else {
        const res = await loadsApi.create(buildPayload());
        loadId = res.load?.id ?? res.id;
      }
      await loadsApi.publish(loadId);
      Alert.alert('Load Posted! 🎉', 'Carriers can now see and bid on your load.', [
        { text: 'OK', onPress: () => navigation.navigate('Loads') },
      ]);
    } catch (e) {
      setError(e.message);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <ErrorBanner message={error} />

        {/* Origin */}
        <Text style={styles.sectionLabel}>📍 Origin</Text>
        <Input label="Street Address (optional)" value={originAddr} onChangeText={setOriginAddr} autoCapitalize="words" placeholder="123 Warehouse Blvd" />
        <View style={styles.row}>
          <View style={[styles.flex2, { marginRight: 8 }]}>
            <Input label="City *" value={originCity} onChangeText={setOriginCity} autoCapitalize="words" placeholder="Chicago" error={formErrors.originCity} />
          </View>
          <View style={[styles.state, { marginRight: 8 }]}>
            <Input label="State *" value={originState} onChangeText={setOriginState} autoCapitalize="characters" maxLength={2} placeholder="IL" error={formErrors.originState} />
          </View>
          <View style={styles.zip}>
            <Input label="ZIP" value={originZip} onChangeText={setOriginZip} keyboardType="numeric" maxLength={5} placeholder="60601" />
          </View>
        </View>

        {/* Destination */}
        <Text style={styles.sectionLabel}>🏁 Destination</Text>
        <Input label="Street Address (optional)" value={destAddr} onChangeText={setDestAddr} autoCapitalize="words" placeholder="456 Distribution Dr" />
        <View style={styles.row}>
          <View style={[styles.flex2, { marginRight: 8 }]}>
            <Input label="City *" value={destCity} onChangeText={setDestCity} autoCapitalize="words" placeholder="Dallas" error={formErrors.destCity} />
          </View>
          <View style={[styles.state, { marginRight: 8 }]}>
            <Input label="State *" value={destState} onChangeText={setDestState} autoCapitalize="characters" maxLength={2} placeholder="TX" error={formErrors.destState} />
          </View>
          <View style={styles.zip}>
            <Input label="ZIP" value={destZip} onChangeText={setDestZip} keyboardType="numeric" maxLength={5} placeholder="75201" />
          </View>
        </View>

        {/* Dates */}
        <Text style={styles.sectionLabel}>📅 Dates</Text>
        <View style={styles.row}>
          <View style={[styles.half, { marginRight: 8 }]}>
            <Input label="Pickup Date *" value={pickup} onChangeText={setPickup} placeholder="2026-04-20" keyboardType="numbers-and-punctuation" error={formErrors.pickup} />
          </View>
          <View style={styles.half}>
            <Input label="Delivery Date" value={delivery} onChangeText={setDelivery} placeholder="2026-04-22" keyboardType="numbers-and-punctuation" />
          </View>
        </View>

        {/* Equipment */}
        <Text style={styles.sectionLabel}>🚛 Equipment Type *</Text>
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

        {/* Load details */}
        <Text style={styles.sectionLabel}>📦 Load Details</Text>
        <View style={styles.row}>
          <View style={[styles.half, { marginRight: 8 }]}>
            <Input label="Weight (lbs) *" value={weight} onChangeText={setWeight} keyboardType="numeric" placeholder="45000" error={formErrors.weight} />
          </View>
          <View style={styles.half}>
            <Input label="Offered Rate ($) *" value={rate} onChangeText={setRate} keyboardType="decimal-pad" placeholder="2500" error={formErrors.rate} />
          </View>
        </View>
        <View style={styles.row}>
          <View style={[styles.half, { marginRight: 8 }]}>
            <Input label="Pieces" value={pieces} onChangeText={setPieces} keyboardType="numeric" placeholder="1" />
          </View>
          <View style={styles.half}>
            <Input label="Length (ft)" value={length} onChangeText={setLength} keyboardType="decimal-pad" placeholder="48" />
          </View>
        </View>

        {/* Commodity */}
        <Text style={styles.sectionLabel}>📋 Commodity</Text>
        <View style={styles.equipGrid}>
          {COMMODITY_TYPES.map(c => (
            <TouchableOpacity
              key={c}
              style={[styles.equipChip, commodity === c && styles.equipChipActive]}
              onPress={() => setCommodity(c)}
            >
              <Text style={[styles.equipChipText, commodity === c && styles.equipChipTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Hazmat toggle */}
        <TouchableOpacity
          style={[styles.hazmatRow, hazmat && styles.hazmatActive]}
          onPress={() => setHazmat(!hazmat)}
        >
          <Text style={styles.hazmatIcon}>☢️</Text>
          <View>
            <Text style={[styles.hazmatLabel, hazmat && { color: Colors.danger }]}>Hazmat</Text>
            <Text style={styles.hazmatSub}>Contains hazardous materials</Text>
          </View>
          <View style={[styles.checkbox, hazmat && styles.checkboxActive]}>
            {hazmat && <Text style={styles.checkmark}>✓</Text>}
          </View>
        </TouchableOpacity>

        {/* Special instructions */}
        <Input
          label="Special Instructions (optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Team driver required, liftgate needed, etc."
          multiline
          numberOfLines={3}
          style={{ minHeight: 80, textAlignVertical: 'top' }}
        />

        {/* Actions */}
        <Button
          title={publishing ? 'Publishing…' : 'Publish Now'}
          onPress={handlePublish}
          loading={publishing}
          style={{ marginTop: 8 }}
        />
        <Button
          title={saving ? 'Saving…' : 'Save as Draft'}
          variant="ghost"
          onPress={handleSaveDraft}
          loading={saving}
          style={{ marginTop: 10, marginBottom: 8 }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex:              { flex: 1, backgroundColor: Colors.bg },
  container:         { padding: 16, paddingBottom: 48 },
  sectionLabel:      { fontSize: 13, fontWeight: '700', color: Colors.text, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 16, marginBottom: 10 },
  row:               { flexDirection: 'row' },
  flex2:             { flex: 2 },
  half:              { flex: 1 },
  state:             { width: 60 },
  zip:               { width: 80 },
  equipGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  equipChip:         { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.card },
  equipChipActive:   { backgroundColor: Colors.primary, borderColor: Colors.primary },
  equipChipText:     { fontSize: 13, fontWeight: '600', color: Colors.muted },
  equipChipTextActive:{ color: '#fff' },
  hazmatRow:         { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.card, marginBottom: 16 },
  hazmatActive:      { borderColor: Colors.danger, backgroundColor: '#fff5f5' },
  hazmatIcon:        { fontSize: 24 },
  hazmatLabel:       { fontSize: 15, fontWeight: '700', color: Colors.text },
  hazmatSub:         { fontSize: 12, color: Colors.muted },
  checkbox:          { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', marginLeft: 'auto' },
  checkboxActive:    { backgroundColor: Colors.danger, borderColor: Colors.danger },
  checkmark:         { color: '#fff', fontWeight: '800', fontSize: 14 },
});
