import { createContext, useCallback, useContext, useState } from "react";
import { api } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null = unknown, false = signed out

  const checkAuth = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
      return data;
    } catch {
      setUser(false);
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    try { await api.post("/auth/logout"); } catch { /* cookies cleared server-side when reachable */ }
    setUser(false);
  }, []);

  return <AuthContext.Provider value={{ user, setUser, checkAuth, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
