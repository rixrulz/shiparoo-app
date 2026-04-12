import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, Alert,
} from 'react-native';
import { loads as loadsApi } from '../../services/api';
import { Card, Badge, Colors, fmt, Spinner, ErrorBanner, Empty, Button } from '../../components/UI';

const FILTERS = ['all', 'draft', 'posted', 'bidding', 'awarded', 'booked', 'in_transit', 'delivered', 'completed'];

export default function MyLoadsScreen({ navigation }) {
  const [items,      setItems]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState(null);
  const [filter,     setFilter]     = useState('all');

  const fetchLoads = useCallback(async () => {
    try {
      setError(null);
      const params = filter !== 'all' ? { status: filter } : {};
      const data = await loadsApi.mine(params);
      setItems(data.loads ?? data ?? []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => { fetchLoads(); }, [fetchLoads]);

  // Re-fetch when returning to this screen
  useEffect(() => {
    const unsub = navigation.addListener('focus', fetchLoads);
    return unsub;
  }, [navigation, fetchLoads]);

  const onRefresh = () => { setRefreshing(true); fetchLoads(); };

  const handlePublish = (load) => {
    Alert.alert(
      'Publish Load',
      'Make this load visible to carriers on the Load Board?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Publish',
          onPress: async () => {
            try {
              await loadsApi.publish(load.id);
              fetchLoads();
            } catch (e) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ],
    );
  };

  const handleCancel = (load) => {
    Alert.alert(
      'Cancel Load',
      'Are you sure? This cannot be undone.',
      [
        { text: 'Keep Load', style: 'cancel' },
        {
          text: 'Cancel Load', style: 'destructive',
          onPress: async () => {
            try {
              await loadsApi.cancel(load.id);
              fetchLoads();
            } catch (e) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ],
    );
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => navigation.navigate('LoadDetail', { loadId: item.id })}
    >
      <Card>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.ref}>{item.referenceNumber}</Text>
            <Text style={styles.route}>{fmt.route(item)}</Text>
          </View>
          <Badge status={item.status} />
        </View>

        <View style={styles.meta}>
          <MetaItem label="Pickup"    value={fmt.date(item.pickupDate)} />
          <MetaItem label="Delivery"  value={fmt.date(item.deliveryDate)} />
          <MetaItem label="Weight"    value={fmt.weight(item.weight)} />
          <MetaItem label="Rate"      value={fmt.dollars(item.offeredRateCents)} />
        </View>

        {/* Bid count for posted/bidding loads */}
        {['posted', 'bidding'].includes(item.status) && (
          <TouchableOpacity
            style={styles.bidsRow}
            onPress={() => navigation.navigate('LoadBids', { loadId: item.id })}
          >
            <Text style={styles.bidsText}>
              {item.bidCount ?? 0} bid{item.bidCount !== 1 ? 's' : ''} — tap to review →
            </Text>
          </TouchableOpacity>
        )}

        {/* Action buttons */}
        <View style={styles.actions}>
          {item.status === 'draft' && (
            <>
              <Button
                title="Edit"
                variant="ghost"
                onPress={() => navigation.navigate('PostLoad', { loadId: item.id })}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title="Publish"
                onPress={() => handlePublish(item)}
                style={{ flex: 1 }}
              />
            </>
          )}
          {['posted', 'bidding'].includes(item.status) && (
            <>
              <Button
                title="View Bids"
                onPress={() => navigation.navigate('LoadBids', { loadId: item.id })}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title="Cancel"
                variant="danger"
                onPress={() => handleCancel(item)}
                style={{ flex: 1 }}
              />
            </>
          )}
          {item.status === 'delivered' && (
            <Button
              title="Review POD"
              onPress={() => navigation.navigate('PODReview', { loadId: item.id })}
            />
          )}
        </View>
      </Card>
    </TouchableOpacity>
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
              {item === 'all' ? 'All' : item.replace(/_/g, ' ')}
            </Text>
          </TouchableOpacity>
        )}
      />

      <ErrorBanner message={error} onRetry={fetchLoads} />

      <FlatList
        data={items}
        keyExtractor={i => i.id}
        renderItem={renderItem}
        contentContainerStyle={items.length === 0 ? { flex: 1 } : { paddingBottom: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        ListHeaderComponent={
          <View style={styles.postRow}>
            <Button title="+ Post a Load" onPress={() => navigation.navigate('Post')} />
          </View>
        }
        ListEmptyComponent={
          <Empty icon="📦" title="No loads yet" subtitle="Post your first load to start receiving bids from carriers." />
        }
      />
    </View>
  );
}

function MetaItem({ label, value }) {
  if (!value) return null;
  return (
    <View style={styles.metaItem}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: Colors.bg },
  postRow:        { padding: 16, paddingBottom: 4 },
  chips:          { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  chip:           { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  chipActive:     { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText:       { fontSize: 12, fontWeight: '600', color: Colors.muted },
  chipTextActive: { color: '#fff' },
  header:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  ref:            { fontSize: 11, color: Colors.muted, fontWeight: '600', marginBottom: 2 },
  route:          { fontSize: 15, fontWeight: '700', color: Colors.text },
  meta:           { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 10 },
  metaItem:       { minWidth: '45%' },
  metaLabel:      { fontSize: 11, color: Colors.muted, fontWeight: '600', textTransform: 'uppercase' },
  metaValue:      { fontSize: 14, fontWeight: '600', color: Colors.text, marginTop: 2 },
  bidsRow:        { backgroundColor: Colors.badge, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 10 },
  bidsText:       { color: Colors.badgeText, fontSize: 13, fontWeight: '600' },
  actions:        { flexDirection: 'row', marginTop: 4 },
});
