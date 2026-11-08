import { createContext, useCallback, useContext, useState } from "react";

const SessionContext = createContext(null);
const apiUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
const authUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const authKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
async function fetchJson(url, options) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const message = Array.isArray(data?.message)
        ? data.message.join(". ")
        : data?.message;
      const error = new Error(message || "No se pudo completar la solicitud.");
      error.status = response.status;
      throw error;
    }
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

export function SessionProvider({ children }) {
  const [session, setSession] = useState(null);

  async function signIn(email, password) {
    if (!apiUrl || !authUrl || !authKey)
      throw new Error("La conexión a la cuenta aún no está configurada.");
    const data = await fetchJson(
      authUrl + "/auth/v1/token?grant_type=password",
      {
        method: "POST",
        headers: { apikey: authKey, "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      },
    );
    if (!data?.access_token || !data.user?.email)
      throw new Error("No se pudo iniciar sesión.");
    setSession({
      email: data.user.email,
      token: data.access_token,
    });
  }

  function signOut() {
    setSession(null);
  }

  const request = useCallback(
    async (path, { method = "GET", body } = {}) => {
      if (!session) throw new Error("Inicia sesión para continuar.");
      try {
        return await fetchJson(apiUrl + path, {
          method,
          headers: {
            Authorization: "Bearer " + session.token,
            "Content-Type": "application/json",
          },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
      } catch (error) {
        if (error.status === 401)
          setSession((active) => (active === session ? null : active));
        throw error;
      }
    },
    [session],
  );

  return (
    <SessionContext.Provider value={{ session, signIn, signOut, request }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  return useContext(SessionContext);
}
