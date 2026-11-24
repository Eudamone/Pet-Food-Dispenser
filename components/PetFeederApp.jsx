import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AppState,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useSession } from './Session';
import { AuthScreen, Settings } from './account';
import { Dashboard } from './dashboard';
import { Pets } from './pets';
import { Schedules, History } from './feeding';
import {
  Button,
  Choice,
  Copy,
  ErrorMessage,
  Loading,
  Row,
  colors,
  styles,
} from './ui';

const tabs = ['Inicio', 'Mascotas', 'Horarios', 'Historial', 'Ajustes'];

function ConnectedApp() {
  const session = useSession();
  const { request } = session;
  const [tab, setTab] = useState('Inicio');
  const [selectedId, setSelectedId] = useState(null);
  const [data, setData] = useState({
    pets: [],
    feeders: [],
    tags: [],
    plan: null,
    access: [],
    dispensing: [],
    revision: 0,
    detailsId: null,
  });
  const [pending, setPending] = useState([]);
  const pendingKey = `petfeeder.pending.${session.baseUrl}.${session.user.id}`;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const busy = useRef(false);
  const version = useRef(0);
  useEffect(() => {
    AsyncStorage.getItem(pendingKey)
      .then((value) => {
        setPending(value ? JSON.parse(value) : []);
      })
      .catch(() => {});
  }, [pendingKey]);
  const rememberRequest = useCallback(
    async (item) => {
      const current = JSON.parse(
        (await AsyncStorage.getItem(pendingKey)) || '[]',
      );
      const next = [
        ...current.filter((entry) => entry.requestId !== item.requestId),
        item,
      ];
      await AsyncStorage.setItem(pendingKey, JSON.stringify(next));
      setPending(next);
    },
    [pendingKey],
  );
  const refresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    const current = version.current;
    try {
      const [pets, feeders, tags] = await Promise.all([
        request('/pets'),
        request('/feeders'),
        request('/rfid-tags'),
      ]);
      const validId =
        feeders.find((item) => item.id === selectedId)?.id ??
        feeders[0]?.id ??
        null;
      const details = validId
        ? await Promise.all([
            request(`/feeders/${validId}/plan`),
            request(`/feeders/${validId}/access`),
            request(`/feeders/${validId}/dispensing`),
          ])
        : null;
      if (current !== version.current) return;
      setData({
        pets,
        feeders,
        tags,
        plan: details?.[0]?.plan ?? null,
        revision: details?.[0]?.desiredRevision ?? 0,
        access: details?.[1] ?? [],
        dispensing: details?.[2] ?? [],
        detailsId: validId,
      });
      if (validId !== selectedId) setSelectedId(validId);
      setError('');
    } catch (problem) {
      if (current === version.current) setError(problem.message);
    } finally {
      busy.current = false;
      if (current === version.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [request, selectedId]);

  useEffect(() => {
    version.current += 1;
    busy.current = false;
    const initialLoad = setTimeout(refresh, 0);
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') refresh();
    }, 5000);
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      version.current += 1;
      clearTimeout(initialLoad);
      clearInterval(timer);
      listener.remove();
    };
  }, [refresh]);

  const feeder = data.feeders.find((item) => item.id === selectedId) ?? null;
  const props = {
    ...data,
    feeder,
    refresh,
    pending,
    rememberRequest,
    request: session.request,
  };
  return (
    <>
      <View style={{ padding: 18, paddingBottom: 8 }}>
        <Text
          style={{ fontFamily: 'titan-one', fontSize: 27, color: colors.brown }}
        >
          Pet Feeder
        </Text>
        <Copy>{session.user?.name}</Copy>
        {data.feeders.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {data.feeders.map((item) => (
              <Choice
                key={item.id}
                title={item.name}
                selected={selectedId === item.id}
                onPress={() => setSelectedId(item.id)}
              />
            ))}
          </ScrollView>
        ) : null}
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing && !loading}
            onRefresh={() => {
              setRefreshing(true);
              refresh();
            }}
            tintColor={colors.purple}
          />
        }
      >
        <ErrorMessage message={error} />
        {error ? (
          <Button title="Reintentar conexión" secondary onPress={refresh} />
        ) : null}
        {(loading || (selectedId && data.detailsId !== selectedId)) &&
        tab !== 'Ajustes' ? (
          <Loading />
        ) : (
          <>
            {tab === 'Inicio' ? (
              <Dashboard
                key={selectedId || 'discovery'}
                {...props}
                onSelect={setSelectedId}
                onTab={setTab}
              />
            ) : null}
            {tab === 'Mascotas' ? <Pets {...props} /> : null}
            {tab === 'Horarios' ? (
              <Schedules key={selectedId || 'empty'} {...props} />
            ) : null}
            {tab === 'Historial' ? <History {...props} /> : null}
            {tab === 'Ajustes' ? (
              <Settings key={selectedId || 'account'} {...props} />
            ) : null}
          </>
        )}
      </ScrollView>
      <View
        style={{
          borderTopWidth: 1,
          borderColor: colors.line,
          backgroundColor: colors.white,
          paddingVertical: 9,
          paddingHorizontal: 6,
        }}
      >
        <Row>
          {tabs.map((name) => (
            <View key={name} style={{ flex: 1 }}>
              <Button
                title={name}
                small
                secondary={tab === name}
                onPress={() => setTab(name)}
              />
            </View>
          ))}
        </Row>
      </View>
    </>
  );
}

export default function PetFeederApp() {
  const { ready, token, baseUrl, user } = useSession();
  return (
    <SafeAreaView style={styles.page} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {!ready ? (
          <Loading />
        ) : token ? (
          <ConnectedApp key={`${baseUrl}/${user.id}`} />
        ) : (
          <AuthScreen />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
