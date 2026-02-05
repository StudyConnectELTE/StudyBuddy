import axios from "axios";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000";
  
const api = axios.create({
  baseURL: `${API_URL}`, // http://localhost:5000/
  headers: {
    "Content-Type": "application/json",
  },
});

//HELYBEN DEFINIÁLT TOKEN HELPER
const getAuthToken = () => localStorage.getItem("authToken");

const authService = {
  register: async (email,name, major, hobbies, neptunCode, semester) => {
    try {
      const response = await api.post("/register", {
        email,
        name,
        major,
        hobbies,
        neptunCode,
        semester
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

  forgotPassword: async (email) => {
    try {
      const response = await api.post("/forgot-password", { email });
      if (response.data.token) {
        localStorage.setItem("authToken", response.data.token);
      }
      if (response.data.user) {
        localStorage.setItem("authUser", JSON.stringify(response.data.user));
      }
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || "Forgot password failed";
    }
  },

  logout: () => {
    localStorage.clear(); // ← MINDEN törlése!
    window.dispatchEvent(new Event("storage")); // ← Redux értesítés
  },

  getUser: () => {
    const user = localStorage.getItem("authUser");
    return user ? JSON.parse(user) : null;
  },

  isAuthenticated: () => {
    return !!localStorage.getItem("authToken");
  },
    // Jelszóváltoztatás - ÚJ FÜGGVÉNY!
  changePassword: async (currentPassword, newPassword) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await api.put('/change-password', {
        current_password: currentPassword,
        new_password: newPassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Sikeres → localStorage frissítés
      if (response.data.user) {
        localStorage.setItem('authUser', JSON.stringify(response.data.user));
      }
      
      return response.data;
    } catch (error) {
      throw error.response?.data?.message || 'Jelszóváltoztatás sikertelen az api-n';
    }
  }

};

// GROUP SERVICE
const groupService = {
  searchGroups: async (subject) => {
    const token = getAuthToken();
    const response = await api.get(
      `/groups/search?q=${encodeURIComponent(subject)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  joinGroup: async (groupId) => {
    const token = getAuthToken();
    const response = await api.post(
      "/groups/join",
      { group_id: groupId },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  leaveGroup: async (groupId) => {
    const token = getAuthToken();
    const response = await api.delete(`/groups/${groupId}/leave`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },
  

  myGroups: async () => {
    const token = getAuthToken();
    const response = await api.get("/groups/my-groups", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
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
  },

  getUnreadPostCounts: async () => {
    const token = getAuthToken();
    const response = await api.get("/groups/unread-counts", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data.unread_counts || {};
  },

  markGroupPostsRead: async (groupId) => {
    const token = getAuthToken();
    const response = await api.post(`/groups/${groupId}/mark-posts-read`, {}, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },
};

// FORUM SERVICE
const forumService = {
  getPosts: async (groupId) => {
    const token = getAuthToken();
    const response = await api.get(`/groups/${groupId}/posts`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data.posts || [];
  },

  createPost: async (groupId, title, content, files = null) => {
    const token = getAuthToken();
    
    // Ha van fájl (tömb vagy egyetlen fájl)
    const fileArray = Array.isArray(files) ? files : (files ? [files] : []);
    
    if (fileArray.length > 0) {
      // Multipart/form-data használata fájl esetén
      const formData = new FormData();
      formData.append("title", title);
      formData.append("content", content);
      
      // Minden fájlt hozzáadunk
      fileArray.forEach((file) => {
        formData.append("files", file);
      });
      
      const response = await axios.post(
        `${API_URL}/groups/${groupId}/posts`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return response.data.post;
    } else {
      // JSON formátum fájl nélkül
      const response = await api.post(
        `/groups/${groupId}/posts`,
        { title, content },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data.post;
    }
  },

  getComments: async (postId) => {
    const token = getAuthToken();
    const response = await api.get(`/posts/${postId}/comments`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data.comments || [];
  },

  createComment: async (postId, content, file = null) => {
    const token = getAuthToken();
    
    if (file) {
      // Multipart/form-data használata fájl esetén
      const formData = new FormData();
      formData.append("content", content);
      formData.append("file", file);
      
      const response = await axios.post(
        `${API_URL}/posts/${postId}/comments`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );
      return response.data.comment;
    } else {
      // JSON formátum fájl nélkül
      const response = await api.post(
        `/posts/${postId}/comments`,
        { content },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data.comment;
    }
  },

  deletePost: async (postId) => {
    const token = getAuthToken();
    const response = await api.delete(`/posts/${postId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  updatePost: async (postId, title, content) => {
    const token = getAuthToken();
    const response = await api.put(
      `/posts/${postId}`,
      { title, content },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data.post;
  },

  deleteComment: async (commentId) => {
    const token = getAuthToken();
    const response = await api.delete(`/comments/${commentId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  updateComment: async (commentId, content) => {
    const token = getAuthToken();
    const response = await api.put(
      `/comments/${commentId}`,
      { content },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data.comment;
  },

  deleteAttachment: async (attachmentId) => {
    const token = getAuthToken();
    const response = await api.delete(`/attachments/${attachmentId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },
};

// EVENT SERVICE
const eventService = {
  getEvents: async (groupId) => {
    const token = getAuthToken();
    const response = await api.get(`/groups/${groupId}/events`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data.events || [];
  },

  createEvent: async (groupId, title, date, description, location) => {
    const token = getAuthToken();
    const response = await api.post(
      `/groups/${groupId}/events`,
      { title, date, description, location },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data.event;
  },

  updateEvent: async (eventId, title, date, description, location) => {
    const token = getAuthToken();
    const response = await api.put(
      `/events/${eventId}`,
      { title, date, description, location },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data.event;
  },

  deleteEvent: async (eventId) => {
    const token = getAuthToken();
    const response = await api.delete(`/events/${eventId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },
};

// SUBJECT SERVICE
const subjectService = {
  searchSubjects: async (query, year = "2025-2026-2") => {
    const token = getAuthToken();
    const response = await api.get(
      `/subjects/search?q=${encodeURIComponent(query)}&year=${encodeURIComponent(year)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data; // [{ code, name }]
  },

  getGroupsBySubjectName: async (name) => {
    const token = getAuthToken();
    const response = await api.get(
      `/groups/by-subject?name=${encodeURIComponent(name)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data; // [{ id, name, subject, ... }]
  },
};



export { authService, groupService, forumService, eventService, subjectService };
export default authService;
