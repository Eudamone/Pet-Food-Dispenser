import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

const SessionContext = createContext(null);
const storageKey = 'petfeeder.session';
const defaultUrl =
  process.env.EXPO_PUBLIC_API_URL || 'http://192.168.40.82:3000';

export function normalizeUrl(value) {
  const url = value.trim().replace(/\/+$/, '');
  if (!/^https?:\/\/[^\s/]+(?::\d+)?(?:\/[^\s]*)?$/.test(url))
    throw new Error(
      'Escribe una dirección válida, por ejemplo http://192.168.1.10:3000.',
    );
  return url;
}

export async function callApi(
  baseUrl,
  path,
  { token, body, method = 'GET' } = {},
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const raw = await response.text();
    let data = null;
    if (raw) {
      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error(
          'El servidor respondió en un formato inesperado. Revisa su dirección.',
        );
      }
    }
    if (!response.ok) {
      const message = data?.message;
      const error = new Error(
        Array.isArray(message)
          ? message.join('\n')
          : message || 'No se pudo completar la solicitud.',
      );
      error.status = response.status;
      throw error;
    }
    return data;
  } catch (error) {
    if (
      error.name === 'AbortError' ||
      error.message === 'Network request failed' ||
      error.message === 'Failed to fetch'
    )
      throw new Error(
        'No se pudo conectar al servidor. Revisa la dirección, la red y que el servidor esté encendido.',
      );
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export function SessionProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState({
    baseUrl: defaultUrl,
    token: null,
    user: null,
  });
  useEffect(() => {
    AsyncStorage.getItem(storageKey)
      .then((saved) => {
        if (saved) setSession({ baseUrl: defaultUrl, ...JSON.parse(saved) });
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);
  const store = useCallback(async (next) => {
    await AsyncStorage.setItem(storageKey, JSON.stringify(next));
    setSession(next);
  }, []);
  const logout = useCallback(
    () => store({ ...session, token: null, user: null }),
    [session, store],
  );
  const request = useCallback(
    async (path, options) => {
      try {
        return await callApi(session.baseUrl, path, {
          ...options,
          token: session.token,
        });
      } catch (error) {
        if (error.status === 401 && session.token) await logout();
        throw error;
      }
    },
    [session.baseUrl, session.token, logout],
  );
  const authenticate = useCallback(
    async (register, values) => {
      const result = await callApi(
        session.baseUrl,
        register ? '/auth/register' : '/auth/login',
        { method: 'POST', body: values },
      );
      if (!result?.accessToken || !result?.user)
        throw new Error('El servidor no devolvió una sesión válida.');
      await store({ ...session, token: result.accessToken, user: result.user });
    },
    [session, store],
  );
  const setServer = useCallback(
    async (value) => {
      const baseUrl = normalizeUrl(value);
      await callApi(baseUrl, '/');
      await store({ baseUrl, token: null, user: null });
    },
    [store],
  );
  const updateUser = useCallback(
    async (user) => store({ ...session, user }),
    [session, store],
  );
  const value = useMemo(
    () => ({
      ...session,
      ready,
      request,
      authenticate,
      logout,
      setServer,
      updateUser,
    }),
    [session, ready, request, authenticate, logout, setServer, updateUser],
  );
  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
