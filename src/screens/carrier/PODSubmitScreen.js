import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { pod as podApi } from '../../services/api';
import { Button, Input, Colors, ErrorBanner } from '../../components/UI';

export default function PODSubmitScreen({ route, navigation }) {
  const { loadId } = route.params;

  const [photos,        setPhotos]        = useState([]);
  const [notes,         setNotes]         = useState('');
  const [recipient,     setRecipient]     = useState('');
  const [submitting,    setSubmitting]    = useState(false);
  const [error,         setError]         = useState(null);

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo access in Settings to upload delivery proof.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality:    0.85,
      allowsMultipleSelection: true,
    });
    if (!result.canceled) {
      const uris = result.assets.map(a => a.uri);
      setPhotos(prev => [...prev, ...uris].slice(0, 6));
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow camera access in Settings to take delivery photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.85 });
    if (!result.canceled) {
      setPhotos(prev => [...prev, result.assets[0].uri].slice(0, 6));
    }
  };

  const removePhoto = (uri) => {
    setPhotos(prev => prev.filter(p => p !== uri));
  };

  const handleSubmit = async () => {
    if (photos.length === 0) {
      Alert.alert('Photos required', 'Please add at least one delivery photo.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      let location = null;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          location = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        }
      } catch (_) {}

      await podApi.submit(loadId, {
        photos,
        notes:         notes.trim() || undefined,
        recipientName: recipient.trim() || undefined,
        location,
      });

      Alert.alert(
        'POD Submitted! 🎉',
        'Your proof of delivery has been sent to the shipper for review.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <ErrorBanner message={error} />

        {/* Photos section */}
        <Text style={styles.sectionLabel}>Delivery Photos *</Text>
        <Text style={styles.hint}>Take photos of the delivered freight, truck, and any signatures. Max 6 photos.</Text>

        <View style={styles.photoGrid}>
          {photos.map(uri => (
            <View key={uri} style={styles.photoWrap}>
              <Image source={{ uri }} style={styles.photo} />
              <TouchableOpacity style={styles.removeBtn} onPress={() => removePhoto(uri)}>
                <Text style={styles.removeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
          {photos.length < 6 && (
            <View style={styles.addPhotoRow}>
              <TouchableOpacity style={[styles.addPhoto, { marginRight: 8 }]} onPress={takePhoto}>
                <Text style={styles.addPhotoIcon}>📷</Text>
                <Text style={styles.addPhotoText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addPhoto} onPress={pickPhoto}>
                <Text style={styles.addPhotoIcon}>🖼️</Text>
                <Text style={styles.addPhotoText}>Library</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Recipient */}
        <Input
          label="Recipient Name (optional)"
          value={recipient}
          onChangeText={setRecipient}
          autoCapitalize="words"
          placeholder="Jane Smith"
        />

        {/* Notes */}
        <Input
          label="Delivery Notes (optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Left at dock 3, signed by manager…"
          multiline
          numberOfLines={4}
          style={{ minHeight: 90, textAlignVertical: 'top' }}
        />

        <Text style={styles.locationNote}>
          📍 Your GPS location will be recorded with this submission.
        </Text>

        <Button
          title={submitting ? 'Submitting…' : 'Submit Proof of Delivery'}
          onPress={handleSubmit}
          loading={submitting}
          style={{ marginTop: 8, marginBottom: 8 }}
        />

        <Button
          title="Cancel"
          variant="ghost"
          onPress={() => navigation.goBack()}
          disabled={submitting}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const PHOTO_SIZE = 100;

const styles = StyleSheet.create({
  flex:          { flex: 1, backgroundColor: Colors.bg },
  container:     { padding: 20, paddingBottom: 48 },
  sectionLabel:  { fontSize: 13, fontWeight: '700', color: Colors.text, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  hint:          { fontSize: 13, color: Colors.muted, lineHeight: 18, marginBottom: 16 },
  photoGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  photoWrap:     { position: 'relative', width: PHOTO_SIZE, height: PHOTO_SIZE },
  photo:         { width: PHOTO_SIZE, height: PHOTO_SIZE, borderRadius: 10 },
  removeBtn:     { position: 'absolute', top: -6, right: -6, backgroundColor: Colors.danger, borderRadius: 10, width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  removeBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  addPhotoRow:   { flexDirection: 'row' },
  addPhoto:      { width: PHOTO_SIZE, height: PHOTO_SIZE, borderRadius: 10, borderWidth: 2, borderColor: Colors.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.card },
  addPhotoIcon:  { fontSize: 26, marginBottom: 4 },
  addPhotoText:  { fontSize: 12, color: Colors.muted, fontWeight: '600' },
  locationNote:  { fontSize: 13, color: Colors.muted, marginBottom: 16, lineHeight: 18 },
});
