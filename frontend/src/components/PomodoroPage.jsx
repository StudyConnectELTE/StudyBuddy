import { useState, useEffect, useRef, useCallback } from "react";
import { Lightbulb } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "./ui/utils";

const MODES = {
  IDLE: "IDLE",
  FOCUS: "FOCUS",
  SHORT_BREAK: "SHORT_BREAK",
  LONG_BREAK: "LONG_BREAK",
  PAUSED: "PAUSED",
};

const DEFAULT_FOCUS_MIN = 25;
const DEFAULT_SHORT_BREAK_MIN = 5;
const DEFAULT_LONG_BREAK_MIN = 15;
const CYCLES_BEFORE_LONG_BREAK = 4;

function formatTime(seconds) {
  if (seconds == null || seconds < 0) return "25:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getModeLabel(mode) {
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

export function PomodoroPage() {
  const [mode, setMode] = useState(MODES.IDLE);
  const [currentCycle, setCurrentCycle] = useState(0);
  const [endTime, setEndTime] = useState(null);
  const [pausedRemainingSec, setPausedRemainingSec] = useState(0);
  const [pausedFromMode, setPausedFromMode] = useState(null);
  const [displaySeconds, setDisplaySeconds] = useState(DEFAULT_FOCUS_MIN * 60);
  const [focusMin, setFocusMin] = useState(DEFAULT_FOCUS_MIN);
  const [shortBreakMin, setShortBreakMin] = useState(DEFAULT_SHORT_BREAK_MIN);
  const [longBreakMin, setLongBreakMin] = useState(DEFAULT_LONG_BREAK_MIN);
  const [showSettings, setShowSettings] = useState(false);
  const tickRef = useRef(null);

  const isActive =
    mode === MODES.FOCUS ||
    mode === MODES.SHORT_BREAK ||
    mode === MODES.LONG_BREAK;
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
      : mode === MODES.IDLE
        ? focusMin * 60
        : displaySeconds;
  const progress =
    totalSecForPhase > 0 ? 1 - displaySecondsToShow / totalSecForPhase : 1;

  const startFocus = useCallback(() => {
    const now = Date.now();
    setEndTime(now + focusMin * 60 * 1000);
    setMode(MODES.FOCUS);
    setCurrentCycle(0);
  }, [focusMin]);

  const startPause = useCallback(() => {
    if (!isActive || !endTime) return;
    const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
    setPausedRemainingSec(remaining);
    setPausedFromMode(mode);
    setMode(MODES.PAUSED);
    setEndTime(null);
  }, [isActive, endTime, mode]);

  const resume = useCallback(() => {
    if (mode !== MODES.PAUSED || pausedFromMode == null) return;
    const now = Date.now();
    setEndTime(now + pausedRemainingSec * 1000);
    setMode(pausedFromMode);
    setPausedFromMode(null);
    setPausedRemainingSec(0);
  }, [mode, pausedFromMode, pausedRemainingSec]);

  const reset = useCallback(() => {
    setMode(MODES.IDLE);
    setEndTime(null);
    setPausedRemainingSec(0);
    setPausedFromMode(null);
    setDisplaySeconds(focusMin * 60);
    setCurrentCycle(0);
  }, [focusMin]);

  const transitionOnPhaseEnd = useCallback(() => {
    if (mode === MODES.FOCUS) {
      const nextCycle = currentCycle + 1;
      if (nextCycle >= CYCLES_BEFORE_LONG_BREAK) {
        setCurrentCycle(0);
        setEndTime(Date.now() + longBreakMin * 60 * 1000);
        setMode(MODES.LONG_BREAK);
      } else {
        setCurrentCycle(nextCycle);
        setEndTime(Date.now() + shortBreakMin * 60 * 1000);
        setMode(MODES.SHORT_BREAK);
      }
    } else if (mode === MODES.SHORT_BREAK) {
      setEndTime(Date.now() + focusMin * 60 * 1000);
      setMode(MODES.FOCUS);
    } else if (mode === MODES.LONG_BREAK) {
      setEndTime(Date.now() + focusMin * 60 * 1000);
      setMode(MODES.FOCUS);
      setCurrentCycle(0);
    }
  }, [mode, currentCycle, focusMin, shortBreakMin, longBreakMin]);

  useEffect(() => {
    if (mode === MODES.PAUSED || mode === MODES.IDLE || !endTime) return;

    const tick = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((endTime - now) / 1000));
      setDisplaySeconds(remaining);
      if (remaining <= 0) {
        transitionOnPhaseEnd();
      }
    };

    tick();
    tickRef.current = setInterval(tick, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [mode, endTime, transitionOnPhaseEnd]);

  const handleStart = () => {
    if (mode === MODES.IDLE) startFocus();
    else if (mode === MODES.PAUSED) resume();
  };

  const handlePause = () => {
    if (isActive) startPause();
  };

  return (
    <div className="min-h-screen bg-background pt-0 md:pt-0 flex flex-col">
      <div className="container mx-auto px-6 py-6 max-w-4xl flex-1 flex flex-col items-center justify-center">
        <header className="text-center mb-6">
          <h1 className="text-2xl font-bold text-foreground">Pomodoro Timer</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {focusMin} perc fókusz, {shortBreakMin} perc rövid szünet,{" "}
            {longBreakMin} perc hosszú szünet
          </p>
        </header>

        <div className="relative flex justify-center items-center w-full max-w-[min(90vw,28rem)] aspect-square my-4">
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
            <span className="text-6xl sm:text-7xl md:text-8xl font-semibold tabular-nums text-foreground tracking-tight">
              {formatTime(displaySecondsToShow)}
            </span>
            <span className="text-sm text-muted-foreground mt-2 font-medium">
              {getModeLabel(mode)}
              {mode === MODES.FOCUS && currentCycle > 0 && (
                <span className="ml-1">
                  ({currentCycle + 1}. / {CYCLES_BEFORE_LONG_BREAK})
                </span>
              )}
            </span>
          </div>
        </div>

        <div className="flex justify-center gap-3 mb-4 w-full flex-wrap">
          {(mode === MODES.IDLE || mode === MODES.PAUSED) && (
            <Button
              onClick={handleStart}
              className="min-w-[120px] rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
            >
              {mode === MODES.IDLE ? "Indítás" : "Folytatás"}
            </Button>
          )}
          {isActive && (
            <Button
              onClick={handlePause}
              variant="outline"
              className="min-w-[120px] rounded-xl"
            >
              Szüneteltetés
            </Button>
          )}
          {(isActive || mode === MODES.PAUSED) && (
            <Button onClick={reset} variant="outline" className="rounded-xl">
              Reset
            </Button>
          )}
        </div>

        <div className="text-center mb-6">
          <button
            type="button"
            onClick={() => setShowSettings((s) => !s)}
            className="text-sm text-muted-foreground hover:text-foreground underline"
          >
            {showSettings ? "Beállítások elrejtése" : "Időtartamok (beállítás)"}
          </button>
        </div>

        {showSettings && (
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
    </div>
  );
}
