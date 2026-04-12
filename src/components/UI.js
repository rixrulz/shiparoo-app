/**
 * Shared UI primitives — keeps screens lean.
 */
import React from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator,
  StyleSheet, TextInput, Platform,
} from 'react-native';

// ── Brand colours ─────────────────────────────────────────────────────────────
export const Colors = {
  primary:    '#1a56db',
  primaryDark:'#1240a8',
  success:    '#0e9f6e',
  danger:     '#e02424',
  warning:    '#ff8800',
  bg:         '#f9fafb',
  card:       '#ffffff',
  border:     '#e5e7eb',
  text:       '#111827',
  muted:      '#6b7280',
  badge:      '#dbeafe',
  badgeText:  '#1e40af',
};

// ── Button ────────────────────────────────────────────────────────────────────
export function Button({ title, onPress, variant = 'primary', loading, disabled, style }) {
  const bg = variant === 'primary'  ? Colors.primary
           : variant === 'danger'   ? Colors.danger
           : variant === 'success'  ? Colors.success
           : '#e5e7eb';
  const fg = variant === 'ghost' ? Colors.text : '#fff';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.btn, { backgroundColor: bg, opacity: (disabled || loading) ? 0.6 : 1 }, style]}
    >
      {loading
        ? <ActivityIndicator color={fg} size="small" />
        : <Text style={[styles.btnText, { color: fg }]}>{title}</Text>}
    </TouchableOpacity>
  );
}

// ── Input ─────────────────────────────────────────────────────────────────────
export function Input({ label, error, style, ...props }) {
  return (
    <View style={{ marginBottom: 14 }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={Colors.muted}
        style={[styles.input, error && { borderColor: Colors.danger }, style]}
        {...props}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

// ── Badge ─────────────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  posted:     { bg: '#dbeafe', text: '#1e40af' },
  bidding:    { bg: '#fef3c7', text: '#92400e' },
  awarded:    { bg: '#d1fae5', text: '#065f46' },
  booked:     { bg: '#d1fae5', text: '#065f46' },
  in_transit: { bg: '#ede9fe', text: '#5b21b6' },
  delivered:  { bg: '#d1fae5', text: '#065f46' },
  completed:  { bg: '#d1fae5', text: '#065f46' },
  cancelled:  { bg: '#fee2e2', text: '#991b1b' },
  pending:    { bg: '#fef3c7', text: '#92400e' },
  accepted:   { bg: '#d1fae5', text: '#065f46' },
  rejected:   { bg: '#fee2e2', text: '#991b1b' },
  withdrawn:  { bg: '#f3f4f6', text: '#6b7280' },
  approved:   { bg: '#d1fae5', text: '#065f46' },
  available:  { bg: '#d1fae5', text: '#065f46' },
  draft:      { bg: '#f3f4f6', text: '#6b7280' },
};

export function Badge({ status }) {
  const c = STATUS_COLORS[status] ?? { bg: '#f3f4f6', text: '#6b7280' };
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.badgeText, { color: c.text }]}>
        {status?.replace(/_/g, ' ').toUpperCase()}
      </Text>
    </View>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
export function SectionHeader({ title, action, onAction }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action
        ? <TouchableOpacity onPress={onAction}>
            <Text style={styles.sectionAction}>{action}</Text>
          </TouchableOpacity>
        : null}
    </View>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
export function Empty({ icon = '📭', title, subtitle }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>{icon}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.emptySub}>{subtitle}</Text> : null}
    </View>
  );
}

// ── Loading spinner ───────────────────────────────────────────────────────────
export function Spinner({ color = Colors.primary }) {
  return (
    <View style={styles.spinner}>
      <ActivityIndicator size="large" color={color} />
    </View>
  );
}

// ── Error banner ──────────────────────────────────────────────────────────────
export function ErrorBanner({ message, onRetry }) {
  if (!message) return null;
  return (
    <View style={styles.errorBanner}>
      <Text style={styles.errorBannerText}>⚠ {message}</Text>
      {onRetry
        ? <TouchableOpacity onPress={onRetry}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
        : null}
    </View>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────────
export function Divider() {
  return <View style={styles.divider} />;
}

// ── Formatters ────────────────────────────────────────────────────────────────
export const fmt = {
  dollars: (cents) => cents != null ? `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0 })}` : '—',
  date:    (iso)   => iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—',
  dateTime:(iso)   => iso ? new Date(iso).toLocaleString('en-US',  { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—',
  weight:  (lbs)   => lbs ? `${lbs.toLocaleString()} lbs` : '—',
  miles:   (mi)    => mi  ? `${mi.toLocaleString()} mi` : '—',
  route:   (l)     => l   ? `${l.originCity}, ${l.originState} → ${l.destCity}, ${l.destState}` : '—',
};

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  btn:          { borderRadius: 10, paddingVertical: 13, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  btnText:      { fontWeight: '700', fontSize: 15, letterSpacing: 0.3 },
  label:        { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 5 },
  input:        { backgroundColor: Colors.card, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 13 : 10, fontSize: 15, color: Colors.text },
  errorText:    { color: Colors.danger, fontSize: 12, marginTop: 4 },
  card:         { backgroundColor: Colors.card, borderRadius: 14, padding: 16, marginHorizontal: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2 },
  badge:        { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText:    { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  sectionHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  sectionAction:{ fontSize: 14, color: Colors.primary, fontWeight: '600' },
  empty:        { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyIcon:    { fontSize: 48, marginBottom: 12 },
  emptyTitle:   { fontSize: 17, fontWeight: '700', color: Colors.text, textAlign: 'center', marginBottom: 6 },
  emptySub:     { fontSize: 14, color: Colors.muted, textAlign: 'center', lineHeight: 20 },
  spinner:      { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  errorBanner:  { backgroundColor: '#fee2e2', borderRadius: 10, padding: 12, marginHorizontal: 16, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  errorBannerText:{ color: Colors.danger, fontSize: 13, fontWeight: '500', flex: 1 },
  retryText:    { color: Colors.primary, fontWeight: '700', fontSize: 13, marginLeft: 8 },
  divider:      { height: 1, backgroundColor: Colors.border, marginVertical: 12 },
});
