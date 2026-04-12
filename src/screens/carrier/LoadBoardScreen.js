import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  RefreshControl, TextInput,
} from 'react-native';
import { loads as loadsApi } from '../../services/api';
import { Card, Badge, Colors, fmt, Spinner, ErrorBanner, Empty } from '../../components/UI';

const EQUIPMENT_TYPES = ['All', 'dry_van', 'flatbed', 'reefer', 'step_deck', 'lowboy'];

export default function LoadBoardScreen({ navigation }) {
  const [items,       setItems]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [error,       setError]       = useState(null);
  const [search,      setSearch]      = useState('');
  const [equipment,   setEquipment]   = useState('All');
  const [maxWeight,   setMaxWeight]   = useState('');

  const fetchLoads = useCallback(async () => {
    try {
      setError(null);
      const params = {};
      if (search.trim())           params.q         = search.trim();
      if (equipment !== 'All')     params.equipment = equipment;
      if (maxWeight.trim())        params.maxWeight = maxWeight.trim();
      const data = await loadsApi.board(params);
      setItems(data.loads ?? data ?? []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, equipment, maxWeight]);

  useEffect(() => { fetchLoads(); }, [fetchLoads]);

  const onRefresh = () => { setRefreshing(true); fetchLoads(); };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => navigation.navigate('LoadDetail', { loadId: item.id })}
    >
      <Card>
        <View style={styles.cardHeader}>
          <Text style={styles.route}>{fmt.route(item)}</Text>
          <Badge status={item.status} />
        </View>

        <View style={styles.meta}>
          <MetaItem icon="📅" value={fmt.date(item.pickupDate)} />
          <MetaItem icon="⚖️" value={fmt.weight(item.weight)} />
          <MetaItem icon="📦" value={item.equipmentType?.replace(/_/g, ' ')} />
          <MetaItem icon="📏" value={fmt.miles(item.distanceMiles)} />
        </View>

        <View style={styles.footer}>
          <View>
            <Text style={styles.rateLabel}>Rate</Text>
            <Text style={styles.rate}>{fmt.dollars(item.offeredRateCents)}</Text>
          </View>
          <View style={styles.cpm}>
            {item.distanceMiles && item.offeredRateCents
              ? <Text style={styles.cpmText}>
                  ${((item.offeredRateCents / 100) / item.distanceMiles).toFixed(2)}/mi
                </Text>
              : null}
            <Text style={styles.bidCount}>
              {item.bidCount ?? 0} bid{item.bidCount !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  if (loading) return <Spinner />;

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search city, state, or zip…"
          placeholderTextColor={Colors.muted}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={fetchLoads}
          returnKeyType="search"
        />
      </View>

      {/* Equipment filter chips */}
      <FlatList
        data={EQUIPMENT_TYPES}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={i => i}
        contentContainerStyle={styles.chips}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.chip, equipment === item && styles.chipActive]}
            onPress={() => setEquipment(item)}
          >
            <Text style={[styles.chipText, equipment === item && styles.chipTextActive]}>
              {item === 'All' ? 'All' : item.replace(/_/g, ' ')}
            </Text>
          </TouchableOpacity>
        )}
      />

      <ErrorBanner message={error} onRetry={fetchLoads} />

      <FlatList
        data={items}
        keyExtractor={i => i.id}
        renderItem={renderItem}
        contentContainerStyle={items.length === 0 ? styles.emptyContainer : { paddingBottom: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        ListEmptyComponent={
          <Empty icon="🔍" title="No loads found" subtitle="Try adjusting your filters or check back soon." />
        }
      />
    </View>
  );
}

function MetaItem({ icon, value }) {
  if (!value) return null;
  return (
    <View style={styles.metaItem}>
      <Text style={styles.metaIcon}>{icon}</Text>
      <Text style={styles.metaText}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: Colors.bg },
  searchRow:      { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: Colors.card, borderBottomWidth: 1, borderBottomColor: Colors.border },
  searchInput:    { backgroundColor: Colors.bg, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  chips:          { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  chip:           { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  chipActive:     { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText:       { fontSize: 13, fontWeight: '600', color: Colors.muted },
  chipTextActive: { color: '#fff' },
  cardHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  route:          { fontSize: 16, fontWeight: '700', color: Colors.text, flex: 1, marginRight: 8 },
  meta:           { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  metaItem:       { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaIcon:       { fontSize: 13 },
  metaText:       { fontSize: 13, color: Colors.muted },
  footer:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 10, marginTop: 4 },
  rateLabel:      { fontSize: 11, color: Colors.muted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  rate:           { fontSize: 22, fontWeight: '800', color: Colors.primary },
  cpm:            { alignItems: 'flex-end' },
  cpmText:        { fontSize: 13, color: Colors.muted },
  bidCount:       { fontSize: 13, color: Colors.muted },
  emptyContainer: { flex: 1 },
});
