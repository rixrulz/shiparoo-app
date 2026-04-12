import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity,
} from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { loads as loadsApi, tracking, bids as bidsApi } from '../../services/api';
import { Card, Badge, Colors, fmt, Spinner, ErrorBanner, Button, Divider } from '../../components/UI';

const PING_INTERVAL_MS = 30_000; // 30 s

export default function ActiveLoadScreen({ navigation }) {
  const [load,     setLoad]     = useState(null);
  const [trail,    setTrail]    = useState([]);
  const [myPos,    setMyPos]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [pinging,  setPinging]  = useState(false);
  const pingTimer = useRef(null);

  // Fetch the active / awarded load for this carrier
  const fetchActive = useCallback(async () => {
    try {
      setError(null);
      const data = await loadsApi.mine({ status: 'in_transit,booked' });
      const list  = data.loads ?? data ?? [];
      const active = list.find(l => ['booked', 'in_transit'].includes(l.status));
      setLoad(active ?? null);
      if (active) {
        try {
          const t = await tracking.trail(active.id);
          setTrail(t.trail ?? []);
        } catch (_) {}
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchActive(); }, [fetchActive]);

  // GPS tracking loop
  useEffect(() => {
    if (!load) return;
    let mounted = true;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const sendPing = async () => {
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          if (!mounted) return;
          setMyPos({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
          await tracking.ping({
            loadId:    load.id,
            latitude:  loc.coords.latitude,
            longitude: loc.coords.longitude,
            speedMph:  loc.coords.speed ? loc.coords.speed * 2.23694 : null,
            headingDeg: loc.coords.heading,
          });
        } catch (_) {}
      };

      sendPing();
      pingTimer.current = setInterval(sendPing, PING_INTERVAL_MS);
    })();

    return () => {
      mounted = false;
      if (pingTimer.current) clearInterval(pingTimer.current);
    };
  }, [load?.id]);

  const handleMarkDelivered = () => {
    Alert.alert(
      'Mark as Delivered',
      'Submit your proof of delivery photos and signature.',
      [
        { text: 'Not yet', style: 'cancel' },
        { text: 'Continue', onPress: () => navigation.navigate('PODSubmit', { loadId: load.id }) },
      ],
    );
  };

  if (loading) return <Spinner />;

  if (!load) {
    return (
      <View style={styles.container}>
        <View style={styles.noLoad}>
          <Text style={styles.noLoadIcon}>🚛</Text>
          <Text style={styles.noLoadTitle}>No Active Load</Text>
          <Text style={styles.noLoadSub}>Win a bid on the Load Board to get started.</Text>
          <Button
            title="Browse Loads"
            onPress={() => navigation.navigate('Board')}
            style={{ marginTop: 20 }}
          />
        </View>
      </View>
    );
  }

  const trailCoords = trail.map(t => ({ latitude: t.latitude, longitude: t.longitude }));
  const midLat = (load.originLat + load.destLat) / 2;
  const midLon = (load.originLon + load.destLon) / 2;

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        style={styles.map}
        initialRegion={{
          latitude:       midLat || 39.5,
          longitude:      midLon || -98.35,
          latitudeDelta:  8,
          longitudeDelta: 8,
        }}
        showsUserLocation
      >
        {/* Origin */}
        {load.originLat && (
          <Marker
            coordinate={{ latitude: load.originLat, longitude: load.originLon }}
            title="Origin"
            description={`${load.originCity}, ${load.originState}`}
            pinColor="green"
          />
        )}
        {/* Destination */}
        {load.destLat && (
          <Marker
            coordinate={{ latitude: load.destLat, longitude: load.destLon }}
            title="Destination"
            description={`${load.destCity}, ${load.destState}`}
            pinColor="red"
          />
        )}
        {/* GPS trail */}
        {trailCoords.length > 1 && (
          <Polyline coordinates={trailCoords} strokeColor={Colors.primary} strokeWidth={3} />
        )}
      </MapView>

      {/* Load info panel */}
      <ScrollView style={styles.panel} contentContainerStyle={{ paddingBottom: 32 }}>
        <ErrorBanner message={error} onRetry={fetchActive} />

        <Card>
          <View style={styles.row}>
            <Text style={styles.route}>{fmt.route(load)}</Text>
            <Badge status={load.status} />
          </View>

          <Divider />

          <Info label="Reference" value={load.referenceNumber} />
          <Info label="Pickup"    value={fmt.date(load.pickupDate)} />
          <Info label="Delivery"  value={fmt.date(load.deliveryDate)} />
          <Info label="Weight"    value={fmt.weight(load.weight)} />
          <Info label="Equipment" value={load.equipmentType?.replace(/_/g, ' ')} />
          <Info label="Rate"      value={fmt.dollars(load.offeredRateCents)} />
          <Info label="Distance"  value={fmt.miles(load.distanceMiles)} />
        </Card>

        {load.status === 'in_transit' && (
          <View style={{ marginHorizontal: 16, marginTop: 4 }}>
            <Button
              title="📸  Submit Proof of Delivery"
              onPress={handleMarkDelivered}
            />
          </View>
        )}

        {load.status === 'booked' && (
          <Card>
            <Text style={styles.bookedNote}>
              ✅ Load booked! Head to the pickup location and start your trip. GPS tracking will begin automatically.
            </Text>
          </Card>
        )}

        <TouchableOpacity
          style={styles.detailLink}
          onPress={() => navigation.navigate('LoadDetail', { loadId: load.id })}
        >
          <Text style={styles.detailLinkText}>View Full Load Details →</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function Info({ label, value }) {
  if (!value) return null;
  return (
    <View style={styles.info}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.bg },
  map:          { height: 260 },
  panel:        { flex: 1 },
  noLoad:       { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  noLoadIcon:   { fontSize: 64, marginBottom: 12 },
  noLoadTitle:  { fontSize: 22, fontWeight: '800', color: Colors.text, marginBottom: 8 },
  noLoadSub:    { fontSize: 15, color: Colors.muted, textAlign: 'center', lineHeight: 22 },
  row:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  route:        { fontSize: 16, fontWeight: '700', color: Colors.text, flex: 1, marginRight: 8 },
  info:         { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.border },
  infoLabel:    { fontSize: 14, color: Colors.muted },
  infoValue:    { fontSize: 14, fontWeight: '600', color: Colors.text },
  bookedNote:   { fontSize: 14, color: Colors.success, lineHeight: 20 },
  detailLink:   { alignItems: 'center', marginTop: 12 },
  detailLinkText:{ color: Colors.primary, fontWeight: '600', fontSize: 14 },
});
