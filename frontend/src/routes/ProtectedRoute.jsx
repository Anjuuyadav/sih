import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ProtectedRoute = ({ allowedRoles, redirectTo = '/login' }) => {
  const { user } = useContext(AuthContext);
  const token = localStorage.getItem('token');

  if (!user && !token) return <Navigate to={redirectTo} replace />;
  if (allowedRoles && !user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(String(user?.role || '').toLowerCase())) {
    return <Navigate to={user?.role?.toLowerCase() === 'admin' ? '/admin' : redirectTo} replace />;
  }
  return <Outlet />;
};

export default ProtectedRoute;




