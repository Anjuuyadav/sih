import React, { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ProtectedRoute = ({ redirectTo = '/login' }) => {
  const { user } = useContext(AuthContext);
  const token = localStorage.getItem('token');

  return user || token ? <Outlet /> : <Navigate to={redirectTo} replace />;
};

export default ProtectedRoute;
