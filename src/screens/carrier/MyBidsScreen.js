import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, Alert, Modal, TextInput,
} from 'react-native';
import { bids as bidsApi } from '../../services/api';
import { Card, Badge, Colors, fmt, Spinner, ErrorBanner, Empty, Button, Divider } from '../../components/UI';

const FILTERS = ['all', 'pending', 'accepted', 'rejected', 'withdrawn'];

export default function MyBidsScreen({ navigation }) {
  const [items,      setItems]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState(null);
  const [filter,     setFilter]     = useState('all');
  const [revising,   setRevising]   = useState(null); // bid object
  const [newAmount,  setNewAmount]  = useState('');

  const fetchBids = useCallback(async () => {
    try {
      setError(null);
      const params = filter !== 'all' ? { status: filter } : {};
      const data = await bidsApi.mine(params);
      setItems(data.bids ?? data ?? []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => { fetchBids(); }, [fetchBids]);

  const onRefresh = () => { setRefreshing(true); fetchBids(); };

  const handleWithdraw = (bid) => {
    Alert.alert(
      'Withdraw Bid',
      'Are you sure you want to withdraw this bid?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Withdraw', style: 'destructive',
          onPress: async () => {
            try {
              await bidsApi.withdraw(bid.id);
              fetchBids();
            } catch (e) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ],
    );
  };

  const handleRevise = async () => {
    if (!newAmount || isNaN(parseFloat(newAmount))) {
      Alert.alert('Error', 'Enter a valid dollar amount.');
      return;
    }
    try {
      await bidsApi.place({
        loadId:     revising.loadId,
        amountCents: Math.round(parseFloat(newAmount) * 100),
        notes:      revising.notes,
      });
      setRevising(null);
      setNewAmount('');
      fetchBids();
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  const renderItem = ({ item }) => (
    <Card>
      <TouchableOpacity onPress={() => navigation.navigate('LoadDetail', { loadId: item.loadId })}>
        <Text style={styles.route}>{fmt.route(item.load)}</Text>
        <Text style={styles.loadDate}>{fmt.date(item.load?.pickupDate)}</Text>
      </TouchableOpacity>

      <Divider />

      <View style={styles.row}>
        <View>
          <Text style={styles.label}>Your Bid</Text>
          <Text style={styles.amount}>{fmt.dollars(item.amountCents)}</Text>
        </View>
        <Badge status={item.status} />
      </View>

      {item.notes ? <Text style={styles.notes}>"{item.notes}"</Text> : null}

      {item.status === 'pending' && (
        <View style={styles.actions}>
          <Button
            title="Revise"
            variant="ghost"
            onPress={() => { setRevising(item); setNewAmount(String((item.amountCents / 100).toFixed(0))); }}
            style={{ flex: 1, marginRight: 8 }}
          />
          <Button
            title="Withdraw"
            variant="danger"
            onPress={() => handleWithdraw(item)}
            style={{ flex: 1 }}
          />
        </View>
      )}

      {item.status === 'accepted' && (
        <View style={styles.actions}>
          <Button
            title="View Load"
            onPress={() => navigation.navigate('LoadDetail', { loadId: item.loadId })}
          />
        </View>
      )}
    </Card>
  );

  if (loading) return <Spinner />;

  return (
    <View style={styles.container}>
      {/* Filter chips */}
      <FlatList
        data={FILTERS}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={i => i}
        contentContainerStyle={styles.chips}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.chip, filter === item && styles.chipActive]}
            onPress={() => setFilter(item)}
          >
            <Text style={[styles.chipText, filter === item && styles.chipTextActive]}>
              {item.charAt(0).toUpperCase() + item.slice(1)}
            </Text>
          </TouchableOpacity>
        )}
      />

      <ErrorBanner message={error} onRetry={fetchBids} />

      <FlatList
        data={items}
        keyExtractor={i => i.id}
        renderItem={renderItem}
        contentContainerStyle={items.length === 0 ? { flex: 1 } : { paddingBottom: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        ListEmptyComponent={
          <Empty icon="🏷️" title="No bids yet" subtitle="Head to the Load Board to start bidding on freight." />
        }
      />

      {/* Revise modal */}
      <Modal visible={!!revising} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Revise Bid</Text>
            <Text style={styles.sheetSub}>{fmt.route(revising?.load)}</Text>
            <TextInput
              style={styles.amountInput}
              value={newAmount}
              onChangeText={setNewAmount}
              keyboardType="decimal-pad"
              placeholder="0"
              autoFocus
            />
            <Text style={styles.dollarLabel}>USD</Text>
            <Button title="Submit Revised Bid" onPress={handleRevise} style={{ marginTop: 16 }} />
            <Button title="Cancel" variant="ghost" onPress={() => setRevising(null)} style={{ marginTop: 10 }} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: Colors.bg },
  chips:          { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  chip:           { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  chipActive:     { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText:       { fontSize: 13, fontWeight: '600', color: Colors.muted },
  chipTextActive: { color: '#fff' },
  route:          { fontSize: 15, fontWeight: '700', color: Colors.text },
  loadDate:       { fontSize: 13, color: Colors.muted, marginTop: 2 },
  row:            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  label:          { fontSize: 11, color: Colors.muted, fontWeight: '600', textTransform: 'uppercase' },
  amount:         { fontSize: 22, fontWeight: '800', color: Colors.primary },
  notes:          { fontSize: 13, color: Colors.muted, fontStyle: 'italic', marginTop: 8 },
  actions:        { flexDirection: 'row', marginTop: 12 },
  overlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet:          { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, paddingBottom: 48 },
  sheetTitle:     { fontSize: 20, fontWeight: '800', color: Colors.text, marginBottom: 4 },
  sheetSub:       { fontSize: 14, color: Colors.muted, marginBottom: 20 },
  amountInput:    { fontSize: 48, fontWeight: '800', color: Colors.primary, textAlign: 'center', borderBottomWidth: 2, borderBottomColor: Colors.primary, paddingVertical: 8 },
  dollarLabel:    { textAlign: 'center', color: Colors.muted, fontSize: 14, marginTop: 4 },
});
