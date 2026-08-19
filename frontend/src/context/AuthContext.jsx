import React, { createContext, useEffect, useState } from 'react';

export const AuthContext = createContext({
  user: null,
  setUser: () => {},
  logout: () => {},
});

const normalizeUser = (value) => value ? { ...value, role: value.role ? String(value.role).trim().toLowerCase() : value.role } : null;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('user');
    return storedUser ? normalizeUser(JSON.parse(storedUser)) : null;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(normalizeUser(user)));
    } else {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
    }
  }, [user]);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
