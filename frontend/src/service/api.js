import axios from "axios";

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000";

const api = axios.create({
  baseURL: `${API_URL}`,
  headers: {
    "Content-Type": "application/json",
  },
});

//HELYBEN DEFINIÁLT TOKEN HELPER
const getAuthToken = () => localStorage.getItem("authToken");

/** Axios / backend hiba szöveg toasthoz (nem HTML, nem „Ismeretlen hiba” mindenre) */
export function getApiErrorMessage(err) {
  const status = err?.response?.status;
  const d = err?.response?.data;

  if (typeof d === "string") {
    const stripped = d.replace(/<[^>]*>/g, "").trim();
    return stripped.slice(0, 400) || `Szerverhiba (${status || "?"})`;
  }

  if (d && typeof d === "object") {
    if (typeof d.error === "string") return d.error;
    if (typeof d.message === "string") return d.message;
  }

  if (status === 404) {
    return "A kért API végpont nem található (404).";
  }

  if (err?.code === "ERR_NETWORK" || err?.message === "Network Error") {
    return "Nem érhető el a backend.";
  }

  if (status) return `Szerverhiba (${status}).`;
  return err?.message || "Ismeretlen hiba";
}

const authService = {
  register: async (data) => {
    try {
      const response = await api.post("/register", data);

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
    localStorage.clear();
    window.dispatchEvent(new Event("storage"));
  },

  getUser: () => {
    const user = localStorage.getItem("authUser");
    return user ? JSON.parse(user) : null;
  },

  isAuthenticated: () => {
    return !!localStorage.getItem("authToken");
  },

  changePassword: async (currentPassword, newPassword) => {
    try {
      const token = getAuthToken();
      const response = await api.put(
        "/change-password",
        {
          current_password: currentPassword,
          new_password: newPassword,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.user) {
        localStorage.setItem("authUser", JSON.stringify(response.data.user));
      }

      return response.data;
    } catch (error) {
      throw error.response?.data?.message || "Jelszóváltoztatás sikertelen";
    }
  },
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
    const response = await api.post(
      `/groups/${groupId}/mark-posts-read`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },
};

// POMODORO (csoportos / egyéni session API)
const pomodoroService = {
  startSession: async (body = {}) => {
    const token = getAuthToken();
    const response = await api.post("/pomodoro/start", body, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  getSession: async (sessionId) => {
    const token = getAuthToken();
    const response = await api.get(`/pomodoro/session/${sessionId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  leaveSession: async (sessionId) => {
    const token = getAuthToken();
    const response = await api.post(
      `/pomodoro/session/${sessionId}/leave`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  finishSession: async (sessionId) => {
    const token = getAuthToken();
    const response = await api.post(
      `/pomodoro/session/${sessionId}/finish`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  updateSessionTask: async (sessionId, taskText) => {
    const token = getAuthToken();
    const response = await api.patch(
      `/pomodoro/session/${sessionId}/task`,
      { task_text: taskText },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  logFocusComplete: async () => {
    const token = getAuthToken();
    if (!token) return null;
    const response = await api.post(
      "/pomodoro/log-focus",
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },

  getPendingInvites: async () => {
    const token = getAuthToken();
    const response = await api.get("/pomodoro/pending-invites", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  getStats: async (year, month) => {
    const token = getAuthToken();
    const response = await api.get(
      `/pomodoro/stats?year=${year}&month=${month}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  updateSessionCycle: async (sessionId, cycleCount) => {
    const token = getAuthToken();
    const response = await api.patch(
      `/pomodoro/session/${sessionId}/cycle`,
      { cycle_count: cycleCount },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  getSettings: async () => {
    const token = getAuthToken();
    const response = await api.get("/pomodoro/settings", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },
  
  saveSettings: async (body) => {
    const token = getAuthToken();
    const response = await api.put("/pomodoro/settings", body, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  acceptInvite: async (sessionId) => {
    const token = getAuthToken();
    const response = await api.post(
      `/pomodoro/session/${sessionId}/invite/accept`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  },

  declineInvite: async (sessionId) => {
    const token = getAuthToken();
    const response = await api.post(
      `/pomodoro/session/${sessionId}/invite/decline`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
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
    const fileArray = Array.isArray(files) ? files : files ? [files] : [];

    if (fileArray.length > 0) {
      // Multipart/form-data használata fájl esetén
      const formData = new FormData();
      formData.append("title", title);
      formData.append("content", content);
      
      
      // Minden fájlt hozzáadunk

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
    return response.data;
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
    return response.data;
  },
};



// LEADERBOARD SERVICE
const leaderboardService = {
  getIndividual: async (limit = 10) => {
    const token = getAuthToken();
    const response = await api.get(`/leaderboard?type=individual&limit=${limit}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },
  getGroup: async (limit = 10) => {
    const token = getAuthToken();
    const response = await api.get(`/leaderboard?type=group&limit=${limit}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },
};

// GAMIFICATION SERVICE
const gamificationService = {
  // Fetches fresh XP/level from the server and syncs localStorage
  refreshXP: async () => {
    const token = getAuthToken();
    if (!token) return null;
    try {
      const response = await api.get("/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const user = response.data;
      if (user) {
        const current = authService.getUser() || {};
        const updated = { ...current, xp: user.xp, level: user.level };
        localStorage.setItem("authUser", JSON.stringify(updated));
        window.dispatchEvent(new Event("storage"));
        return { xp: user.xp, level: user.level };
      }
      return null;
    } catch {
      return null;
    }
  },

  // Refreshes XP and returns how much was gained since last check.
  // Call this after any XP-earning action to get the diff for toasts.
  getXPGain: async () => {
    const oldXp = authService.getUser()?.xp ?? 0;
    const result = await gamificationService.refreshXP();
    if (!result) return null;
    const gained = result.xp - oldXp;
    const leveledUp = result.level > (authService.getUser()?.level ?? 1);
    return { gained, newXp: result.xp, newLevel: result.level, leveledUp };
  },
};

const flashcardService = {
  // Aktuális user paklijainak listázása
  getDecks: async () => {
    const token = getAuthToken();
    const response = await api.get("/flashcards/decks", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data; // [{ id, name, subject, description, color, cardCount, ...}, ...]
  },

  // Új pakli létrehozása
  createDeck: async ({ name, subject, description, color }) => {
    const token = getAuthToken();
    const response = await api.post(
      "/flashcards/decks",
      { name, subject, description, color },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data; // { id, name, subject, description, color, cardCount, ... }
  },

  // Egy pakli kártyáinak lekérése
  getCards: async (deckId) => {
    const token = getAuthToken();
    const response = await api.get(`/flashcards/decks/${deckId}/cards`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data; // [{ id, question, answer }, ...]
  },

  // Új kártya létrehozása pakliban
  createCard: async (deckId, { question, answer }) => {
    const token = getAuthToken();
    const response = await api.post(
      `/flashcards/decks/${deckId}/cards`,
      { question, answer },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data; // { id, question, answer }
  },

  // Kártya törlése
  deleteCard: async (cardId) => {
    const token = getAuthToken();
    const response = await api.delete(`/flashcards/cards/${cardId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  deleteDeck: async (deckId) => {
    const token = getAuthToken();
    const response = await api.delete(`/flashcards/decks/${deckId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

};

export {
  authService,
  groupService,
  forumService,
  eventService,
  subjectService,
  pomodoroService,
  gamificationService,
  leaderboardService,
  flashcardService
};

export default authService;