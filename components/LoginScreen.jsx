import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { Redirect } from "expo-router";
import { Action, Card, colors, styles } from "./Screen";
import { useSession } from "./Session";

export function LoginScreen() {
  const { session, signIn } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setBusy(true);
    setError("");
    try {
      await signIn(email.trim(), password);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }

  if (session) return <Redirect href="/(tabs)" />;

  return (
    <KeyboardAvoidingView
      style={styles.safe}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.eyebrow}>PET FEEDER</Text>
        <Image
          source={require("../assets/imagen_gatos.png")}
          style={{ width: "100%", height: 185 }}
          contentFit="contain"
        />
        <Text accessibilityRole="header" style={styles.title}>
          Bienvenido
        </Text>
        <Text style={styles.body}>
          Consulta a tus mascotas y organiza los horarios de su comedero.
        </Text>
        <Card>
          <Text style={styles.label}>Correo electrónico</Text>
          <TextInput
            style={styles.input}
            accessibilityLabel="Correo electrónico"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="nombre@correo.com"
            placeholderTextColor={colors.muted}
          />
          <Text style={styles.label}>Contraseña</Text>
          <TextInput
            style={styles.input}
            accessibilityLabel="Contraseña"
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
            autoComplete="current-password"
            secureTextEntry
            placeholder="Tu contraseña"
            placeholderTextColor={colors.muted}
          />
          {!!error && (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          )}
          <Action
            label={busy ? "Ingresando…" : "Ingresar"}
            onPress={submit}
            disabled={busy || !email.trim() || !password}
          />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
