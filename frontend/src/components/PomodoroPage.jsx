import { useState, useEffect, useCallback, useRef } from "react";
import { Lightbulb, CircleHelp, Copy, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { cn } from "./ui/utils";
import { usePomodoro } from "../context/usePomodoro";
import {
  authService,
  groupService,
  pomodoroService,
  gamificationService,
  getApiErrorMessage,
} from "../service/api";
import { useGroupSession } from "../hooks/useGroupSession";

function formatTime(seconds) {
  if (seconds == null || seconds < 0) return "25:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getModeLabel(mode, MODES, waitingGroupSync) {
  if (waitingGroupSync) return "Együtt indulás";
  switch (mode) {
    case MODES.FOCUS:
      return "Fókusz";
    case MODES.SHORT_BREAK:
      return "Rövid szünet";
    case MODES.LONG_BREAK:
      return "Hosszú szünet";
    case MODES.PAUSED:
      return "Szüneteltetve";
    default:
      return "Készülj";
  }
}

function splitTaskText(taskText) {
  if (!taskText || typeof taskText !== "string") return [];
  return taskText
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .map((title) => ({ title, done: false }));
}

const CIRCLE_RADIUS = 44;
const CIRCLE_LENGTH = 2 * Math.PI * CIRCLE_RADIUS;
const START_RING_ANIMATION_MS = 1000;
const ACTIVE_SESSION_KEY = "pomodoroActiveSession";

function persistActiveSession(sessionId, mode) {
  localStorage.setItem(
    ACTIVE_SESSION_KEY,
    JSON.stringify({ sessionId, mode })
  );

  if (mode === "group") {
    localStorage.setItem("pomodoroGroupSessionId", String(sessionId));
    window.dispatchEvent(new Event("pomodoro-session-storage-changed"));
  }
}

function readPersistedActiveSession() {
  const raw = localStorage.getItem(ACTIVE_SESSION_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    const sessionId = Number(parsed?.sessionId);
    const mode = parsed?.mode;

    if (!Number.isFinite(sessionId)) return null;
    if (mode !== "solo" && mode !== "group") return null;

    return { sessionId, mode };
  } catch {
    return null;
  }
}

function inferSessionMode(session, fallbackMode = null) {
  const groupId = session?.group_id ?? session?.groupid ?? null;
  if (groupId != null) return "group";
  if (fallbackMode === "group" || fallbackMode === "solo") return fallbackMode;
  return "solo";
}

function clearPersistedActiveSession() {
  localStorage.removeItem(ACTIVE_SESSION_KEY);
  localStorage.removeItem("pomodoroGroupSessionId");
  window.dispatchEvent(new Event("pomodoro-session-storage-changed"));
}

export function PomodoroPage({ blockGroupStartDueToInvite = false }) {
  const [isGroupSession, setIsGroupSession] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [focusCount, setFocusCount] = useState(4);
  const [autoFocusStart, setAutoFocusStart] = useState(true);
  const [autoShortStart, setAutoShortStart] = useState(true);
  const [autoLongStart, setAutoLongStart] = useState(true);
  const [rememberSettings, setRememberSettings] = useState(false);

  const [showSessionSetup, setShowSessionSetup] = useState(true);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const [sessionPhases, setSessionPhases] = useState([]);
  const [myGroups, setMyGroups] = useState([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [groupStartLoading, setGroupStartLoading] = useState(false);

  const [backendSessionId, setBackendSessionId] = useState(null);
  const [backendSessionMode, setBackendSessionMode] = useState(null);
  const [sessionSnapshot, setSessionSnapshot] = useState(null);

  const [groupFocusStartsAtMs, setGroupFocusStartsAtMs] = useState(null);
  const [groupSyncNow, setGroupSyncNow] = useState(Date.now());
  const groupSyncStartFiredRef = useRef(false);
  const taskSyncTimeoutRef = useRef(null);

  const [showSessionComplete, setShowSessionComplete] = useState(false);
  const [sessionSummary, setSessionSummary] = useState(null);

  const [showStartRingAnimation, setShowStartRingAnimation] = useState(false);
  const [startRingKey, setStartRingKey] = useState(0);
  const startRingTimeoutRef = useRef(null);

  const {
    MODES,
    CYCLES_BEFORE_LONG_BREAK,
    mode,
    currentCycle,
    pausedRemainingSec,
    displaySeconds,
    focusMin,
    shortBreakMin,
    longBreakMin,
    setFocusMin,
    setShortBreakMin,
    setLongBreakMin,
    isActive,
    startFocus,
    startPause,
    reset,
    completedPhases,
  } = usePomodoro();

  const isLoggedIn = authService.isAuthenticated();

  const hasOngoingSession =
    mode === MODES.FOCUS ||
    mode === MODES.SHORT_BREAK ||
    mode === MODES.LONG_BREAK ||
    mode === MODES.PAUSED;

  const buildSessionPhases = useCallback(() => {
    const phases = [];
    for (let i = 1; i <= focusCount; i++) {
      phases.push({ label: `${i}. Fókusz` });
      if (i < focusCount) {
        phases.push({ label: `${i}. Rövid szünet` });
      }
    }
    phases.push({ label: "Hosszú szünet" });
    return phases;
  }, [focusCount]);

  const triggerStartRingAnimation = useCallback(() => {
    if (startRingTimeoutRef.current) {
      clearTimeout(startRingTimeoutRef.current);
    }

    setStartRingKey((k) => k + 1);
    setShowStartRingAnimation(true);

    startRingTimeoutRef.current = setTimeout(() => {
      setShowStartRingAnimation(false);
      startRingTimeoutRef.current = null;
    }, START_RING_ANIMATION_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (startRingTimeoutRef.current) {
        clearTimeout(startRingTimeoutRef.current);
      }
      if (taskSyncTimeoutRef.current) {
        clearTimeout(taskSyncTimeoutRef.current);
      }
    };
  }, []);

  const clearLocalSessionState = useCallback(() => {
    if (taskSyncTimeoutRef.current) {
      clearTimeout(taskSyncTimeoutRef.current);
      taskSyncTimeoutRef.current = null;
    }

    if (startRingTimeoutRef.current) {
      clearTimeout(startRingTimeoutRef.current);
      startRingTimeoutRef.current = null;
    }

    setBackendSessionId(null);
    setBackendSessionMode(null);
    setSessionSnapshot(null);
    setGroupFocusStartsAtMs(null);
    setGroupSyncNow(Date.now());
    setTasks([]);
    setSessionPhases([]);
    clearPersistedActiveSession();
  }, []);

  const finishFrontendSession = useCallback(() => {
    setSessionSummary({
      focusMinutes: focusCount * focusMin,
      completedTasks: tasks.filter((task) => task.done).length,
      plannedRounds: focusCount,
    });

    setShowSessionComplete(true);
    clearLocalSessionState();
    reset();
    setShowSessionSetup(true);
  }, [focusCount, focusMin, tasks, reset, clearLocalSessionState]);

  const loadSessionDetails = useCallback(async (sessionId, fallbackMode = null) => {
    const sid = Number(sessionId);
    if (!Number.isFinite(sid)) return null;

    const session = await pomodoroService.getSession(sid);

    const myUserId = authService.getUser()?.id;
    const participants = Array.isArray(session?.participants)
      ? session.participants
      : [];

    const myParticipant =
      participants.find((p) => p.user_id === myUserId || p.userid === myUserId) ||
      null;

    if (myParticipant?.task_text) {
      setTasks(splitTaskText(myParticipant.task_text));
    } else if (myParticipant?.tasktext) {
      setTasks(splitTaskText(myParticipant.tasktext));
    } else {
      setTasks([]);
    }

    setSessionSnapshot({ participants });
    setBackendSessionId(sid);

    const detectedMode = inferSessionMode(session, fallbackMode);
    setBackendSessionMode(detectedMode);
    persistActiveSession(sid, detectedMode);

    return session;
  }, []);

  const restoreVisibleSessionState = useCallback(async () => {
    const persisted = readPersistedActiveSession();

    const sid = Number.isFinite(backendSessionId)
      ? backendSessionId
      : persisted?.sessionId ?? null;

    if (!hasOngoingSession && !sid) return;

    if (sessionPhases.length === 0) {
      setSessionPhases(buildSessionPhases());
    }

    if (sid) {
      try {
        const session = await loadSessionDetails(sid, persisted?.mode ?? null);
    
        const deadlineIso = session?.invite_deadline || session?.invitedeadline;
        const deadlineMs = deadlineIso ? Date.parse(deadlineIso) : NaN;
    
        if (Number.isFinite(deadlineMs) && Date.now() < deadlineMs) {
          setGroupFocusStartsAtMs(deadlineMs);
          setGroupSyncNow(Date.now());
          setShowSessionSetup(false);
          return;
        }
    
        setShowSessionSetup(false);
    
        if (!hasOngoingSession) {
          triggerStartRingAnimation();
          startFocus();
        }
      } catch {
        clearPersistedActiveSession();
      }
    }
  }, [backendSessionId, hasOngoingSession, sessionPhases.length, buildSessionPhases, loadSessionDetails, triggerStartRingAnimation, startFocus]);

  const bootstrapAcceptedSession = useCallback(
    async (sessionId) => {
      const sid = Number(sessionId);
      if (!Number.isFinite(sid)) return;

      setBackendSessionId(sid);
      setBackendSessionMode("group");
      persistActiveSession(sid, "group");

      try {
        const session = await loadSessionDetails(sid, "group");
        const deadlineIso = session?.invite_deadline || session?.invitedeadline;

        if (deadlineIso) {
          const ms = Date.parse(deadlineIso);
          if (Number.isFinite(ms) && Date.now() < ms) {
            setGroupFocusStartsAtMs(ms);
            setGroupSyncNow(Date.now());
            setSessionPhases(buildSessionPhases());
            setShowSessionSetup(false);
            return;
          }
        }

        setSessionPhases(buildSessionPhases());
        setShowSessionSetup(false);
        triggerStartRingAnimation();
        startFocus();
      } catch (e) {
        const code = e?.response?.data?.code;
        clearPersistedActiveSession();
        setBackendSessionId(null);
        setBackendSessionMode(null);
        setSessionSnapshot(null);
        if (code === "INVITE_PENDING") return;
      }
    },
    [buildSessionPhases, loadSessionDetails, startFocus, triggerStartRingAnimation]
  );

  useEffect(() => {
    const onAccepted = (e) => {
      const sid = e.detail?.sessionId;
      if (sid == null) return;
      void bootstrapAcceptedSession(sid);
    };

    window.addEventListener("pomodoro-session-accepted", onAccepted);
    return () =>
      window.removeEventListener("pomodoro-session-accepted", onAccepted);
  }, [bootstrapAcceptedSession]);

  useEffect(() => {
    const persisted = readPersistedActiveSession();
    if (!persisted) return;

    setBackendSessionId(persisted.sessionId);
    setBackendSessionMode(persisted.mode);
    setShowSessionSetup(false);
    void loadSessionDetails(persisted.sessionId, persisted.mode);
  }, [loadSessionDetails]);

  useEffect(() => {
    groupSyncStartFiredRef.current = false;
  }, [groupFocusStartsAtMs]);

  useEffect(() => {
    if (groupFocusStartsAtMs == null) return;

    const id = setInterval(() => {
      const now = Date.now();
      setGroupSyncNow(now);

      if (now >= groupFocusStartsAtMs && !groupSyncStartFiredRef.current) {
        groupSyncStartFiredRef.current = true;
        setSessionPhases(buildSessionPhases());
        triggerStartRingAnimation();
        startFocus();
        setGroupFocusStartsAtMs(null);
      }
    }, 250);

    return () => clearInterval(id);
  }, [
    groupFocusStartsAtMs,
    buildSessionPhases,
    startFocus,
    triggerStartRingAnimation,
  ]);

  useEffect(() => {
    if (!isGroupSession || !showSessionSetup || !isLoggedIn) return;

    let cancelled = false;

    (async () => {
      try {
        setGroupsLoading(true);
        const data = await groupService.myGroups();
        if (!cancelled) setMyGroups(data.groups || []);
      } catch {
        if (!cancelled) {
          toast.error("Nem sikerült betölteni a csoportjaidat.");
        }
      } finally {
        if (!cancelled) setGroupsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isGroupSession, showSessionSetup, isLoggedIn]);

  const prevModeRef = useRef(null);
  const handledFocusCompletionRef = useRef(false);

  useEffect(() => {
    const wasJustFocus = prevModeRef.current === MODES.FOCUS;
    const nowNotFocus = mode !== MODES.FOCUS;
    const sessionActive = !showSessionSetup;

    if (mode === MODES.FOCUS) {
      handledFocusCompletionRef.current = false;
    }

    if (
      wasJustFocus &&
      nowNotFocus &&
      sessionActive &&
      isLoggedIn &&
      !handledFocusCompletionRef.current
    ) {
      handledFocusCompletionRef.current = true;

      if (backendSessionId) {
        pomodoroService
          .getSession(backendSessionId)
          .then((session) => {
            const nextCycleCount =
              (session?.cycle_count ?? session?.cyclecount ?? 0) + 1;

            return pomodoroService
              .updateSessionCycle(backendSessionId, nextCycleCount)
              .then(() => nextCycleCount);
          })
          .then((nextCycleCount) => {
            return pomodoroService
              .logFocusComplete()
              .then(() => gamificationService.getXPGain())
              .then((xpResult) => ({ xpResult, nextCycleCount }));
          })
          .then(({ xpResult, nextCycleCount }) => {
            if (xpResult && xpResult.gained > 0) {
              toast.success(`+${xpResult.gained} XP`, {
                description: "Fókusz session befejezve!",
              });
            }

            if (xpResult?.leveledUp) {
              toast.success(`Szint növekedés! ${xpResult.newLevel}. szint`, {
                description: "Gratulálunk!",
              });
            }

            if (nextCycleCount >= focusCount) {
              pomodoroService.finishSession(backendSessionId).catch(() => {});
              clearPersistedActiveSession();
              finishFrontendSession();
            }
          })
          .catch(() => {});
      } else {
        pomodoroService
          .logFocusComplete()
          .then(() => gamificationService.getXPGain())
          .then((xpResult) => {
            if (xpResult && xpResult.gained > 0) {
              toast.success(`+${xpResult.gained} XP`, {
                description: "Fókusz session befejezve!",
              });
            }

            if (xpResult?.leveledUp) {
              toast.success(`Szint növekedés! ${xpResult.newLevel}. szint`, {
                description: "Gratulálunk!",
              });
            }

            const nextCycleCount = currentCycle + 1;
            if (nextCycleCount >= focusCount) {
              finishFrontendSession();
            }
          })
          .catch(() => {});
      }
    }

    prevModeRef.current = mode;
  }, [
    mode,
    showSessionSetup,
    isLoggedIn,
    MODES.FOCUS,
    backendSessionId,
    focusCount,
    currentCycle,
    finishFrontendSession,
  ]);

  const { participants: wsParticipants, emitLeaveSession } = useGroupSession({
    backendSessionId:
      showSessionSetup || backendSessionMode !== "group"
        ? null
        : backendSessionId,
    onSessionFinished: () => {
      toast.message("A session a szerveren lezárult.");
      clearLocalSessionState();
      reset();
      setShowSessionSetup(true);
    },
    onInviteReceived: null,
  });

  useEffect(() => {
    if (!backendSessionId || showSessionSetup || backendSessionMode !== "group") {
      return;
    }
    setSessionSnapshot({ participants: wsParticipants || [] });
  }, [wsParticipants, backendSessionId, showSessionSetup, backendSessionMode]);

  useEffect(() => {
    if (!backendSessionId || backendSessionMode !== "group") return;
    if (!Array.isArray(tasks)) return;

    if (taskSyncTimeoutRef.current) {
      clearTimeout(taskSyncTimeoutRef.current);
    }

    taskSyncTimeoutRef.current = setTimeout(async () => {
      try {
        const taskText = tasks
          .map((t) => t?.title?.trim())
          .filter(Boolean)
          .join(", ");

        await pomodoroService.updateSessionTask(backendSessionId, taskText);
      } catch { /* empty */ }
    }, 500);

    return () => {
      if (taskSyncTimeoutRef.current) {
        clearTimeout(taskSyncTimeoutRef.current);
      }
    };
  }, [tasks, backendSessionId, backendSessionMode]);

  const closeBackendSession = useCallback(async () => {
    const persisted = readPersistedActiveSession();

    const effectiveSessionId = Number.isFinite(backendSessionId)
      ? backendSessionId
      : persisted?.sessionId ?? null;

    const effectiveMode = backendSessionMode ?? persisted?.mode ?? null;

    if (!effectiveSessionId || !effectiveMode) {
      throw new Error("Nincs aktív session azonosító a lezáráshoz.");
    }

    if (effectiveMode === "group") {
      if (typeof emitLeaveSession === "function") {
        emitLeaveSession({ sessionId: effectiveSessionId });
      }
      await pomodoroService.leaveSession(effectiveSessionId);
    } else {
      await pomodoroService.finishSession(effectiveSessionId);
    }

    clearLocalSessionState();
  }, [
    backendSessionId,
    backendSessionMode,
    emitLeaveSession,
    clearLocalSessionState,
  ]);

  const isWaitingGroupSync =
    groupFocusStartsAtMs != null && groupSyncNow < groupFocusStartsAtMs;

  const secondsUntilGroupFocus =
    groupFocusStartsAtMs != null
      ? Math.max(0, Math.ceil((groupFocusStartsAtMs - groupSyncNow) / 1000))
      : 0;

  const isLockedGroupSession =
    backendSessionMode === "group" && Boolean(backendSessionId);

  const showLeaveGroupButton =
    Boolean(backendSessionId) &&
    (backendSessionMode === "group" ||
      readPersistedActiveSession()?.mode === "group");

  const totalSecForPhase =
    mode === MODES.FOCUS
      ? focusMin * 60
      : mode === MODES.SHORT_BREAK
      ? shortBreakMin * 60
      : mode === MODES.LONG_BREAK
      ? longBreakMin * 60
      : focusMin * 60;

  const displaySecondsToShow =
    mode === MODES.PAUSED
      ? pausedRemainingSec
      : mode === MODES.IDLE || isWaitingGroupSync
      ? focusMin * 60
      : displaySeconds;

  const progress = isWaitingGroupSync
    ? Math.min(1, 1 - secondsUntilGroupFocus / 60)
    : totalSecForPhase > 0
    ? 1 - displaySecondsToShow / totalSecForPhase
    : 1;

  const handleAddTask = () => {
    if (!newTask.trim()) return;
    setTasks((prev) => [...prev, { title: newTask.trim(), done: false }]);
    setNewTask("");
  };

  const handleRemoveTask = (idx) => {
    setTasks((prev) => prev.filter((_, i) => i !== idx));
  };

  const toggleTaskDone = (idx) => {
    setTasks((prev) =>
      prev.map((task, i) =>
        i === idx ? { ...task, done: !task.done } : task
      )
    );
  };

  const handleStartSession = async () => {
    if (!isLoggedIn) {
      toast.error("A session mentéséhez be kell jelentkezned.");
      return;
    }

    const taskTitles = tasks.map((t) => t.title).filter(Boolean);

    try {
      setGroupStartLoading(true);

      if (isGroupSession) {
        if (!selectedGroupId) {
          toast.error("Válassz egy csoportot.");
          return;
        }

        const res = await pomodoroService.startSession({
          group_id: Number(selectedGroupId),
          mode: "FOCUS",
          tasks: taskTitles,
        });

        const sid = res.session_id ?? res.sessionid;
        setBackendSessionId(sid);
        setBackendSessionMode("group");
        persistActiveSession(sid, "group");

        const dl = res.invite_deadline
          ? Date.parse(res.invite_deadline)
          : res.invitedeadline
          ? Date.parse(res.invitedeadline)
          : NaN;

        if (Number.isFinite(dl) && Date.now() < dl) {
          setGroupFocusStartsAtMs(dl);
          setGroupSyncNow(Date.now());
          setSessionPhases(buildSessionPhases());
        } else {
          setSessionPhases(buildSessionPhases());
          triggerStartRingAnimation();
          startFocus();
        }

        toast.success(`Csoportos session elindítva (#${sid}).`);
        setShowSessionSetup(false);
        return;
      }

      const res = await pomodoroService.startSession({
        mode: "FOCUS",
        tasks: taskTitles,
      });

      const sid = res.session_id ?? res.sessionid;
      setBackendSessionId(sid);
      setBackendSessionMode("solo");
      persistActiveSession(sid, "solo");

      setSessionPhases(buildSessionPhases());
      triggerStartRingAnimation();
      startFocus();
      setShowSessionSetup(false);

      toast.success(`Session elindítva (#${sid}).`);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setGroupStartLoading(false);
    }
  };

  const handlePause = () => {
    if (isLockedGroupSession) return;
    if (isActive) startPause();
  };

  const handleResetClick = () => {
    if (isLockedGroupSession) return;
    setShowResetConfirm(true);
  };

  const confirmFullReset = async () => {
    if (isLockedGroupSession) {
      setShowResetConfirm(false);
      return;
    }

    try {
      await closeBackendSession();
      reset();
      setShowSessionSetup(true);
      setShowResetConfirm(false);
      toast.success("A session lezárva.");
    } catch (err) {
      toast.error(getApiErrorMessage(err) || "A session lezárása nem sikerült.");
    }
  };

  const handleLeaveGroupSession = async () => {
    try {
      await closeBackendSession();
      toast.success("Kiléptél a sessionből.");
      reset();
      setShowSessionSetup(true);
    } catch (err) {
      toast.error(getApiErrorMessage(err) || "A kilépés nem sikerült.");
    }
  };

  const copySessionId = async () => {
    if (!backendSessionId) return;

    try {
      await navigator.clipboard.writeText(String(backendSessionId));
      toast.success("Session ID a vágólapra másolva.");
    } catch {
      toast.error("Másolás sikertelen.");
    }
  };

  const cancelFullReset = () => {
    setShowResetConfirm(false);
  };

  const animatedStrokeDashoffset = showStartRingAnimation
    ? 0
    : CIRCLE_LENGTH * (1 - progress);

  useEffect(() => {
    if (hasOngoingSession || backendSessionId) {
      setShowSessionSetup(false);
      void restoreVisibleSessionState();
    }
  }, [hasOngoingSession, backendSessionId, restoreVisibleSessionState]);

  return (
    <div className="min-h-screen bg-background pt-0 md:pt-0 flex flex-col relative">
      <style>
        {`
          @keyframes pomodoro-ring-spin-once {
            from {
              stroke-dashoffset: ${CIRCLE_LENGTH};
            }
            to {
              stroke-dashoffset: 0;
            }
          }
        `}
      </style>

      <div className="absolute top-4 left-4">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="rounded-full h-8 w-8"
          onClick={() => setShowInfo(true)}
          aria-label="Mi az a Pomodoro módszer?"
        >
          <CircleHelp className="h-6 w-6" />
        </Button>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-6xl flex-1 flex flex-col">
        <header className="text-center mb-6">
          <h1 className="text-2xl font-bold text-foreground">Pomodoro Timer</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {focusMin} perc fókusz, {shortBreakMin} perc rövid szünet,{" "}
            {longBreakMin} perc hosszú szünet
          </p>
        </header>

        {showSessionSetup ? (
          <div className="w-full max-w-xl mx-auto mb-6 p-4 rounded-xl bg-muted/50 space-y-4">
            <div className="flex gap-3 text-sm">
              <button
                type="button"
                onClick={() => setIsGroupSession(false)}
                className={cn(
                  "flex-1 px-3 py-2 rounded-lg border text-center",
                  !isGroupSession
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-foreground"
                )}
              >
                Egyéni session
              </button>

              <button
                type="button"
                onClick={() => setIsGroupSession(true)}
                className={cn(
                  "flex-1 px-3 py-2 rounded-lg border text-center",
                  isGroupSession
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-foreground"
                )}
              >
                Csoportos session
              </button>
            </div>

            {isGroupSession && (
              <div className="space-y-2 rounded-lg border border-border/80 bg-background/50 p-3">
                {!isLoggedIn ? (
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Jelentkezz be, hogy csoportos sessiont indíthass.
                  </p>
                ) : groupsLoading ? (
                  <p className="text-sm text-muted-foreground">
                    Csoportok betöltése…
                  </p>
                ) : myGroups.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nincs egy csoportod sem. Csatlakozz egyhez a „Csoportjaim”
                    nézetben.
                  </p>
                ) : (
                  <>
                    <label
                      htmlFor="pomodoro-group-select"
                      className="text-sm font-medium text-foreground"
                    >
                      Melyik csoport?
                    </label>
                    <select
                      id="pomodoro-group-select"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      value={selectedGroupId}
                      onChange={(e) => setSelectedGroupId(e.target.value)}
                    >
                      <option value="">— Válassz csoportot —</option>
                      {myGroups.map((g) => (
                        <option key={g.id} value={String(g.id)}>
                          {g.name} ({g.subject})
                        </option>
                      ))}
                    </select>

                    <p className="text-xs text-muted-foreground leading-relaxed">
                      A fókusz időzítő a meghívó lejártakor indul mindenkinél
                      egyszerre.
                    </p>

                    {blockGroupStartDueToInvite && (
                      <p className="text-sm text-amber-800 dark:text-amber-200 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 mt-2">
                        Nyitott Pomodoro meghívó van függőben.
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Milyen feladatokon dolgozol a session alatt?
              </label>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  placeholder="Pl. Analízis házi 3. feladat"
                />
                <Button type="button" size="sm" onClick={handleAddTask}>
                  Hozzáadás
                </Button>
              </div>

              {tasks.length > 0 && (
                <ul className="text-sm space-y-1">
                  {tasks.map((t, idx) => (
                    <li
                      key={idx}
                      className="flex items-center justify-between rounded-md bg-background px-3 py-1 border border-border/60"
                    >
                      <span className="truncate">{t.title}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTask(idx)}
                        className="text-xs text-muted-foreground hover:text-destructive"
                      >
                        Törlés
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 items-center text-sm">
              <label className="text-muted-foreground">Fókusz (perc)</label>
              <input
                type="number"
                min={1}
                max={60}
                value={focusMin}
                onChange={(e) => setFocusMin(Number(e.target.value) || 25)}
                className="rounded-lg border border-border bg-background px-3 py-2"
              />

              <label className="text-muted-foreground">
                Rövid szünet (perc)
              </label>
              <input
                type="number"
                min={1}
                max={30}
                value={shortBreakMin}
                onChange={(e) =>
                  setShortBreakMin(Number(e.target.value) || 5)
                }
                className="rounded-lg border border-border bg-background px-3 py-2"
              />

              <label className="text-muted-foreground">
                Hosszú szünet (perc)
              </label>
              <input
                type="number"
                min={5}
                max={60}
                value={longBreakMin}
                onChange={(e) => setLongBreakMin(Number(e.target.value) || 15)}
                className="rounded-lg border border-border bg-background px-3 py-2"
              />

              <label className="text-muted-foreground">
                Fókusz blokkok száma
              </label>
              <input
                type="number"
                min={1}
                max={12}
                value={focusCount}
                onChange={(e) => setFocusCount(Number(e.target.value) || 4)}
                className="rounded-lg border border-border bg-background px-3 py-2"
              />
            </div>

            <div className="space-y-2 text-sm">
              <p className="font-medium text-foreground">
                Automatikus indítások
              </p>

              <label className="flex items-center gap-2 text-muted-foreground">
                <input
                  type="checkbox"
                  checked={autoFocusStart}
                  onChange={(e) => setAutoFocusStart(e.target.checked)}
                />
                Fókusz automatikusan induljon
              </label>

              <label className="flex items-center gap-2 text-muted-foreground">
                <input
                  type="checkbox"
                  checked={autoShortStart}
                  onChange={(e) => setAutoShortStart(e.target.checked)}
                />
                Rövid szünet automatikusan induljon
              </label>

              <label className="flex items-center gap-2 text-muted-foreground">
                <input
                  type="checkbox"
                  checked={autoLongStart}
                  onChange={(e) => setAutoLongStart(e.target.checked)}
                />
                Hosszú szünet automatikusan induljon
              </label>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={rememberSettings}
                onChange={(e) => setRememberSettings(e.target.checked)}
              />
              <span className="text-muted-foreground">
                Beállítások mentése későbbre
              </span>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                type="button"
                onClick={handleStartSession}
                disabled={
                  groupStartLoading ||
                  (isGroupSession && blockGroupStartDueToInvite) ||
                  (isGroupSession &&
                    (!isLoggedIn ||
                      groupsLoading ||
                      !selectedGroupId ||
                      myGroups.length === 0))
                }
                className="min-w-[140px] rounded-xl"
              >
                {groupStartLoading ? "Indítás…" : "Indítás"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col w-full gap-6">
            {backendSessionId && (
              <div className="w-full rounded-xl border border-primary/25 bg-primary/5 p-4 text-sm shrink-0">
                <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Users className="h-4 w-4 shrink-0 text-primary" />
                    <span className="font-medium text-foreground">
                      {backendSessionMode === "group"
                        ? "Csoportos session"
                        : "Session"}{" "}
                      #{backendSessionId}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8"
                      onClick={copySessionId}
                    >
                      <Copy className="h-3.5 w-3.5 mr-1" />
                      ID másolása
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {showLeaveGroupButton && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleLeaveGroupSession}
                      >
                        Kilépés
                      </Button>
                    )}
                  </div>
                </div>

                {sessionSnapshot?.participants?.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {sessionSnapshot.participants.map((p, idx) => {
                      const userId = p.user_id ?? p.userid ?? idx;
                      const leftAt = p.left_at ?? p.leftat;
                      return (
                        <li
                          key={userId}
                          className="rounded-md bg-background/90 px-2 py-1 border border-border/60"
                        >
                          Felhasználó #{userId}
                          {leftAt ? " · kilépett" : " · aktív"}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}

            <div className="flex-1 flex flex-col md:flex-row gap-10 lg:gap-16 items-start">
              <div className="w-full md:w-64 lg:w-72 md:self-stretch rounded-xl border border-border bg-muted/40 p-4 flex flex-col">
                <h2 className="text-sm font-semibold text-foreground mb-2">
                  Session feladatok
                </h2>

                {tasks.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Nincs felvett feladat ehhez a sessionhöz.
                  </p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {tasks.map((t, idx) => (
                      <li
                        key={idx}
                        className="flex items-center gap-2 rounded-md bg-background px-3 py-2 border border-border/60"
                      >
                        <input
                          type="checkbox"
                          className="shrink-0"
                          checked={t.done}
                          onChange={() => toggleTaskDone(idx)}
                        />
                        <span
                          className={cn(
                            "truncate",
                            t.done && "line-through text-muted-foreground"
                          )}
                        >
                          {t.title}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex-1 flex flex-col items-center">
                <div className="relative flex justify-center items-center w-full max-w-[min(90vw,20rem)] md:max-w-[min(90vw,24rem)] aspect-square my-4 mx-auto">
                  <svg
                    className="w-full h-full -rotate-90"
                    viewBox="0 0 100 100"
                    fill="none"
                  >
                    <defs>
                      <linearGradient
                        id="timerGradient"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="100%"
                      >
                        <stop offset="0%" stopColor="var(--primary)" />
                        <stop offset="100%" stopColor="var(--chart-2)" />
                      </linearGradient>
                    </defs>

                    <circle
                      cx="50"
                      cy="50"
                      r={CIRCLE_RADIUS}
                      stroke="var(--border)"
                      strokeWidth="5"
                      fill="none"
                    />

                    <circle
                      key={startRingKey}
                      cx="50"
                      cy="50"
                      r={CIRCLE_RADIUS}
                      stroke="url(#timerGradient)"
                      strokeWidth="5"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={CIRCLE_LENGTH}
                      strokeDashoffset={animatedStrokeDashoffset}
                      style={
                        showStartRingAnimation
                          ? {
                              animation: `pomodoro-ring-spin-once ${START_RING_ANIMATION_MS}ms linear 1`,
                            }
                          : {
                              transition: "stroke-dashoffset 250ms linear",
                            }
                      }
                    />
                  </svg>

                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-5xl sm:text-6xl md:text-7xl font-semibold tabular-nums text-foreground tracking-tight">
                      {formatTime(displaySecondsToShow)}
                    </span>

                    <span className="text-sm text-muted-foreground mt-2 font-medium">
                    {isWaitingGroupSync
                      ? `Együtt indulás ${secondsUntilGroupFocus} mp múlva`
                      : getModeLabel(mode, MODES, false)}
                      {!isWaitingGroupSync &&
                        mode === MODES.FOCUS &&
                        currentCycle > 0 && (
                          <span className="ml-1">
                            ({currentCycle + 1}. / {CYCLES_BEFORE_LONG_BREAK})
                          </span>
                        )}
                    </span>
                  </div>
                </div>

                <div className="flex justify-center gap-3 mb-4 w-full flex-wrap">
                  {!isLockedGroupSession &&
                    (mode === MODES.IDLE || mode === MODES.PAUSED) &&
                    !isWaitingGroupSync && (
                      <Button
                        onClick={handleStartSession}
                        className="min-w-[120px] rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                      >
                        {mode === MODES.IDLE ? "Indítás" : "Folytatás"}
                      </Button>
                    )}

                  {!isLockedGroupSession && isActive && (
                    <Button
                      onClick={handlePause}
                      variant="outline"
                      className="min-w-[120px] rounded-xl"
                    >
                      Szüneteltetés
                    </Button>
                  )}

                  {!isLockedGroupSession &&
                    (isActive || mode === MODES.PAUSED) && (
                      <Button
                        onClick={handleResetClick}
                        variant="outline"
                        className="rounded-xl"
                      >
                        Reset
                      </Button>
                    )}
                </div>

                {isLockedGroupSession && (
                  <p className="text-xs text-muted-foreground text-center max-w-md mx-auto px-2 mb-2 leading-relaxed">
                    Csoportos session: a timert nem lehet megállítani vagy
                    visszaállítani. A részvételedet csak a fenti{" "}
                    <span className="font-medium text-foreground">Kilépés</span>{" "}
                    gombbal zárhatod be.
                  </p>
                )}
              </div>

              <div className="w-full md:w-64 lg:w-72 md:self-stretch rounded-xl border border-border bg-muted/40 p-4 flex flex-col">
                <h2 className="text-sm font-semibold text-foreground mb-2">
                  Session ciklusok
                </h2>

                {sessionPhases.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    A session indulásakor generáljuk a fókusz és szünet
                    blokkokat.
                  </p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {sessionPhases.map((phase, idx) => {
                      const isDone = idx < completedPhases;
                      return (
                        <li
                          key={idx}
                          className="flex items-center gap-2 rounded-md bg-background px-3 py-2 border border-border/60"
                        >
                          <input
                            type="checkbox"
                            className="shrink-0"
                            checked={isDone}
                            readOnly
                          />
                          <span
                            className={cn(
                              "truncate",
                              isDone && "line-through text-muted-foreground"
                            )}
                          >
                            {phase.label}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mt-auto pt-8 w-full max-w-xl mx-auto border-t border-border/60">
          <div className="flex items-start gap-2 py-3 text-muted-foreground">
            <Lightbulb className="h-5 w-5 text-amber-500/80 shrink-0 mt-0.5" />
            <p className="text-sm leading-relaxed">
              Egy blokk is sokat számít: indítsd az órát, és addig csak arra az
              egy feladatra figyelj. A pihenő is a módszer része — így tartod a
              tempót. 🍅
            </p>
          </div>
        </div>
      </div>

      {showInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-popover p-5 shadow-lg space-y-4">
            <h2 className="text-lg font-semibold text-foreground">
              Mi az a Pomodoro módszer?
            </h2>

            <div className="space-y-3 text-sm text-muted-foreground">
              <div>
                <p className="font-medium text-foreground mb-1">
                  Rövid, fókuszált blokkok – tudatos szünetekkel
                </p>
                <p>
                  A Pomodoro módszer lényege, hogy{" "}
                  <span className="font-medium text-foreground">
                    egyetlen feladatra fókuszálsz
                  </span>{" "}
                  rövid, időzített blokkokban, köztük{" "}
                  <span className="font-medium text-foreground">
                    kötelező pihenőkkel
                  </span>
                  .
                </p>
              </div>

              <div>
                <p className="font-medium text-foreground mb-1">
                  Hogyan használd ezt az órát?
                </p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Válassz egy konkrét feladatot a listádból.</li>
                  <li>Indíts el egy fókusz blokkot (pl. 25 perc).</li>
                  <li>
                    Csak arra a feladatra figyelj –{" "}
                    <span className="font-medium text-foreground">
                      nincs telefon, nincs multitasking
                    </span>
                    .
                  </li>
                  <li>Amikor lejár az idő, tarts egy rövid szünetet.</li>
                  <li>
                    3–4 kör után tarts egy{" "}
                    <span className="font-medium text-foreground">
                      hosszabb pihenőt
                    </span>
                    .
                  </li>
                </ol>
              </div>

              <div>
                <p className="font-medium text-foreground mb-1">
                  Miért működik?
                </p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Segít elindulni akkor is, ha halogatsz.</li>
                  <li>Csökkenti a szétesett figyelmet és a multitaskingot.</li>
                  <li>
                    A szünetek megelőzik a kifáradást, így tovább tudsz{" "}
                    <span className="font-medium text-foreground">
                      koncentráltan dolgozni
                    </span>
                    .
                  </li>
                </ul>
              </div>

              <p className="text-xs text-muted-foreground border-t border-border/60 pt-2">
                Tipp: ha túl hosszúnak érzed a 25 percet, kezdd rövidebb
                blokkokkal (pl. 15 perc), és fokozatosan növeld.
              </p>
            </div>

            <div className="flex justify-end pt-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowInfo(false)}
              >
                Bezárás
              </Button>
            </div>
          </div>
        </div>
      )}

      {showSessionComplete && sessionSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-popover p-5 shadow-lg space-y-4">
            <h2 className="text-lg font-semibold text-foreground">
              Gratulálok, végigcsináltad a {sessionSummary.plannedRounds} körös
              pomodoro sessiont!
            </h2>

            <div className="rounded-lg border border-border/60 bg-muted/40 p-4 space-y-2 text-sm">
              <p className="text-foreground font-medium">Rövid statisztika</p>
              <p className="text-muted-foreground">
                Fókusz idő:{" "}
                <span className="font-medium text-foreground">
                  {sessionSummary.focusMinutes} perc
                </span>
              </p>
              <p className="text-muted-foreground">
                Elvégzett feladatok:{" "}
                <span className="font-medium text-foreground">
                  {sessionSummary.completedTasks}
                </span>
              </p>
            </div>

            <div className="flex justify-end pt-1">
              <Button
                type="button"
                size="sm"
                onClick={() => setShowSessionComplete(false)}
              >
                Rendben
              </Button>
            </div>
          </div>
        </div>
      )}

      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-border bg-popover p-5 shadow-lg space-y-4">
            <h2 className="text-lg font-semibold text-foreground">
              Session visszaállítása?
            </h2>
            <p className="text-sm text-muted-foreground">
              Ez leállítja a jelenlegi sessiont és visszavisz a beállításokhoz.
            </p>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={cancelFullReset}
              >
                Mégse
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={confirmFullReset}
              >
                Reset
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}