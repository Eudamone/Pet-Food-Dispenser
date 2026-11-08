import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Action, Card, colors, Screen, styles } from "../../components/Screen";
import { useSession } from "../../components/Session";

const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function positiveGrams(input) {
  const text = input.trim().replace(",", ".");
  const value = Number(text);
  return /^\d+(\.\d+)?$/.test(text) && Number.isFinite(value) && value > 0
    ? value
    : null;
}

function PlanEditor({ device }) {
  const { request } = useSession();
  const path = "/feeders/" + device.id + "/plan";
  const [revision, setRevision] = useState(null);
  const [dailyMax, setDailyMax] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [slots, setSlots] = useState([]);
  const [attempt, setAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const nextKey = useRef(0);

  function showPlan(response) {
    setRevision({
      desired: response.desiredRevision,
      applied: response.appliedRevision,
      hasPlan: response.plan !== null,
    });
    setDailyMax(
      response.plan ? String(response.plan.maxDailyDispensedGrams) : "",
    );
    setEnabled(response.plan?.enabled ?? false);
    setSlots(
      (response.plan?.slots ?? []).map((slot) => ({
        ...slot,
        key: slot.id ?? "slot-" + nextKey.current++,
        targetGrams: String(slot.targetGrams),
      })),
    );
  }

  useEffect(() => {
    let active = true;
    request(path)
      .then((response) => {
        if (active) showPlan(response);
      })
      .catch((failure) => {
        if (active) setError(failure.message);
      });
    return () => {
      active = false;
    };
  }, [request, path, attempt]);

  function reload() {
    setRevision(null);
    setError("");
    setNotice("");
    setAttempt((current) => current + 1);
  }

  function changeSlot(key, values) {
    setNotice("");
    setSlots((current) =>
      current.map((slot) => (slot.key === key ? { ...slot, ...values } : slot)),
    );
  }

  function removeSlot(key) {
    const remaining = slots.filter((slot) => slot.key !== key);
    setSlots(remaining);
    if (!remaining.some((slot) => slot.enabled)) setEnabled(false);
    setNotice("");
  }

  async function save() {
    setError("");
    setNotice("");
    const maxDailyDispensedGrams = positiveGrams(dailyMax);
    if (maxDailyDispensedGrams === null) {
      setError("Ingresa un máximo diario de suministro mayor que cero.");
      return;
    }
    if (enabled && !slots.some((slot) => slot.enabled)) {
      setError("Activa al menos un horario para habilitar el plan.");
      return;
    }

    const occupied = new Set();
    const schedule = [];
    for (const slot of slots) {
      const targetGrams = positiveGrams(slot.targetGrams);
      if (
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(slot.time) ||
        !slot.days.length ||
        targetGrams === null ||
        targetGrams > device.maxBowlGrams
      ) {
        setError("Revisa la hora, los días y el objetivo de cada horario.");
        return;
      }
      if (slot.enabled) {
        for (const day of slot.days) {
          const key = day + "/" + slot.time;
          if (occupied.has(key)) {
            setError("Dos horarios activos coinciden el mismo día y hora.");
            return;
          }
          occupied.add(key);
        }
      }
      schedule.push({
        id: slot.id,
        time: slot.time,
        days: slot.days,
        enabled: slot.enabled,
        targetGrams,
      });
    }

    setSaving(true);
    try {
      const response = await request(path, {
        method: "PUT",
        body: {
          expectedRevision: revision.desired,
          maxDailyDispensedGrams,
          enabled,
          slots: schedule,
        },
      });
      showPlan(response);
      setNotice("Plan guardado. Pendiente de confirmación del alimentador.");
    } catch (failure) {
      setError(failure.message);
    } finally {
      setSaving(false);
    }
  }

  if (!revision)
    return (
      <Card>
        <Text
          accessibilityRole={error ? "alert" : undefined}
          style={error ? styles.error : styles.body}
        >
          {error || "Cargando el plan…"}
        </Text>
        {error && (
          <Action label="Volver a intentar" onPress={reload} secondary />
        )}
      </Card>
    );

  return (
    <>
      <Card>
        <Text style={styles.heading}>Plan del alimentador</Text>
        <Text style={styles.body}>
          {!revision.hasPlan
            ? "Todavía sin plan guardado"
            : revision.desired > revision.applied
              ? "Pendiente de aplicación"
              : "Última revisión confirmada"}
        </Text>
        <Text style={styles.body}>
          Guardada {revision.desired} · confirmada {revision.applied}
        </Text>
        <Text style={styles.label}>Máximo de comida nueva por día (g)</Text>
        <TextInput
          style={styles.input}
          accessibilityLabel="Máximo diario del alimentador"
          keyboardType="decimal-pad"
          value={dailyMax}
          editable={!saving}
          maxLength={12}
          onChangeText={(value) => {
            setDailyMax(value);
            setNotice("");
          }}
        />
        <View style={local.row}>
          <Text style={styles.label}>Plan automático activo</Text>
          <Switch
            value={enabled}
            disabled={saving}
            accessibilityLabel="Plan automático activo"
            onValueChange={(value) => {
              setEnabled(value);
              setNotice("");
            }}
          />
        </View>
      </Card>
      <Text style={styles.heading}>Horarios</Text>
      <Text style={styles.body}>
        El objetivo es el peso total que debe quedar en el plato. Capacidad{" "}
        {device.maxBowlGrams} g.
      </Text>
      {slots.map((slot, index) => (
        <Card key={slot.key}>
          <View style={local.row}>
            <Text style={styles.heading}>Horario {index + 1}</Text>
            <Switch
              value={slot.enabled}
              disabled={saving}
              accessibilityLabel={"Activar horario " + (index + 1)}
              onValueChange={(value) =>
                changeSlot(slot.key, { enabled: value })
              }
            />
          </View>
          <Text style={styles.label}>Hora (HH:mm)</Text>
          <TextInput
            style={styles.input}
            accessibilityLabel={"Hora del horario " + (index + 1)}
            placeholder="07:00"
            placeholderTextColor={colors.muted}
            value={slot.time}
            maxLength={5}
            editable={!saving}
            onChangeText={(time) => changeSlot(slot.key, { time })}
          />
          <View style={local.days}>
            {days.map((label, day) => {
              const selected = slot.days.includes(day);
              return (
                <Pressable
                  key={label}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected, disabled: saving }}
                  accessibilityLabel={label + " del horario " + (index + 1)}
                  disabled={saving}
                  style={[local.day, selected && local.selected]}
                  onPress={() =>
                    changeSlot(slot.key, {
                      days: selected
                        ? slot.days.filter((item) => item !== day)
                        : [...slot.days, day],
                    })
                  }
                >
                  <Text
                    style={[styles.label, selected && { color: colors.card }]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.label}>Objetivo del plato (g)</Text>
          <TextInput
            style={styles.input}
            accessibilityLabel={"Objetivo del horario " + (index + 1)}
            keyboardType="decimal-pad"
            value={slot.targetGrams}
            maxLength={12}
            editable={!saving}
            onChangeText={(targetGrams) =>
              changeSlot(slot.key, { targetGrams })
            }
          />
          <Action
            label="Quitar horario"
            onPress={() => removeSlot(slot.key)}
            disabled={saving}
            secondary
          />
        </Card>
      ))}
      <Action
        label="Añadir horario"
        onPress={() => {
          const key = "slot-" + nextKey.current++;
          setNotice("");
          setSlots((current) => [
            ...current,
            { key, time: "", days: [], targetGrams: "", enabled: true },
          ]);
        }}
        disabled={saving || slots.length >= 100}
        secondary
      />
      {error && (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      )}
      {notice && (
        <Text accessibilityLiveRegion="polite" style={styles.body}>
          {notice}
        </Text>
      )}
      <Action
        label={saving ? "Guardando…" : "Guardar plan"}
        onPress={save}
        disabled={saving}
      />
      <Action
        label="Recargar plan guardado"
        onPress={reload}
        disabled={saving}
        secondary
      />
    </>
  );
}

export default function Configuration() {
  const { request } = useSession();
  const [feeders, setFeeders] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    request("/feeders")
      .then((devices) => {
        if (!active) return;
        setFeeders(devices);
        setSelectedId(devices[0]?.id ?? null);
      })
      .catch((failure) => {
        if (active) setError(failure.message);
      });
    return () => {
      active = false;
    };
  }, [request, attempt]);

  const device = feeders?.find((item) => item.id === selectedId);

  return (
    <Screen title="Horarios" eyebrow="ALIMENTACIÓN">
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
      ) : !feeders ? (
        <Text style={styles.body}>Cargando alimentadores…</Text>
      ) : feeders.length === 0 ? (
        <Card>
          <Text style={styles.body}>
            Vincula un alimentador para crear su plan.
          </Text>
        </Card>
      ) : (
        <>
          <Text style={styles.label}>Alimentador</Text>
          {feeders.map((item) => (
            <Action
              key={item.id}
              label={item.name}
              onPress={() => setSelectedId(item.id)}
              secondary={item.id !== selectedId}
            />
          ))}
          {device && <PlanEditor key={device.id} device={device} />}
        </>
      )}
    </Screen>
  );
}

const local = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  days: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  day: {
    minWidth: 42,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.line,
  },
  selected: { backgroundColor: colors.ink, borderColor: colors.ink },
});
