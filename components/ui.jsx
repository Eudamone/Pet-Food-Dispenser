import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export const colors = {
  cream: '#FFF9E7',
  brown: '#390F08',
  orange: '#F47C20',
  yellow: '#FFC93C',
  purple: '#7737AC',
  muted: '#76645B',
  line: '#E6D8C3',
  white: '#FFFFFF',
  red: '#B02C2C',
  green: '#286C42',
};
export function Button({ title, onPress, disabled, secondary, danger, small }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.secondary,
        danger && styles.danger,
        small && styles.small,
        (disabled || pressed) && styles.dim,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          secondary && { color: colors.brown },
          small && { fontSize: 12 },
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export function Field({ label, ...props }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor="#9B8B7E"
        style={styles.input}
        autoCorrect={false}
        {...props}
      />
    </View>
  );
}
export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}
export function Title({ children }) {
  return <Text style={styles.title}>{children}</Text>;
}
export function Copy({ children, style }) {
  return <Text style={[styles.copy, style]}>{children}</Text>;
}
export function ErrorMessage({ message }) {
  return message ? (
    <Text accessibilityRole="alert" style={styles.error}>
      {message}
    </Text>
  ) : null;
}
export function Loading() {
  return (
    <ActivityIndicator
      size="large"
      color={colors.purple}
      style={{ padding: 30 }}
    />
  );
}
export function Row({ children }) {
  return <View style={styles.row}>{children}</View>;
}
export function Choice({ title, selected, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.choice, selected && styles.selected]}
    >
      <Text
        style={{
          color: selected ? colors.white : colors.brown,
          fontWeight: '600',
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export function useAction() {
  const running = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  async function run(action, success = '') {
    if (running.current) return false;
    running.current = true;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await action();
      setMessage(success);
      return true;
    } catch (problem) {
      setError(problem.message || 'No se pudo completar la operación.');
      return false;
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  return { busy, error, message, run, setError };
}
export function Feedback({ action }) {
  return (
    <>
      <ErrorMessage message={action.error} />
      {action.message ? (
        <Copy style={{ color: colors.green }}>{action.message}</Copy>
      ) : null}
    </>
  );
}
export function positiveNumber(value, label) {
  const n = Number(value.replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0)
    throw new Error(`${label} debe ser mayor que cero.`);
  return n;
}
export function dateLabel(value) {
  return value ? new Date(value).toLocaleString('es-CO') : 'Sin registro';
}
export function confirmDelete(title, action) {
  if (Platform.OS === 'web') {
    if (window.confirm(title)) action();
    return;
  }
  Alert.alert(title, 'Esta acción no se puede deshacer.', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Eliminar', style: 'destructive', onPress: action },
  ]);
}
export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.cream },
  content: { padding: 20, paddingBottom: 35, gap: 16 },
  title: {
    fontFamily: 'titan-one',
    fontSize: 26,
    color: colors.brown,
    marginBottom: 10,
  },
  heading: {
    fontFamily: 'titan-one',
    fontSize: 18,
    color: colors.brown,
    marginBottom: 8,
  },
  copy: { fontSize: 14, lineHeight: 21, color: colors.muted, marginBottom: 8 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 8,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  field: { marginBottom: 8, flexGrow: 1 },
  label: {
    color: colors.brown,
    fontWeight: '600',
    marginBottom: 6,
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.brown,
    borderRadius: 12,
    backgroundColor: '#FFFDF7',
    paddingHorizontal: 13,
    minHeight: 48,
    fontSize: 16,
  },
  button: {
    backgroundColor: colors.brown,
    borderRadius: 14,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  buttonText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  secondary: { backgroundColor: colors.yellow },
  danger: { backgroundColor: colors.red },
  small: { paddingVertical: 10, paddingHorizontal: 5 },
  dim: { opacity: 0.5 },
  choice: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  selected: { backgroundColor: colors.purple, borderColor: colors.purple },
  error: {
    color: colors.red,
    fontSize: 14,
    lineHeight: 21,
    paddingVertical: 8,
  },
});
