import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, Alert, Modal, TextInput,
} from 'react-native';
import { loads as loadsApi, bids as bidsApi } from '../../services/api';
import { Card, Badge, Colors, fmt, Spinner, ErrorBanner, Empty, Button, Divider } from '../../components/UI';

export default function LoadBidsScreen({ route, navigation }) {
  const { loadId } = route.params;

  const [load,       setLoad]       = useState(null);
  const [bids,       setBids]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState(null);
  const [countering, setCountering] = useState(null);
  const [counterAmt, setCounterAmt] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [loadRes, bidsRes] = await Promise.all([
        loadsApi.get(loadId),
        loadsApi.bids(loadId),
      ]);
      setLoad(loadRes.load ?? loadRes);
      setBids(bidsRes.bids ?? bidsRes ?? []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const handleAward = (bid) => {
    Alert.alert(
      'Award Load',
      `Award this load to ${bid.carrier?.companyName ?? 'this carrier'} for ${fmt.dollars(bid.amountCents)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Award Load',
          onPress: async () => {
            try {
              await loadsApi.award(loadId, bid.id);
              fetchData();
              Alert.alert('Awarded! 🎉', 'The carrier has been notified. You can now book the load.');
            } catch (e) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ],
    );
  };

  const handleBook = async (bid) => {
    Alert.alert(
      'Book & Pay',
      `Book this load for ${fmt.dollars(bid.amountCents)}? Your card will be authorized (not charged until delivery is confirmed).`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Book Now',
          onPress: async () => {
            try {
              // In a full implementation, show a payment sheet for card collection
              await loadsApi.book(loadId, {
                paymentMethodId: 'pm_card_visa', // Replace with Stripe payment sheet result
              });
              fetchData();
              Alert.alert('Booked! 🎉', 'Your card has been authorized. The carrier can now pick up the load.');
            } catch (e) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ],
    );
  };

  const handleCounter = async () => {
    if (!counterAmt || isNaN(parseFloat(counterAmt))) {
      Alert.alert('Error', 'Enter a valid dollar amount.');
      return;
    }
    try {
      await bidsApi.counter(countering.id, {
        amountCents: Math.round(parseFloat(counterAmt) * 100),
      });
      setCountering(null);
      setCounterAmt('');
      fetchData();
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const renderBid = ({ item, index }) => {
    const isLowest = index === 0;
    return (
      <Card style={isLowest ? styles.lowestCard : undefined}>
        {isLowest && <Text style={styles.lowestLabel}>⭐ Lowest Bid</Text>}

        <View style={styles.bidHeader}>
          <View>
            <Text style={styles.carrierName}>{item.carrier?.companyName ?? 'Unknown Carrier'}</Text>
            <Text style={styles.mcNumber}>MC# {item.carrier?.mcNumber ?? '—'}</Text>
          </View>
          <View style={styles.bidRight}>
            <Text style={styles.bidAmount}>{fmt.dollars(item.amountCents)}</Text>
            <Badge status={item.status} />
          </View>
        </View>

        {item.notes ? <Text style={styles.notes}>"{item.notes}"</Text> : null}

        {item.counterAmount && (
          <View style={styles.counterRow}>
            <Text style={styles.counterLabel}>Counter offered: </Text>
            <Text style={styles.counterAmount}>{fmt.dollars(item.counterAmountCents)}</Text>
          </View>
        )}

        <Text style={styles.bidTime}>{fmt.dateTime(item.createdAt)}</Text>

        {/* Actions based on load status */}
        {load?.status === 'bidding' && item.status === 'pending' && (
          <View style={styles.actions}>
            <Button
              title="Counter"
              variant="ghost"
              onPress={() => { setCountering(item); setCounterAmt(String((item.amountCents / 100).toFixed(0))); }}
              style={{ flex: 1, marginRight: 8 }}
            />
            <Button
              title="Award"
              onPress={() => handleAward(item)}
              style={{ flex: 1 }}
            />
          </View>
        )}

        {load?.status === 'awarded' && item.status === 'accepted' && (
          <Button
            title="Book & Authorize Payment"
            onPress={() => handleBook(item)}
            style={{ marginTop: 10 }}
          />
        )}
      </Card>
    );
  };

  if (loading) return <Spinner />;

  // Sort by amount ascending
  const sorted = [...bids].sort((a, b) => a.amountCents - b.amountCents);

  return (
    <View style={styles.container}>
      {/* Load summary */}
      {load && (
        <Card style={styles.loadCard}>
          <View style={styles.loadHeader}>
            <Text style={styles.loadRoute}>{fmt.route(load)}</Text>
            <Badge status={load.status} />
          </View>
          <Text style={styles.loadMeta}>
            {fmt.date(load.pickupDate)} · {fmt.weight(load.weight)} · {fmt.dollars(load.offeredRateCents)} offered
          </Text>
        </Card>
      )}

      <ErrorBanner message={error} onRetry={fetchData} />

      {bids.length > 0 && (
        <Text style={styles.countLabel}>
          {bids.length} bid{bids.length !== 1 ? 's' : ''} received
        </Text>
      )}

      <FlatList
        data={sorted}
        keyExtractor={i => i.id}
        renderItem={renderBid}
        contentContainerStyle={sorted.length === 0 ? { flex: 1 } : { paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        ListEmptyComponent={
          <Empty
            icon="🏷️"
            title="No bids yet"
            subtitle="Carriers will start bidding once your load is posted."
          />
        }
      />

      {/* Counter offer modal */}
      <Modal visible={!!countering} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Counter Offer</Text>
            <Text style={styles.sheetSub}>
              Carrier bid: {fmt.dollars(countering?.amountCents)}
            </Text>
            <TextInput
              style={styles.amountInput}
              value={counterAmt}
              onChangeText={setCounterAmt}
              keyboardType="decimal-pad"
              placeholder="0"
              autoFocus
            />
            <Text style={styles.dollarLabel}>USD — Your counter offer</Text>
            <Button title="Send Counter Offer" onPress={handleCounter} style={{ marginTop: 16 }} />
            <Button title="Cancel" variant="ghost" onPress={() => setCountering(null)} style={{ marginTop: 10 }} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: Colors.bg },
  loadCard:      { marginBottom: 4 },
  loadHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  loadRoute:     { fontSize: 15, fontWeight: '700', color: Colors.text, flex: 1, marginRight: 8 },
  loadMeta:      { fontSize: 13, color: Colors.muted },
  countLabel:    { fontSize: 13, fontWeight: '600', color: Colors.muted, paddingHorizontal: 20, paddingBottom: 4 },
  lowestCard:    { borderWidth: 2, borderColor: Colors.primary },
  lowestLabel:   { fontSize: 12, fontWeight: '700', color: Colors.primary, marginBottom: 8 },
  bidHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  carrierName:   { fontSize: 15, fontWeight: '700', color: Colors.text },
  mcNumber:      { fontSize: 12, color: Colors.muted },
  bidRight:      { alignItems: 'flex-end', gap: 4 },
  bidAmount:     { fontSize: 22, fontWeight: '800', color: Colors.primary },
  notes:         { fontSize: 13, color: Colors.muted, fontStyle: 'italic', marginTop: 4 },
  counterRow:    { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  counterLabel:  { fontSize: 13, color: Colors.muted },
  counterAmount: { fontSize: 13, fontWeight: '700', color: Colors.warning },
  bidTime:       { fontSize: 12, color: Colors.muted, marginTop: 6 },
  actions:       { flexDirection: 'row', marginTop: 12 },
  overlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet:         { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, paddingBottom: 48 },
  sheetTitle:    { fontSize: 20, fontWeight: '800', color: Colors.text, marginBottom: 4 },
  sheetSub:      { fontSize: 14, color: Colors.muted, marginBottom: 20 },
  amountInput:   { fontSize: 48, fontWeight: '800', color: Colors.primary, textAlign: 'center', borderBottomWidth: 2, borderBottomColor: Colors.primary, paddingVertical: 8 },
  dollarLabel:   { textAlign: 'center', color: Colors.muted, fontSize: 14, marginTop: 4 },
});
