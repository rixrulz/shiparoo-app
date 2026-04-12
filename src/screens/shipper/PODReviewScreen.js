import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image,
  TouchableOpacity, Alert, TextInput, Modal,
} from 'react-native';
import { pod as podApi } from '../../services/api';
import { Card, Badge, Colors, fmt, Spinner, ErrorBanner, Button, Divider } from '../../components/UI';

export default function PODReviewScreen({ route, navigation }) {
  const { loadId } = route.params;

  const [podData,    setPodData]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [approving,  setApproving]  = useState(false);
  const [rejecting,  setRejecting]  = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [lightboxUri,setLightboxUri]= useState(null);

  const fetchPOD = useCallback(async () => {
    try {
      setError(null);
      const data = await podApi.get(loadId);
      setPodData(data.pod ?? data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [loadId]);

  useEffect(() => { fetchPOD(); }, [fetchPOD]);

  const handleApprove = () => {
    Alert.alert(
      'Approve Delivery',
      'Confirming delivery will release payment to the carrier. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve & Release Payment',
          onPress: async () => {
            setApproving(true);
            try {
              await podApi.approve(loadId);
              Alert.alert(
                'Payment Released! 💸',
                'Delivery approved. Payment has been released to the carrier.',
                [{ text: 'OK', onPress: () => navigation.goBack() }],
              );
            } catch (e) {
              Alert.alert('Error', e.message);
            } finally {
              setApproving(false);
            }
          },
        },
      ],
    );
  };

  const handleReject = async () => {
    if (!rejectNote.trim()) {
      Alert.alert('Required', 'Please describe why you are rejecting this POD.');
      return;
    }
    setRejecting(true);
    try {
      await podApi.reject(loadId, { reason: rejectNote.trim() });
      setShowReject(false);
      Alert.alert(
        'POD Rejected',
        'The carrier has been notified and can resubmit.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setRejecting(false);
    }
  };

  if (loading) return <Spinner />;
  if (!podData) {
    return (
      <View style={styles.center}>
        <ErrorBanner message={error} onRetry={fetchPOD} />
        <Text style={styles.noData}>No proof of delivery submitted yet.</Text>
      </View>
    );
  }

  const photos = podData.photos ?? [];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <ErrorBanner message={error} />

        {/* Status */}
        <Card>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>POD Status</Text>
            <Badge status={podData.status ?? 'pending'} />
          </View>
          <Divider />

          <InfoRow label="Submitted"      value={fmt.dateTime(podData.submittedAt)} />
          <InfoRow label="Recipient"      value={podData.recipientName} />
          <InfoRow label="Carrier Notes"  value={podData.notes} />
          {podData.deliveryLat && (
            <InfoRow
              label="GPS Location"
              value={`${podData.deliveryLat?.toFixed(4)}, ${podData.deliveryLon?.toFixed(4)}`}
            />
          )}
        </Card>

        {/* Photos */}
        {photos.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Delivery Photos ({photos.length})</Text>
            <View style={styles.photoGrid}>
              {photos.map((photo, i) => (
                <TouchableOpacity key={i} onPress={() => setLightboxUri(photo.url ?? photo)}>
                  <Image
                    source={{ uri: photo.url ?? photo }}
                    style={styles.photo}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Checklist */}
        <Card>
          <Text style={styles.checkTitle}>Verification Checklist</Text>
          <CheckItem label="Freight visible in photos" />
          <CheckItem label="Delivery location matches destination" />
          <CheckItem label="Recipient name recorded (if required)" />
          <CheckItem label="No visible damage to freight" />
        </Card>

        {/* Actions */}
        {podData.status === 'pending' && (
          <View style={styles.actionBlock}>
            <Button
              title={approving ? 'Processing…' : '✅  Approve & Release Payment'}
              onPress={handleApprove}
              loading={approving}
              style={{ marginBottom: 10 }}
            />
            <Button
              title="❌  Reject — Request Resubmission"
              variant="danger"
              onPress={() => setShowReject(true)}
              disabled={approving}
            />
          </View>
        )}

        {podData.status === 'approved' && (
          <Card style={styles.approvedCard}>
            <Text style={styles.approvedText}>✅ Payment released to carrier on {fmt.dateTime(podData.approvedAt)}</Text>
          </Card>
        )}

        {podData.status === 'rejected' && (
          <Card style={styles.rejectedCard}>
            <Text style={styles.rejectedText}>❌ Rejected — awaiting resubmission from carrier.</Text>
            {podData.rejectReason && <Text style={styles.rejectReason}>Reason: {podData.rejectReason}</Text>}
          </Card>
        )}
      </ScrollView>

      {/* Reject modal */}
      <Modal visible={showReject} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Reject POD</Text>
            <Text style={styles.sheetSub}>Describe the issue so the carrier can resubmit correctly.</Text>
            <TextInput
              style={styles.rejectInput}
              value={rejectNote}
              onChangeText={setRejectNote}
              placeholder="e.g. Photos too blurry, wrong location, missing signature…"
              multiline
              numberOfLines={4}
              autoFocus
            />
            <Button title={rejecting ? 'Rejecting…' : 'Reject & Notify Carrier'} variant="danger" onPress={handleReject} loading={rejecting} style={{ marginTop: 12 }} />
            <Button title="Cancel" variant="ghost" onPress={() => setShowReject(false)} style={{ marginTop: 10 }} />
          </View>
        </View>
      </Modal>

      {/* Lightbox */}
      <Modal visible={!!lightboxUri} transparent animationType="fade">
        <TouchableOpacity style={styles.lightbox} onPress={() => setLightboxUri(null)} activeOpacity={1}>
          <Image source={{ uri: lightboxUri }} style={styles.lightboxImg} resizeMode="contain" />
          <Text style={styles.lightboxClose}>Tap to close</Text>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function CheckItem({ label }) {
  return (
    <View style={styles.checkItem}>
      <Text style={styles.checkIcon}>☐</Text>
      <Text style={styles.checkLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: Colors.bg },
  scroll:        { paddingBottom: 48 },
  center:        { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' },
  noData:        { fontSize: 16, color: Colors.muted },
  statusRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusLabel:   { fontSize: 16, fontWeight: '700', color: Colors.text },
  infoRow:       { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  infoLabel:     { fontSize: 12, color: Colors.muted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue:     { fontSize: 14, color: Colors.text, marginTop: 2 },
  sectionTitle:  { fontSize: 15, fontWeight: '700', color: Colors.text, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 },
  photoGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, marginBottom: 12 },
  photo:         { width: 110, height: 110, borderRadius: 10 },
  checkTitle:    { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  checkItem:     { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 10 },
  checkIcon:     { fontSize: 18, color: Colors.muted },
  checkLabel:    { fontSize: 14, color: Colors.text },
  actionBlock:   { marginHorizontal: 16, marginTop: 8 },
  approvedCard:  { backgroundColor: '#d1fae5', borderColor: Colors.success, borderWidth: 1 },
  approvedText:  { color: '#065f46', fontWeight: '600', fontSize: 14 },
  rejectedCard:  { backgroundColor: '#fee2e2', borderColor: Colors.danger, borderWidth: 1 },
  rejectedText:  { color: Colors.danger, fontWeight: '600', fontSize: 14 },
  rejectReason:  { color: Colors.danger, fontSize: 13, marginTop: 6 },
  overlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet:         { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 28, paddingBottom: 48 },
  sheetTitle:    { fontSize: 20, fontWeight: '800', color: Colors.text, marginBottom: 4 },
  sheetSub:      { fontSize: 14, color: Colors.muted, marginBottom: 16 },
  rejectInput:   { backgroundColor: Colors.bg, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.border, padding: 12, fontSize: 14, color: Colors.text, minHeight: 100, textAlignVertical: 'top' },
  lightbox:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' },
  lightboxImg:   { width: '100%', height: '80%' },
  lightboxClose: { color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 16 },
});
