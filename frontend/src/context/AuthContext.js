import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

const API_URL = process.env.REACT_APP_BACKEND_URL;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('agrolink_token'));
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem('agrolink_token');
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    const validateToken = async () => {
      if (token) {
        try {
          const response = await axios.get(`${API_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUser(response.data);
        } catch (error) {
          logout();
        }
      }
      setLoading(false);
    };
    validateToken();
  }, [token, logout]);

  const login = async (credentials) => {
    const response = await axios.post(`${API_URL}/api/auth/login`, credentials);
    const { token: newToken, user: userData } = response.data;
    localStorage.setItem('agrolink_token', newToken);
    setToken(newToken);
    setUser(userData);
    return userData;
  };

  const isAdmin = () => {
    return user?.role === 'master' || user?.role === 'admin';
  };

  const isMaster = () => {
    return user?.role === 'master';
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, isAdmin, isMaster }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
