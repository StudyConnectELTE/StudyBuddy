import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { loginStart, loginSuccess, loginFailure, clearError } from '../../redux/slices/authSlice';
import { authService } from '../../services/api';
import './Auth.css';
import logo from '../../assets/logo_studyBuddy.png';

export const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.auth);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Error törlése input változásakor
    if (error) dispatch(clearError());
  };

  const validateEmail = (email) => {
    return email.endsWith('@elte.hu') || email.endsWith('@student.elte.hu');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validáció
    if (!formData.email || !formData.password) {
      dispatch(loginFailure('Töltsd ki az összes mezőt!'));
      return;
    }

    if (!validateEmail(formData.email)) {
      dispatch(loginFailure('Csak ELTE email cím fogadható el (@elte.hu)'));
      return;
    }

    // Bejelentkezés
    dispatch(loginStart());

    try {
      const response = await authService.login(formData.email, formData.password);
      dispatch(loginSuccess(response.user));
      navigate('/dashboard');
    } catch (err) {
      dispatch(loginFailure(err));
    }
  };

  return (
    <div className="auth-container">
      <img src={logo} alt="Study Buddy" className="auth-logo" />
      <div className="auth-card">
        <h1>Bejelentkezés</h1>

        <form onSubmit={handleSubmit}>
          {/* Email input */}
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="user@elte.hu"
              disabled={loading}
              required
            />
            <small>Csak @elte.hu vagy @student.elte.hu email cím elfogadott</small>
          </div>

          {/* Jelszó input */}
          <div className="form-group">
            <label htmlFor="password">Jelszó</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              disabled={loading}
              required
            />
          </div>

          {/* Error megjelenítés */}
          {error && <div className="error-message">{error}</div>}

          {/* Submit gomb */}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Bejelentkezés...' : 'Bejelentkezés'}
          </button>
        </form>

        {/* Regisztrációs link */}
        <p className="auth-footer">
          Még nincs fiókod? <Link to="/register">Regisztrálj most</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
