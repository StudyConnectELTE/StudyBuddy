import axios from "axios";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";
const USE_MOCK = true; // Mock API kapcsoló

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor a tokennél
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Mock Auth Service
const mockAuthService = {
  register: async (email, password, name, major, hobbies = []) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (
          email === "already@elte.hu" ||
          email === "already@student.elte.hu"
        ) {
          reject("Ez az email már regisztrálva van");
        } else {
          const token = "mock_token_" + Date.now();
          const user = {
            id: Math.random(),
            name,
            email,
            major,
            hobbies,
          };
          const response = {
            token,
            user,
          };
          // Token és user adatok mentése localStorage-ba
          localStorage.setItem("authToken", token);
          localStorage.setItem("authUser", JSON.stringify(user));
          resolve(response);
        }
      }, 1500); // Szimulál 1.5 mp API késleltetést
    });
  },

  login: async (email, password) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (password !== "password123") {
          reject("Hibás jelszó!");
        } else if (
          !email.endsWith("@elte.hu") &&
          !email.endsWith("@student.elte.hu")
        ) {
          reject("Nincs ilyen ELTE email cím");
        } else {
          const token = "mock_token_" + Date.now();
          const user = {
            id: 1,
            name: "Teszt Felhasználó",
            email,
            major: "Informatika",
          };
          const response = {
            token,
            user,
          };
          // Token és user adatok mentése localStorage-ba
          localStorage.setItem("authToken", token);
          localStorage.setItem("authUser", JSON.stringify(user));
          resolve(response);
        }
      }, 1500);
    });
  },

  logout: () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
  },
};

// Real Auth Service
const realAuthService = {
  register: async (email, password, name, major, hobbies = []) => {
    try {
      const response = await api.post("/api/auth/register", {
        email,
        password,
        name,
        major,
        interests: hobbies,
      });
      if (response.data.token) {
        localStorage.setItem("authToken", response.data.token);
      }
      if (response.data.user) {
        localStorage.setItem("authUser", JSON.stringify(response.data.user));
      }
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || "Regisztráció sikertelen";
    }
  },

  login: async (email, password) => {
    try {
      const response = await api.post("/api/auth/login", {
        email,
        password,
      });
      if (response.data.token) {
        localStorage.setItem("authToken", response.data.token);
      }
      if (response.data.user) {
        localStorage.setItem("authUser", JSON.stringify(response.data.user));
      }
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || "Bejelentkezés sikertelen";
    }
  },

  logout: () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
  },
};

// Válassz: mock vagy real
export const authService = USE_MOCK ? mockAuthService : realAuthService;

// Mock Group Service
const mockGroupService = {
  searchGroups: async (subject) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Mock csoportok generálása
        const mockGroups = [
          {
            id: 1,
            name: `${subject} Study Group #1`,
            subject: subject,
            description: `${subject} tanulócsoport. Csatlakozz hozzánk!`,
            member_count: 3,
            same_interest_members: 2,
            common_hobbies: ['Programozás', 'Matematika', 'Játék'],
          },
          {
            id: 2,
            name: `${subject} Study Group #2`,
            subject: subject,
            description: `${subject} haladó tanulócsoport.`,
            member_count: 5,
            same_interest_members: 3,
            common_hobbies: ['Sport', 'Olvasás', 'Film'],
          },
          {
            id: 3,
            name: `${subject} Study Group #3`,
            subject: subject,
            description: `${subject} kezdő tanulócsoport.`,
            member_count: 2,
            same_interest_members: 1,
            common_hobbies: ['Zene', 'Fotózás'],
          },
        ];

        const response = {
          recommended_group: mockGroups[0],
          all_groups: mockGroups,
        };
        resolve(response);
      }, 1000);
    });
  },

  joinGroup: async (groupId) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ message: "Sikeresen csatlakoztál a csoporthoz!" });
      }, 800);
    });
  },

  getGroupMembers: async (groupId) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Mock tagok generálása
        const mockMembers = [
          {
            id: 1,
            name: "Kovács Anna",
            email: "kovacs.anna@student.elte.hu",
            major: "Informatika",
          },
          {
            id: 2,
            name: "Nagy Péter",
            email: "nagy.peter@student.elte.hu",
            major: "Matematika",
          },
          {
            id: 3,
            name: "Szabó Mária",
            email: "szabo.maria@student.elte.hu",
            major: "Fizika",
          },
        ];
        resolve(mockMembers);
      }, 600);
    });
  },
};

// Real Group Service
const realGroupService = {
  searchGroups: async (subject) => {
    try {
      const response = await api.get(`/groups/search`, {
        params: { q: subject },
      });
      return response.data;
    } catch (error) {
      throw error.response?.data?.error || "Csoportok keresése sikertelen";
    }
  },

  joinGroup: async (groupId) => {
    try {
      const response = await api.post("/groups/join", {
        group_id: groupId,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data?.error || "Csatlakozás sikertelen";
    }
  },

  getGroupMembers: async (groupId) => {
    try {
      const response = await api.get(`/groups/${groupId}/members`);
      return response.data.members || [];
    } catch (error) {
      throw error.response?.data?.error || "Tagok lekérése sikertelen";
    }
  },
};

// Válassz: mock vagy real
export const groupService = USE_MOCK ? mockGroupService : realGroupService;

export default api;
