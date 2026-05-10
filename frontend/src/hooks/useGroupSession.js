import { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";
import { pomodoroService } from "../service/api";

const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export function useGroupSession({
  backendSessionId,
  onSessionFinished,
  onInviteReceived,
  enabled = true,
}) {
  const socketRef = useRef(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [participants, setParticipants] = useState([]);

  const getToken = () => localStorage.getItem("authToken");

  // Socket inicializálás – enabled és token meglétekor
  useEffect(() => {
    if (!enabled) return;
    const token = getToken();
    if (!token) return;

    const socket = io(`${SOCKET_URL}/pomodoro`, {
      transports: ["websocket", "polling"],
      auth: { token: `Bearer ${token}` },
    });
    socketRef.current = socket;

    socket.on("connect", () => setWsConnected(true));
    socket.on("disconnect", () => setWsConnected(false));
    socket.on("invite_received", (data) => onInviteReceived?.(data));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // Session room join/leave – ha wsConnected és backendSessionId is megvan
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !wsConnected || !backendSessionId) return;

    const token = getToken();
    socket.emit("join_session", {
      token: `Bearer ${token}`,
      session_id: backendSessionId,
    });

    // Initial participant load REST-ből
    pomodoroService
      .getSession(backendSessionId)
      .then((s) => {
        if (s.participants) setParticipants(s.participants);
      })
      .catch(() => {});

    const onUserJoined = (data) => {
      setParticipants((prev) =>
        prev.find((p) => p.user_id === data.user_id)
          ? prev
          : [...prev, { user_id: data.user_id, task_text: null, left_at: null }]
      );
    };

    const onUserLeft = (data) => {
      setParticipants((prev) =>
        prev.map((p) =>
          p.user_id === data.user_id ? { ...p, left_at: data.timestamp } : p
        )
      );
    };

    const onTaskUpdated = (data) => {
      setParticipants((prev) =>
        prev.map((p) =>
          p.user_id === data.user_id ? { ...p, task_text: data.task_text } : p
        )
      );
    };

    const onSessionFinishedHandler = () => onSessionFinished?.();

    socket.on("user_joined", onUserJoined);
    socket.on("user_left", onUserLeft);
    socket.on("task_updated", onTaskUpdated);
    socket.on("session_finished", onSessionFinishedHandler);

    return () => {
      socket.off("user_joined", onUserJoined);
      socket.off("user_left", onUserLeft);
      socket.off("task_updated", onTaskUpdated);
      socket.off("session_finished", onSessionFinishedHandler);
      socket.emit("leave_session", {
        token: `Bearer ${getToken()}`,
        session_id: backendSessionId,
      });
    };
  }, [backendSessionId, wsConnected]); // eslint-disable-line react-hooks/exhaustive-deps

  const emitLeaveSession = useCallback(() => {
    const socket = socketRef.current;
    if (socket && backendSessionId) {
      socket.emit("leave_session", {
        token: `Bearer ${getToken()}`,
        session_id: backendSessionId,
      });
    }
  }, [backendSessionId]);

  return { wsConnected, participants, emitLeaveSession };
}
