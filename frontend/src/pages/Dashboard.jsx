import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout } from '../redux/slices/authSlice';
import { authService } from '../services/api';
import './Dashboard.css';

const Dashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);

  const handleLogout = () => {
    authService.logout();
    dispatch(logout());
    navigate('/login');
  };

  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        <h1>Study Buddy</h1>
        <div>
          <span>Szia, {user?.name}!</span>
          <button onClick={handleLogout} className="btn btn-logout">
            Kijelentkezés
          </button>
        </div>
      </nav>

      <main className="dashboard-content">
        <h2>Üdvözöllek a Study Buddy-ban!</h2>
        <p>Szak: {user?.major}</p>
        <p>Email: {user?.email}</p>
      </main>
    </div>
  );
};

export default Dashboard;
