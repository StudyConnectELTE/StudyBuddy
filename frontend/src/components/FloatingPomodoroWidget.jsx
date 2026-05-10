import { useEffect, useMemo, useState } from "react";
import { usePomodoro } from "../context/usePomodoro";
import { cn } from "./ui/utils";

const ACTIVE_SESSION_KEY = "pomodoroActiveSession";

function formatTime(seconds) {
  if (seconds == null || seconds < 0) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
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

export function FloatingPomodoroWidget({
  currentPage,
  onOpenPomodoro,
}) {
  const { MODES, mode, displaySeconds, pausedRemainingSec, focusMin } =
    usePomodoro();

  const [persistedSession, setPersistedSession] = useState(() =>
    readPersistedActiveSession()
  );

  useEffect(() => {
    const sync = () => {
      setPersistedSession(readPersistedActiveSession());
    };

    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("pomodoro-session-storage-changed", sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("pomodoro-session-storage-changed", sync);
    };
  }, []);

  const hasLiveTimer =
    mode === MODES.FOCUS ||
    mode === MODES.SHORT_BREAK ||
    mode === MODES.LONG_BREAK ||
    mode === MODES.PAUSED;

  const hasPersistedSession = Boolean(persistedSession?.sessionId);
  const isPersistedGroup = persistedSession?.mode === "group";

  const isVisible =
    currentPage !== "pomodoro" && (hasLiveTimer || hasPersistedSession);

  const sessionTitle = isPersistedGroup
    ? "Csoportos session"
    : "Pomodoro session";

  const phaseLabel = useMemo(() => {
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
        return hasPersistedSession ? "Aktív session" : "";
    }
  }, [mode, MODES, hasPersistedSession]);

  const secondsToShow = hasLiveTimer
    ? mode === MODES.PAUSED
      ? pausedRemainingSec
      : displaySeconds
    : focusMin * 60;

  if (!isVisible) return null;

  return (
    <button
      type="button"
      onClick={onOpenPomodoro}
      className="fixed top-4 right-4 z-50 w-[220px] text-left"
    >
      <div
        className={cn(
          "rounded-2xl border border-sidebar-border/40 bg-sidebar/95 shadow-2xl",
          "backdrop-blur-md px-4 py-3",
          "hover:shadow-[0_18px_45px_rgba(0,0,0,0.25)] hover:scale-[1.02] transition-all duration-200"
        )}
      >
        <div className="flex flex-col min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wide text-sidebar-foreground/70">
            {sessionTitle}
          </div>

          <div className="mt-1 text-2xl font-semibold tabular-nums text-sidebar-foreground leading-none">
            {formatTime(secondsToShow)}
          </div>

          <div className="mt-1 text-xs text-sidebar-foreground/70">
            {phaseLabel}
          </div>

          <div className="mt-2 text-[0.65rem] text-sidebar-foreground/60">
            Koppints a részletekhez
          </div>
        </div>
      </div>
    </button>
  );
}