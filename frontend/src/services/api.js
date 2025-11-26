import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';
const USE_MOCK = true; // Mock API kapcsoló

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor a tokennél
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Mock Auth Service
const mockAuthService = {
  register: async (email, password, name, major) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (email === 'already@elte.hu') {
          reject('Ez az email már regisztrálva van');
        } else {
          resolve({
            token: 'mock_token_' + Date.now(),
            user: {
              id: Math.random(),
              name,
              email,
              major,
            },
          });
        }
      }, 1500); // Szimulál 1.5 mp API késleltetést
    });
  },

  login: async (email, password) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (password !== 'password123') {
          reject('Hibás jelszó!');
        } else if (!email.endsWith('@elte.hu')) {
          reject('Nincs ilyen ELTE email cím');
        } else {
          resolve({
            token: 'mock_token_' + Date.now(),
            user: {
              id: 1,
              name: 'Teszt Felhasználó',
              email,
              major: 'Informatika',
            },
          });
        }
      }, 1500);
    });
  },

  logout: () => {
    localStorage.removeItem('authToken');
  },
};

// Real Auth Service
const realAuthService = {
  register: async (email, password, name, major) => {
    try {
      const response = await api.post('/api/auth/register', {
        email,
        password,
        name,
        major,
      });
      if (response.data.token) {
        localStorage.setItem('authToken', response.data.token);
      }
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Regisztráció sikertelen';
    }
  },

  login: async (email, password) => {
    try {
      const response = await api.post('/api/auth/login', {
        email,
        password,
      });
      if (response.data.token) {
        localStorage.setItem('authToken', response.data.token);
      }
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Bejelentkezés sikertelen';
    }
  },

  logout: () => {
    localStorage.removeItem('authToken');
  },
};

// Válassz: mock vagy real
export const authService = USE_MOCK ? mockAuthService : realAuthService;

export default api;
