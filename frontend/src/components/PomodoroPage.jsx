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

export function PomodoroPage({ blockGroupStartDueToInvite = false }) {
  const [isGroupSession, setIsGroupSession] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [focusCount, setFocusCount] = useState(4);
  const [autoFocusStart, setAutoFocusStart] = useState(true);
  const [autoShortStart, setAutoShortStart] = useState(true);
  const [autoLongStart, setAutoLongStart] = useState(true);
  const [rememberSettings, setRememberSettings] = useState(false);

  const [showLegacySettings, setShowLegacySettings] = useState(false);
  const [showSessionSetup, setShowSessionSetup] = useState(true);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const [sessionPhases, setSessionPhases] = useState([]);

  const [myGroups, setMyGroups] = useState([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [groupStartLoading, setGroupStartLoading] = useState(false);
  const [backendSessionId, setBackendSessionId] = useState(null);
  const [sessionSnapshot, setSessionSnapshot] = useState(null);
  /** Csoportos: a fókusz időzítő csak ettől az időbélyegtől (invite_deadline, szerver UTC) */
  const [groupFocusStartsAtMs, setGroupFocusStartsAtMs] = useState(null);
  const [groupSyncNow, setGroupSyncNow] = useState(Date.now());
  const groupSyncStartFiredRef = useRef(false);
  const [showInfo, setShowInfo] = useState(false);

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
    resume,
    reset,
    completedPhases,
  } = usePomodoro();

  const isLoggedIn = authService.isAuthenticated();

  const bootstrapAcceptedSession = useCallback(
    async (sessionId) => {
      const sid = Number(sessionId);
      if (!Number.isFinite(sid)) return;
      setBackendSessionId(sid);
      localStorage.setItem("pomodoroGroupSessionId", String(sid));
      try {
        const s = await pomodoroService.getSession(sid);
        const deadlineIso = s.invite_deadline;
        if (deadlineIso) {
          const ms = Date.parse(deadlineIso);
          if (Number.isFinite(ms) && Date.now() < ms) {
            setGroupFocusStartsAtMs(ms);
            setGroupSyncNow(Date.now());
            setShowSessionSetup(false);
            return;
          }
        }
        const phases = [];
        for (let i = 1; i <= focusCount; i++) {
          phases.push({ label: `${i}. Fókusz` });
          if (i < focusCount) {
            phases.push({ label: `${i}. Rövid szünet` });
          }
        }
        phases.push({ label: "Hosszú szünet" });
        setSessionPhases(phases);
        setShowSessionSetup(false);
        startFocus();
      } catch (e) {
        const code = e?.response?.data?.code;
        localStorage.removeItem("pomodoroGroupSessionId");
        setBackendSessionId(null);
        if (code === "INVITE_PENDING") return;
      }
    },
    [focusCount, startFocus],
  );

  useEffect(() => {
    const onAccepted = (e) => {
      const sid = e.detail?.sessionId;
      if (sid == null) return;
      void bootstrapAcceptedSession(sid);
    };
    window.addEventListener("pomodoro-session-accepted", onAccepted);
    return () => window.removeEventListener("pomodoro-session-accepted", onAccepted);
  }, [bootstrapAcceptedSession]);

  useEffect(() => {
    const raw = localStorage.getItem("pomodoroGroupSessionId");
    if (!raw) return;
    void bootstrapAcceptedSession(Number(raw));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- induláskor egyszer: LS-ből visszaállítás
  }, []);

  useEffect(() => {
    groupSyncStartFiredRef.current = false;
  }, [groupFocusStartsAtMs]);

  useEffect(() => {
    if (groupFocusStartsAtMs == null) return;
    const id = setInterval(() => {
      const now = Date.now();
      setGroupSyncNow(now);
      if (
        now >= groupFocusStartsAtMs &&
        !groupSyncStartFiredRef.current
      ) {
        groupSyncStartFiredRef.current = true;
        const phases = [];
        for (let i = 1; i <= focusCount; i++) {
          phases.push({ label: `${i}. Fókusz` });
          if (i < focusCount) {
            phases.push({ label: `${i}. Rövid szünet` });
          }
        }
        phases.push({ label: "Hosszú szünet" });
        setSessionPhases(phases);
        startFocus();
        setGroupFocusStartsAtMs(null);
      }
    }, 250);
    return () => clearInterval(id);
  }, [groupFocusStartsAtMs, focusCount, startFocus]);

  useEffect(() => {
    if (!isGroupSession || !showSessionSetup || !isLoggedIn) return;
    let cancelled = false;
    (async () => {
      try {
        setGroupsLoading(true);
        const data = await groupService.myGroups();
        if (!cancelled) setMyGroups(data.groups || []);
      } catch {
        if (!cancelled) toast.error("Nem sikerült betölteni a csoportjaidat.");
      } finally {
        if (!cancelled) setGroupsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isGroupSession, showSessionSetup, isLoggedIn]);

  const { participants: wsParticipants, emitLeaveSession } = useGroupSession({
    backendSessionId: showSessionSetup ? null : backendSessionId,
    onSessionFinished: () => {
      toast.message("A csoportos session a szerveren lezárult.");
      setBackendSessionId(null);
      localStorage.removeItem("pomodoroGroupSessionId");
      reset();
      setShowSessionSetup(true);
    },
    onInviteReceived: null,
  });

  useEffect(() => {
    if (!backendSessionId || showSessionSetup) {
      setSessionSnapshot(null);
      return;
    }
    setSessionSnapshot({ participants: wsParticipants });
  }, [wsParticipants, backendSessionId, showSessionSetup]);

  const clearGroupBackendSession = async () => {
    const id = backendSessionId;
    if (!id) return;
    emitLeaveSession();
    try {
      await pomodoroService.leaveSession(id);
    } catch {
      /* reset mindenképp */
    }
    setBackendSessionId(null);
    localStorage.removeItem("pomodoroGroupSessionId");
    setSessionSnapshot(null);
    setGroupFocusStartsAtMs(null);
  };

  const isWaitingGroupSync =
    groupFocusStartsAtMs != null && groupSyncNow < groupFocusStartsAtMs;
  const secondsUntilGroupFocus =
    groupFocusStartsAtMs != null
      ? Math.max(0, Math.ceil((groupFocusStartsAtMs - groupSyncNow) / 1000))
      : 0;

  /** Szinkron csoportos session (backend): csak Kilépés — nincs szünet / reset / középső Indítás */
  const isLockedGroupSession = Boolean(backendSessionId);

  useEffect(() => {
    if (backendSessionId) setShowLegacySettings(false);
  }, [backendSessionId]);

  const totalSecForPhase =
    mode === MODES.FOCUS
      ? focusMin * 60
      : mode === MODES.SHORT_BREAK
      ? shortBreakMin * 60
      : mode === MODES.LONG_BREAK
      ? longBreakMin * 60
      : focusMin * 60;

  const displaySecondsToShow = isWaitingGroupSync
    ? secondsUntilGroupFocus
    : mode === MODES.PAUSED
      ? pausedRemainingSec
      : mode === MODES.IDLE
      ? focusMin * 60
      : displaySeconds;

  const progress = isWaitingGroupSync
    ? Math.min(1, 1 - secondsUntilGroupFocus / 60)
    : totalSecForPhase > 0
      ? 1 - displaySecondsToShow / totalSecForPhase
      : 1;

  const buildSessionPhases = () => {
    const phases = [];
    for (let i = 1; i <= focusCount; i++) {
      phases.push({ label: `${i}. Fókusz` });
      if (i < focusCount) {
        phases.push({ label: `${i}. Rövid szünet` });
      }
    }
    phases.push({ label: "Hosszú szünet" });
    return phases;
  };

  const handleAddTask = () => {
    if (!newTask.trim()) return;
    setTasks((prev) => [
      ...prev,
      { title: newTask.trim(), done: false },
    ]);
    setNewTask("");
  };

  const handleRemoveTask = (idx) => {
    setTasks((prev) => prev.filter((_, i) => i !== idx));
  };

  const toggleTaskDone = (idx) => {
    if (isLockedGroupSession) return;
    setTasks((prev) =>
      prev.map((task, i) =>
        i === idx ? { ...task, done: !task.done } : task,
      ),
    );
  };

  const handleStartSession = async () => {
    if (isGroupSession) {
      if (!isLoggedIn) {
        toast.error("Csoportos sessionhez jelentkezz be.");
        return;
      }
      if (!selectedGroupId) {
        toast.error("Válassz egy csoportot.");
        return;
      }
      try {
        setGroupStartLoading(true);
        const taskTitles = tasks.map((t) => t.title);
        const res = await pomodoroService.startSession({
          group_id: Number(selectedGroupId),
          mode: "FOCUS",
          tasks: taskTitles,
        });
        setBackendSessionId(res.session_id);
        localStorage.setItem(
          "pomodoroGroupSessionId",
          String(res.session_id),
        );
        const dl = res.invite_deadline ? Date.parse(res.invite_deadline) : NaN;
        if (Number.isFinite(dl) && Date.now() < dl) {
          setGroupFocusStartsAtMs(dl);
          setGroupSyncNow(Date.now());
        } else {
          setSessionPhases(buildSessionPhases());
          startFocus();
        }
        toast.success(
          `Csoportos session (#${res.session_id}) — a fókusz mindenkinél egyszerre indul, amikor lejár a meghívó.`,
        );
      } catch (err) {
        toast.error(getApiErrorMessage(err));
        setGroupStartLoading(false);
        return;
      }
      setGroupStartLoading(false);
      setShowSessionSetup(false);
      return;
    }

    if (mode === MODES.IDLE) {
      setSessionPhases(buildSessionPhases());
      startFocus();
    } else if (mode === MODES.PAUSED) {
      resume();
    }
    setShowSessionSetup(false);
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
    setGroupFocusStartsAtMs(null);
    reset();
    setShowSessionSetup(true);
    setShowResetConfirm(false);
  };

  const handleLeaveGroupSession = async () => {
    await clearGroupBackendSession();
    toast.success("Kiléptél a csoportos sessionből.");
    reset();
    setShowSessionSetup(true);
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

  return (
    <div className="min-h-screen bg-background pt-0 md:pt-0 flex flex-col relative">
      {/* Infó gomb bal felső sarokban */}
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
                    : "border-border text-foreground",
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
                    : "border-border text-foreground",
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
                      A fókusz időzítő a meghívó lejártakor indul mindenkinél egyszerre
                      (host és elfogadók). Ne indíts új csoportos sessiont, amíg függő
                      meghívód van — előbb válaszolj a felugró ablakban.
                    </p>
                    {blockGroupStartDueToInvite && (
                      <p className="text-sm text-amber-800 dark:text-amber-200 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 mt-2">
                        Nyitott Pomodoro meghívó — fogadd el vagy utasítsd el a felugró
                        ablakban, különben nem indíthatsz új csoportos sessiont.
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
                onChange={(e) => setShortBreakMin(Number(e.target.value) || 5)}
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
              <p className="font-medium text-foreground">Automatikus indítások</p>
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
                Beállítások mentése későbbre (később implementáljuk)
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
                      Csoportos session #{backendSessionId}
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
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleLeaveGroupSession}
                    >
                      Kilépés
                    </Button>
                  </div>
                </div>
                {sessionSnapshot?.participants?.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {sessionSnapshot.participants.map((p) => (
                      <li
                        key={p.user_id}
                        className="rounded-md bg-background/90 px-2 py-1 border border-border/60"
                      >
                        Felhasználó #{p.user_id}
                        {p.left_at ? " · kilépett" : " · aktív"}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <div className="flex-1 flex flex-col md:flex-row gap-10 lg:gap-16 items-start">
            {/* Bal: session feladatok panel */}
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
                        disabled={isLockedGroupSession}
                        onChange={() => toggleTaskDone(idx)}
                      />
                      <span
                        className={cn(
                          "truncate",
                          t.done && "line-through text-muted-foreground",
                        )}
                      >
                        {t.title}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Közép: timer blokk */}
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
                    r="44"
                    stroke="var(--border)"
                    strokeWidth="5"
                    fill="none"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="44"
                    stroke="url(#timerGradient)"
                    strokeWidth="5"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 44}
                    strokeDashoffset={2 * Math.PI * 44 * (1 - progress)}
                    className="transition-all duration-1000 ease-linear"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-5xl sm:text-6xl md:text-7xl font-semibold tabular-nums text-foreground tracking-tight">
                    {formatTime(displaySecondsToShow)}
                  </span>
                  <span className="text-sm text-muted-foreground mt-2 font-medium">
                    {getModeLabel(mode, MODES, isWaitingGroupSync)}
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
                  Csoportos session: a timert nem lehet megállítani vagy visszaállítani. A részvételedet csak a fenti{" "}
                  <span className="font-medium text-foreground">Kilépés</span>{" "}
                  gombbal zárhatod be.
                </p>
              )}
            </div>

            {/* Jobb: session fázisok listája */}
            <div className="w-full md:w-64 lg:w-72 md:self-stretch rounded-xl border border-border bg-muted/40 p-4 flex flex-col">
              <h2 className="text-sm font-semibold text-foreground mb-2">
                Session ciklusok
              </h2>
              {sessionPhases.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  A session indulásakor generáljuk a fókusz és szünet blokkokat.
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
                            isDone && "line-through text-muted-foreground",
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

        <div className="text-center mb-6">
          <button
            type="button"
            onClick={() => setShowLegacySettings((s) => !s)}
            disabled={isLockedGroupSession}
            className={cn(
              "text-sm underline",
              isLockedGroupSession
                ? "text-muted-foreground/50 cursor-not-allowed"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {showLegacySettings
              ? "Beállítások elrejtése"
              : "Időtartamok (részletes beállítás)"}
          </button>
          {isLockedGroupSession && (
            <p className="text-xs text-muted-foreground mt-2">
              Csoportos session alatt az időtartamok nem módosíthatók.
            </p>
          )}
        </div>

        {showLegacySettings && !isLockedGroupSession && (
          <div className="w-full max-w-sm mx-auto mb-6 p-4 rounded-xl bg-muted/50 space-y-3">
            <div className="grid grid-cols-2 gap-2 items-center text-sm">
              <label className="text-muted-foreground">Fókusz (perc)</label>
              <input
                type="number"
                min={1}
                max={60}
                value={focusMin}
                onChange={(e) => setFocusMin(Number(e.target.value) || 25)}
                disabled={isActive || mode === MODES.PAUSED}
                className={cn(
                  "rounded-lg border border-border bg-background px-3 py-2",
                  "disabled:opacity-60",
                )}
              />
              <label className="text-muted-foreground">
                Rövid szünet (perc)
              </label>
              <input
                type="number"
                min={1}
                max={30}
                value={shortBreakMin}
                onChange={(e) => setShortBreakMin(Number(e.target.value) || 5)}
                disabled={isActive || mode === MODES.PAUSED}
                className={cn(
                  "rounded-lg border border-border bg-background px-3 py-2",
                  "disabled:opacity-60",
                )}
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
                disabled={isActive || mode === MODES.PAUSED}
                className={cn(
                  "rounded-lg border border-border bg-background px-3 py-2",
                  "disabled:opacity-60",
                )}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {CYCLES_BEFORE_LONG_BREAK} fókusz blokk után jön a hosszú szünet.
            </p>
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

      {/* ÚJ: Pomodoro infó modál */}
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
            </span>.
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
              </span>.
            </li>
            <li>Amikor lejár az idő, tarts egy rövid szünetet.</li>
            <li>
              3–4 kör után tarts egy{" "}
              <span className="font-medium text-foreground">
                hosszabb pihenőt
              </span>.
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
              </span>.
            </li>
          </ul>
        </div>

        <p className="text-xs text-muted-foreground border-t border-border/60 pt-2">
          Tipp: ha túl hosszúnak érzed a 25 percet, kezdd rövidebb blokkokkal
          (pl. 15 perc), és fokozatosan növeld.
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

      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-border bg-popover p-4 shadow-lg space-y-3">
            <h2 className="text-sm font-semibold text-foreground">
              Biztosan újrakezded a sessiont?
            </h2>
            <p className="text-xs text-muted-foreground">
              A timer visszaáll, és visszakerülsz a beállítások oldalra. Ha
              folytatni szeretnéd a jelenlegi sessiont, válaszd a Mégse gombot.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={cancelFullReset}
              >
                Mégse
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={confirmFullReset}
              >
                Igen, újrakezdés
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}