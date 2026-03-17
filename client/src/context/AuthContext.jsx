import { createContext, useContext, useEffect, useState } from "react";
import { authApi } from "../api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);

  const loadProfile = async () => {
    const { data } = await authApi.me();
    setUser(data.user);
    return data.user;
  };

  const loadNotifications = async () => {
    try {
      const { data } = await authApi.notifications();
      setNotifications(data.notifications || []);
    } catch {
      setNotifications([]);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("collabdrive-token");

    if (!token) {
      setLoading(false);
      return;
    }

    Promise.allSettled([loadProfile(), loadNotifications()])
      .catch(() => {
        localStorage.removeItem("collabdrive-token");
      })
      .finally(() => setLoading(false));
  }, []);

  const value = {
    user,
    loading,
    notifications,
    login: async ({ token, user: nextUser }) => {
      localStorage.setItem("collabdrive-token", token);
      setUser(nextUser);
      await loadNotifications();
    },
    logout: () => {
      localStorage.removeItem("collabdrive-token");
      setUser(null);
      setNotifications([]);
    },
    updateUser: setUser,
    refreshUser: loadProfile,
    refreshNotifications: loadNotifications,
    markNotificationsRead: async () => {
      await authApi.markNotificationsRead();
      await loadProfile();
      await loadNotifications();
    },
    updatePreferences: async (payload) => {
      const { data } = await authApi.updatePreferences(payload);
      setUser(data.user);
      return data.user;
    }
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
