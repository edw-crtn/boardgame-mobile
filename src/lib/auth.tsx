import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "./api";
import { User } from "./types";

type AuthCtx = {
  loading: boolean;
  token: string | null;
  user: User | null;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (username: string, password: string, confirm: string) => Promise<void>; // <-- NEW
};

const Ctx = createContext<AuthCtx>({
  loading: true,
  token: null,
  user: null,
  signIn: async () => {},
  signOut: async () => {},
  signUp: async () => {}, // <-- NEW
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    (async () => {
      const t = await AsyncStorage.getItem("token");
      if (t) {
        try {
          const me = await api.me(t);
          setToken(t);
          setUser(me.user);
        } catch {
          await AsyncStorage.removeItem("token");
        }
      }
      setLoading(false);
    })();
  }, []);

  async function signIn(username: string, password: string) {
    const res = await api.login(username, password);
    setToken(res.token);
    setUser(res.user);
    await AsyncStorage.setItem("token", res.token);
  }

  async function signUp(username: string, password: string, confirm: string) {
    const res = await api.register(username, password, confirm);
    setToken(res.token);
    setUser(res.user);
    await AsyncStorage.setItem("token", res.token);
  }

  async function signOut() {
    setToken(null);
    setUser(null);
    await AsyncStorage.removeItem("token");
  }

  return (
    <Ctx.Provider value={{ loading, token, user, signIn, signOut, signUp }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  return useContext(Ctx);
}
