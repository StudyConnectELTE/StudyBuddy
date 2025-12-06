import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${API_URL}`,  // http://localhost:5000/
  headers: {
    "Content-Type": "application/json",
  },
});

//HELYBEN DEFINIÁLT TOKEN HELPER
const getAuthToken = () => localStorage.getItem("authToken");

const authService = {
  register: async (email, password, name, major, hobbies) => {
    try {
      const response = await api.post("/register", {
        email,
        password,
        name,
        major,
        hobbies,
      });
      
      if (response.data.token) {
        localStorage.setItem("authToken", response.data.token);
      }
      if (response.data.user) {
        localStorage.setItem("authUser", JSON.stringify(response.data.user));
      }
      return response.data;
    } catch (error) {
      throw error.response?.data || "Registration failed";
    }
  },

  login: async (email, password) => {
    try {
      const response = await api.post("/login", { email, password });
      if (response.data.token) {
        localStorage.setItem("authToken", response.data.token);
      }
      if (response.data.user) {
        localStorage.setItem("authUser", JSON.stringify(response.data.user));
      }
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || "Login failed";
    }
  },


  logout: () => {
    localStorage.clear();  // ← MINDEN törlése!
    window.dispatchEvent(new Event('storage'));  // ← Redux értesítés
  },

  getUser: () => {
    const user = localStorage.getItem("authUser");
    return user ? JSON.parse(user) : null;
  },

  isAuthenticated: () => {
    return !!localStorage.getItem("authToken");
  },
};


// GROUP SERVICE
const groupService = {
  searchGroups: async (subject) => {
    const token = getAuthToken();
    const response = await api.get(`/groups/search?q=${encodeURIComponent(subject)}`, {
      headers: { 
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  },

  joinGroup: async (groupId) => {
    const token = getAuthToken();
    const response = await api.post("/groups/join", 
      { group_id: groupId },
      {
        headers: { 
          Authorization: `Bearer ${token}`
        }
      }
    );
    return response.data;
  },

  myGroups: async () => {
    const token = getAuthToken();
    const response = await api.get("/groups/my-groups", {
      headers: { 
        Authorization: `Bearer ${token}`
      }
    });
    return response.data;
  },

  getGroupMembers: async (groupId) => {
    const token = getAuthToken();
    const response = await api.get(`/groups/${groupId}/members`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data.members;
  }
};


export { authService, groupService };
export default authService;