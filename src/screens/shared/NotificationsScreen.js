import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl,
} from 'react-native';
import { users as usersApi } from '../../services/api';
import { Colors, Spinner, ErrorBanner, Empty, fmt } from '../../components/UI';

const TYPE_ICON = {
  bid_placed:    '🏷️',
  bid_accepted:  '✅',
  bid_rejected:  '❌',
  load_awarded:  '🎉',
  load_booked:   '📋',
  pod_submitted: '📸',
  pod_approved:  '💸',
  pod_rejected:  '🔄',
  load_cancelled:'🚫',
  payment_held:  '💳',
  default:       '🔔',
};

export default function NotificationsScreen({ navigation }) {
  const [items,      setItems]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState(null);

  const fetchNotifs = useCallback(async () => {
    try {
      setError(null);
      const data = await usersApi.notifications();
      const list = data.notifications ?? data ?? [];
      setItems(list);
      // Mark all as read
      const unread = list.filter(n => !n.readAt).map(n => n.id);
      if (unread.length > 0) {
        await usersApi.markRead(unread).catch(() => {});
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchNotifs(); }, [fetchNotifs]);

  const onRefresh = () => { setRefreshing(true); fetchNotifs(); };

  const handlePress = (notif) => {
    if (!notif.data) return;
    const { loadId } = notif.data;
    if (loadId) {
      navigation.navigate('LoadDetail', { loadId });
    }
  };

  const renderItem = ({ item }) => {
    const icon    = TYPE_ICON[item.type] ?? TYPE_ICON.default;
    const isUnread = !item.readAt;
    return (
      <TouchableOpacity
        style={[styles.item, isUnread && styles.unread]}
        onPress={() => handlePress(item)}
        activeOpacity={0.8}
      >
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>{icon}</Text>
          {isUnread && <View style={styles.dot} />}
        </View>
        <View style={styles.body}>
          <Text style={[styles.title, isUnread && styles.titleUnread]}>{item.title}</Text>
          {item.body ? <Text style={styles.message}>{item.body}</Text> : null}
          <Text style={styles.time}>{fmt.dateTime(item.createdAt)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) return <Spinner />;

  return (
    <View style={styles.container}>
      <ErrorBanner message={error} onRetry={fetchNotifs} />
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        renderItem={renderItem}
        contentContainerStyle={items.length === 0 ? { flex: 1 } : undefined}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <Empty icon="🔔" title="All caught up!" subtitle="You'll see bid updates, delivery alerts, and payment notifications here." />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.bg },
  item:         { flexDirection: 'row', alignItems: 'flex-start', padding: 16, backgroundColor: Colors.card },
  unread:       { backgroundColor: '#eff6ff' },
  iconWrap:     { position: 'relative', width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  icon:         { fontSize: 22 },
  dot:          { position: 'absolute', top: 0, right: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary, borderWidth: 2, borderColor: Colors.card },
  body:         { flex: 1 },
  title:        { fontSize: 14, color: Colors.text, lineHeight: 20 },
  titleUnread:  { fontWeight: '700' },
  message:      { fontSize: 13, color: Colors.muted, lineHeight: 18, marginTop: 2 },
  time:         { fontSize: 12, color: Colors.muted, marginTop: 4 },
  separator:    { height: 1, backgroundColor: Colors.border },
});
