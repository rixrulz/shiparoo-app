import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Modal, TextInput, RefreshControl,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { loads as loadsApi, bids as bidsApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Card, Badge, Colors, fmt, Spinner, ErrorBanner, Button, Divider } from '../../components/UI';

export default function LoadDetailScreen({ route, navigation }) {
  const { loadId } = route.params;
  const { user }   = useAuth();

  const [load,     setLoad]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [bidding,  setBidding]  = useState(false);
  const [bidAmt,   setBidAmt]   = useState('');
  const [bidNotes, setBidNotes] = useState('');
  const [showBid,  setShowBid]  = useState(false);
  const [placing,  setPlacing]  = useState(false);

  const fetchLoad = useCallback(async () => {
    try {
      setError(null);
      const data = await loadsApi.get(loadId);
      setLoad(data.load ?? data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [loadId]);

  useEffect(() => { fetchLoad(); }, [fetchLoad]);

  const handlePlaceBid = async () => {
    if (!bidAmt || isNaN(parseFloat(bidAmt))) {
      Alert.alert('Invalid Amount', 'Please enter a valid bid amount.');
      return;
    }
    setPlacing(true);
    try {
      await bidsApi.place({
        loadId,
        amountCents: Math.round(parseFloat(bidAmt) * 100),
        notes:       bidNotes.trim() || undefined,
      });
      setShowBid(false);
      setBidAmt('');
      setBidNotes('');
      fetchLoad();
      Alert.alert('Bid Placed! 🏷️', 'The shipper will review your bid.');
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setPlacing(false);
    }
  };

  if (loading) return <Spinner />;
  if (!load)   return <ErrorBanner message={error ?? 'Load not found'} onRetry={fetchLoad} />;

  const isCarrier = user?.role === 'carrier';
  const isShipper = user?.role === 'shipper';
  const canBid    = isCarrier && ['posted', 'bidding'].includes(load.status);
  const midLat    = load.originLat && load.destLat ? (load.originLat + load.destLat) / 2 : 39.5;
  const midLon    = load.originLon && load.destLon ? (load.originLon + load.destLon) / 2 : -98.35;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={false} onRefresh={fetchLoad} tintColor={Colors.primary} />}>
        <ErrorBanner message={error} onRetry={fetchLoad} />

        {/* Map */}
        {load.originLat && (
          <MapView
            style={styles.map}
            initialRegion={{ latitude: midLat, longitude: midLon, latitudeDelta: 6, longitudeDelta: 6 }}
            scrollEnabled={false}
          >
            <Marker coordinate={{ latitude: load.originLat, longitude: load.originLon }} pinColor="green" title="Origin" description={`${load.originCity}, ${load.originState}`} />
            <Marker coordinate={{ latitude: load.destLat, longitude: load.destLon }} pinColor="red" title="Destination" description={`${load.destCity}, ${load.destState}`} />
          </MapView>
        )}

        {/* Header */}
        <Card>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.ref}>{load.referenceNumber}</Text>
              <Text style={styles.route}>{fmt.route(load)}</Text>
            </View>
            <Badge status={load.status} />
          </View>

          {load.offeredRateCents && (
            <View style={styles.rateBox}>
              <Text style={styles.rateLabel}>Offered Rate</Text>
              <Text style={styles.rateAmount}>{fmt.dollars(load.offeredRateCents)}</Text>
              {load.distanceMiles && (
                <Text style={styles.ratePpm}>
                  ${((load.offeredRateCents / 100) / load.distanceMiles).toFixed(2)}/mi
                </Text>
              )}
            </View>
          )}
        </Card>

        {/* Route details */}
        <Card>
          <SectionTitle title="Route" />
          <DetailRow label="Origin"       value={`${load.originAddress ?? ''} ${load.originCity}, ${load.originState} ${load.originZip ?? ''}`.trim()} />
          <DetailRow label="Destination"  value={`${load.destAddress ?? ''} ${load.destCity}, ${load.destState} ${load.destZip ?? ''}`.trim()} />
          <DetailRow label="Distance"     value={fmt.miles(load.distanceMiles)} />
          <DetailRow label="Pickup"       value={fmt.date(load.pickupDate)} />
          <DetailRow label="Delivery"     value={fmt.date(load.deliveryDate)} />
        </Card>

        {/* Load specs */}
        <Card>
          <SectionTitle title="Load Specs" />
          <DetailRow label="Equipment"    value={load.equipmentType?.replace(/_/g, ' ')} />
          <DetailRow label="Weight"       value={fmt.weight(load.weight)} />
          <DetailRow label="Commodity"    value={load.commodity} />
          <DetailRow label="Pieces"       value={load.pieces?.toLocaleString()} />
          <DetailRow label="Length"       value={load.length ? `${load.length} ft` : null} />
          <DetailRow label="Hazmat"       value={load.hazmat ? '⚠️ Yes' : 'No'} />
        </Card>

        {/* Notes */}
        {load.notes && (
          <Card>
            <SectionTitle title="Special Instructions" />
            <Text style={styles.notes}>{load.notes}</Text>
          </Card>
        )}

        {/* Shipper-specific: bid count */}
        {isShipper && ['posted', 'bidding'].includes(load.status) && (
          <Card>
            <TouchableOpacity
              onPress={() => navigation.navigate('LoadBids', { loadId: load.id })}
              style={styles.bidsLink}
            >
              <Text style={styles.bidsLinkText}>
                {load.bidCount ?? 0} bid{load.bidCount !== 1 ? 's' : ''} — Tap to review →
              </Text>
            </TouchableOpacity>
          </Card>
        )}

        {/* POD review button for shipper */}
        {isShipper && load.status === 'delivered' && (
          <View style={styles.actionBlock}>
            <Button title="Review Proof of Delivery" onPress={() => navigation.navigate('PODReview', { loadId: load.id })} />
          </View>
        )}

        {/* Carrier bid button */}
        {canBid && (
          <View style={styles.actionBlock}>
            <Button title="Place a Bid" onPress={() => { setBidAmt(String((load.offeredRateCents / 100).toFixed(0))); setShowBid(true); }} />
          </View>
        )}
      </ScrollView>

      {/* Bid sheet */}
      <Modal visible={showBid} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Place Bid</Text>
            <Text style={styles.sheetRoute}>{fmt.route(load)}</Text>
            <Text style={styles.sheetRef}>Offered: {fmt.dollars(load.offeredRateCents)}</Text>

            <TextInput
              style={styles.bidInput}
              value={bidAmt}
              onChangeText={setBidAmt}
              keyboardType="decimal-pad"
              placeholder="0"
              autoFocus
            />
            <Text style={styles.bidInputLabel}>USD — Your bid amount</Text>

            <TextInput
              style={styles.notesInput}
              value={bidNotes}
              onChangeText={setBidNotes}
              placeholder="Optional note (capacity, ETA, truck info…)"
              multiline
              numberOfLines={2}
            />

            <Button title={placing ? 'Placing…' : 'Submit Bid'} onPress={handlePlaceBid} loading={placing} style={{ marginTop: 16 }} />
            <Button title="Cancel" variant="ghost" onPress={() => setShowBid(false)} style={{ marginTop: 10 }} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

function SectionTitle({ title }) {
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function DetailRow({ label, value }) {
  if (!value) return null;
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: Colors.bg },
  scroll:         { paddingBottom: 48 },
  map:            { height: 200 },
  headerRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  ref:            { fontSize: 11, color: Colors.muted, fontWeight: '600' },
  route:          { fontSize: 17, fontWeight: '800', color: Colors.text },
  rateBox:        { backgroundColor: Colors.bg, borderRadius: 10, padding: 12, alignItems: 'flex-start' },
  rateLabel:      { fontSize: 11, color: Colors.muted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  rateAmount:     { fontSize: 30, fontWeight: '800', color: Colors.primary },
  ratePpm:        { fontSize: 14, color: Colors.muted },
  sectionTitle:   { fontSize: 14, fontWeight: '700', color: Colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  detailRow:      { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  detailLabel:    { fontSize: 14, color: Colors.muted },
  detailValue:    { fontSize: 14, fontWeight: '600', color: Colors.text, flex: 1, textAlign: 'right', marginLeft: 16 },
  notes:          { fontSize: 14, color: Colors.text, lineHeight: 20 },
  bidsLink:       { paddingVertical: 8 },
  bidsLinkText:   { color: Colors.primary, fontWeight: '600', fontSize: 14 },
  actionBlock:    { marginHorizontal: 16, marginTop: 8 },
  overlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet:          { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, paddingBottom: 48 },
  sheetTitle:     { fontSize: 20, fontWeight: '800', color: Colors.text },
  sheetRoute:     { fontSize: 14, color: Colors.muted, marginTop: 4, marginBottom: 2 },
  sheetRef:       { fontSize: 14, color: Colors.muted, marginBottom: 16 },
  bidInput:       { fontSize: 48, fontWeight: '800', color: Colors.primary, textAlign: 'center', borderBottomWidth: 2, borderBottomColor: Colors.primary, paddingVertical: 8 },
  bidInputLabel:  { textAlign: 'center', color: Colors.muted, fontSize: 14, marginTop: 4 },
  notesInput:     { marginTop: 16, backgroundColor: Colors.bg, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.border, padding: 12, fontSize: 14, color: Colors.text, minHeight: 60, textAlignVertical: 'top' },
});
