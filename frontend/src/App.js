import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Dashboard from './pages/Dashboard';
import './App.css';

function App() {
  const { isAuthenticated } = useSelector((state) => state.auth);

  return (
    <>
    <Router>
      <Routes>
        {/* Nyilvános útvonalak */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Védett útvonal (csak bejelentkezett felhasználók) */}
        <Route
          path="/dashboard"
          element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />}
        />

        {/* Alapértelmezett útvonal */}
        <Route path="/" element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} />} />
      </Routes>
    </Router>
    </>
  );
}

export default App;
