import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Link } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Action, Card, colors, Screen, styles } from "./Screen";
import { useSession } from "./Session";

export function Main() {
  const { request, session, signOut } = useSession();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.all([
      request("/feeders"),
      request("/pets"),
      request("/users/me").catch((error) => {
        if (error.status === 404) return null;
        throw error;
      }),
    ])
      .then(([feeders, pets, profile]) => {
        if (active) setData({ feeders, pets, profile });
      })
      .catch((failure) => {
        if (active) setError(failure.message);
      });
    return () => {
      active = false;
    };
  }, [request, attempt]);

  return (
    <Screen title="Mi comedero" eyebrow="INICIO">
      <StatusBar style="dark" />
      <Text style={styles.body}>
        Hola, {data?.profile?.name ?? session.email}.
      </Text>
      {error ? (
        <Card>
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
          <Action
            label="Volver a intentar"
            onPress={() => {
              setError("");
              setAttempt(attempt + 1);
            }}
            secondary
          />
        </Card>
      ) : !data ? (
        <Text style={styles.body}>Cargando tus datos…</Text>
      ) : (
        <>
          <Text style={styles.heading}>Alimentadores</Text>
          {data.feeders.length === 0 && (
            <Card>
              <Text style={styles.body}>
                Aún no tienes un alimentador vinculado.
              </Text>
            </Card>
          )}
          {data.feeders.map((device) => (
            <Card key={device.id}>
              <Text style={styles.heading}>{device.name}</Text>
              <Text
                style={{ color: colors.ink, fontSize: 28, fontWeight: "800" }}
              >
                {device.lastBowlGrams == null
                  ? "Sin lectura"
                  : device.lastBowlGrams + " g"}
              </Text>
              <Text style={styles.body}>
                Último peso registrado en el plato
              </Text>
              <Text style={styles.body}>
                {device.lastSeenAt
                  ? "Último contacto · " +
                    new Date(device.lastSeenAt).toLocaleString()
                  : "El equipo aún no ha reportado un contacto."}
              </Text>
            </Card>
          ))}
          <Link
            href="/(tabs)/configuration"
            style={[styles.label, { paddingVertical: 10 }]}
          >
            Gestionar horarios →
          </Link>
          <Text style={styles.heading}>Mascotas</Text>
          {data.pets.length === 0 && (
            <Card>
              <Text style={styles.body}>
                Aún no tienes mascotas registradas.
              </Text>
            </Card>
          )}
          {data.pets.map((pet) => (
            <Card key={pet.id}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <Text style={styles.heading}>{pet.name}</Text>
                <Text style={styles.body}>
                  {pet.dailyLimitGrams == null
                    ? "Sin máximo configurado"
                    : "Máximo diario · " + pet.dailyLimitGrams + " g"}
                </Text>
              </View>
            </Card>
          ))}
        </>
      )}
      <Action label="Cerrar sesión" onPress={signOut} secondary />
    </Screen>
  );
}
