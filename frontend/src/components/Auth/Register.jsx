import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { loginStart, registerSuccess, loginFailure, clearError } from '../../redux/slices/authSlice';
import { authService } from '../../services/api';
import './Auth.css';

const MAJORS = [
  'IK - autonómrendszer-informatikus',
  'IK - gépészmérnöki BSc',
  'IK - gépészmérnöki BSc - Gépészeti mechatronika',
  'IK - gépészmérnöki BSc - Ipar 4.0',
  'IK - gépészmérnöki MSc',
  'IK - adattudomány',
  'IK - geoinformatika',
  'IK - műszaki menedzser',
  'IK - programtervező informatikus [fejlesztő] F',
  'IK - programtervező informatikus BSc',
  'IK - programtervező informatikus BSc - A szakirány',
  'IK - programtervező informatikus BSc - B szakirány',
  'IK - programtervező informatikus BSc - C szakirány',
  'IK - programtervező informatikus BSc - D szakirány',
  'IK - programtervező informatikus MSc - Kiberbiztonság',
  'IK - programtervező informatikus MSc - Szoftvertechnológia',
  'IK - programtervező informatikus MSc - Modellalkotó',
  'IK - programtervező informatikus MSc - Pénzügyi informatika (Fintech)',
  'IK - térképész',
  'TTK - alkalmazott matematikus',
  'TTK - anyagtudomyány',
  'TTK - biológia BSc',
  'TTK - biológia MSc - IH specializáció',
  'TTK - biológia MSc - MGSF specializáció',
  'TTK - biológia MSc - MIM specializáció',
  'TTK - biológia MSc - NÖB specializáció',
  'TTK - biológia MSc - ÖEK specializáció',
  'TTK - biológia MSc - Bioinformatika specializáció',
  'TTK - biotechnológia',
  'TTK - biztonsítási és pénzügyi matematika',
  'TTK - biztonsítási és pénzügyi matematika - Aktuárius',
  'TTK - biztonsítási és pénzügyi matematika - Kvantitatív pénzügyek',
  'TTK - csillagászat',
  'TTK - fizika BSc',
  'TTK - fizika BSc - Számítógépes fizikus',
  'TTK - fizika BSc - Fizikus',
  'TTK - fizika BSc - Biofizikus',
  'TTK - fizika BSc - Csillagász',
  'TTK - fizika BSc - Geofizikus',
  'TTK - fizika BSc - Meterológus',
  'TTK - fizika MSc - Biofizika',
  'TTK - fizika MSc - Kutató fizikus',
  'TTK - fizika MSc - Tudományos adatanalitika és modellezés',
  'TTK - földrajz',
  'TTK - földrajz - Megújuló energiaforrások',
  'TTK - földrajz - Regionális elemző',
  'TTK - földrajz - Táj- és környezetföldrajz',
  'TTK - földrajz - Terület- és településfejlesztő',
  'TTK - földrajz - Turizmus',
  'TTK - földtudomyány',
  'TTK - földtudomyány - Csillagász',
  'TTK - földtudomyány - Geofizikus',
  'TTK - földtudomyány - Geográfus',
  'TTK - földtudomyány - Geológus',
  'TTK - földtudomyány - Meterológus',
  'TTK - földtudomyány - Térképész-geoinformatikus',
  'TTK - geofizikus - Kutató geofizikus',
  'TTK - geofizikus - Űrkutató-távérzékelő',
  'TTK - geográfus - Terület- és településfejlesztés',
  'TTK - geográfus - Regionális elemző',
  'TTK - geográfus - Környezetelemző',
  'TTK - geográfus - Geoinformatika',
  'TTK - geológus',
  'TTK - geológus - Ásvány-kőzettan-geokémia, ásványi nyersanyagok, archeometria',
  'TTK - geológus - Földtan-őslénytan',
  'TTK - geológus - Vízföldtan, szénhidrogénföldtan, környezetföldtan',
  'TTK - kémia',
  'TTK - kémia - Vegyész analitikus',
  'TTK - kémia - Elméleti kémia',
  'TTK - környezettan',
  'TTK - környezettan - Környezetkutató',
  'TTK - környezettan - Meterológia',
  'TTK - környezettudomány',
  'TTK - környezettudomány - Alkalmazott ökológia',
  'TTK - környezettudomány - Környezet-földtudomány',
  'TTK - környezettudomány - Környezetfizika',
  'TTK - környezettudomány - Műszeres környezeti analitika',
  'TTK - matematika BSc',
  'TTK - matematika BSc - Matematikus',
  'TTK - matematika BSc - Matematikai elemző',
  'TTK - matematika BSc - Alkalmazomatikus',
  'TTK - matematikus MSc',
  'TTK - matematikus MSc - Alkalmazott analízis',
  'TTK - matematikus MSc - Operációkutatás',
  'TTK - matematikus MSc - Számítástudomány',
  'TTK - matematikus MSc - Sztochasztika',
  'TTK - meterológus',
  'TTK - meterológus - Időjárás előrejelző',
  'TTK - meterológus - Éghajlatkutató',
  'TTK - vegyész',
  'TTK - vegyész - Anyagkutatás',
  'TTK - vegyész - Analitikai kémia',
  'TTK - vegyész - Elméleti kémia és szerkezetvizsgáló módszerek',
  'TTK - vegyész - Szintetikus biomolekuláris és gyógyszerkémia',
];

export const Register = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.auth);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    major: 'Informatika',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (error) dispatch(clearError());
  };

  const validateEmail = (email) => {
    return email.endsWith('@elte.hu') || email.endsWith('@student.elte.hu');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validáció
    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
      dispatch(loginFailure('Töltsd ki az összes mezőt!'));
      return;
    }

    if (!validateEmail(formData.email)) {
      dispatch(loginFailure('Csak ELTE email cím fogadható el (@elte.hu)'));
      return;
    }

    if (formData.password.length < 6) {
      dispatch(loginFailure('A jelszó minimum 6 karakter hosszú'));
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      dispatch(loginFailure('A jelszavak nem egyeznek!'));
      return;
    }

    // Regisztráció
    dispatch(loginStart());

    try {
      const response = await authService.register(
        formData.email,
        formData.password,
        formData.name,
        formData.major
      );
      dispatch(registerSuccess(response.user));
      navigate('/dashboard');
    } catch (err) {
      dispatch(loginFailure(err));
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Regisztráció</h1>

        <form onSubmit={handleSubmit}>
          {/* Név input */}
          <div className="form-group">
            <label htmlFor="name">Teljes név</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Pl.: Tóth János"
              disabled={loading}
              required
            />
          </div>

          {/* Email input */}
          <div className="form-group">
            <label htmlFor="email">ELTE Email</label>
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

          {/* Szak választó */}
          <div className="form-group">
            <label htmlFor="major">Szak</label>
            <select
              id="major"
              name="major"
              value={formData.major}
              onChange={handleChange}
              disabled={loading}
            >
              {MAJORS.map((major) => (
                <option key={major} value={major}>
                  {major}
                </option>
              ))}
            </select>
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
            <small>Minimum 6 karakter</small>
          </div>

          {/* Jelszó megerősítés */}
          <div className="form-group">
            <label htmlFor="confirmPassword">Jelszó megerősítés</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
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
            {loading ? 'Regisztráció...' : 'Regisztrálj'}
          </button>
        </form>

        {/* Login link */}
        <p className="auth-footer">
          Van már fiókod? <Link to="/login">Jelentkezz be</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
