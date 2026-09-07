import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type AdminAuth = {
  loading: boolean;
  authenticated: boolean;
  email: string;
  refresh: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<string>;
  recover: (email: string) => Promise<string>;
  updatePassword: (accessToken: string, password: string) => Promise<string>;
  signOut: () => Promise<void>;
};

const Context = createContext<AdminAuth | null>(null);

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/admin-auth${path}`, {
    credentials: "include",
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = response.status === 204 ? {} : await response.json();
  if (!response.ok) throw new Error(body.error ?? "Admin authentication failed.");
  return body as T;
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState({ loading: true, authenticated: false, email: "" });
  const refresh = async () => {
    try {
      const result = await request<{ authenticated: boolean; email?: string }>("/session");
      setState({ loading: false, authenticated: result.authenticated, email: result.email ?? "" });
    } catch {
      setState({ loading: false, authenticated: false, email: "" });
    }
  };
  useEffect(() => { void refresh(); }, []);
  const value = useMemo<AdminAuth>(() => ({
    ...state,
    refresh,
    signIn: async (email, password) => {
      const result = await request<{ email: string }>("/login", { method: "POST", body: JSON.stringify({ email, password }) });
      setState({ loading: false, authenticated: true, email: result.email });
    },
    signUp: async (email, password) => (await request<{ message: string }>("/signup", { method: "POST", body: JSON.stringify({ email, password }) })).message,
    recover: async (email) => (await request<{ message: string }>("/recover", { method: "POST", body: JSON.stringify({ email }) })).message,
    updatePassword: async (accessToken, password) => (await request<{ message: string }>("/update-password", { method: "POST", body: JSON.stringify({ accessToken, password }) })).message,
    signOut: async () => {
      await request("/logout", { method: "POST" });
      setState({ loading: false, authenticated: false, email: "" });
    },
  }), [state]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useAdminAuth() {
  const value = useContext(Context);
  if (!value) throw new Error("AdminAuthProvider is missing.");
  return value;
}