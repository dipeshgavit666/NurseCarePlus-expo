import React, {
  createContext, useContext, useEffect, useState, useCallback,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authApi, User } from "../api";

interface AuthCtx {
  user: User | null;
  isLoading: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>({} as AuthCtx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (token) {
          const { user: me } = await authApi.getMe();
          setUser(me);
        }
      } catch {
        await AsyncStorage.removeItem("token");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (token: string, u: User) => {
    await AsyncStorage.setItem("token", token);
    setUser(u);
  }, []);

  const logout = useCallback(async () => {
    await AsyncStorage.removeItem("token");
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const { user: me } = await authApi.getMe();
    setUser(me);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
