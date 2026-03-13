import { useState, useEffect, useRef, useCallback } from "react";
import { PomodoroContext } from "./pomodoroContext2";

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

export function PomodoroProvider({ children }) {
  const [mode, setMode] = useState(MODES.IDLE);
  const [currentCycle, setCurrentCycle] = useState(0);
  const [endTime, setEndTime] = useState(null);
  const [pausedRemainingSec, setPausedRemainingSec] = useState(0);
  const [pausedFromMode, setPausedFromMode] = useState(null);
  const [displaySeconds, setDisplaySeconds] = useState(DEFAULT_FOCUS_MIN * 60);
  const [focusMin, setFocusMin] = useState(DEFAULT_FOCUS_MIN);
  const [shortBreakMin, setShortBreakMin] = useState(DEFAULT_SHORT_BREAK_MIN);
  const [longBreakMin, setLongBreakMin] = useState(DEFAULT_LONG_BREAK_MIN);
  const tickRef = useRef(null);
  const stateRef = useRef({});
  const transitionRef = useRef(null);

  const isActive =
    mode === MODES.FOCUS ||
    mode === MODES.SHORT_BREAK ||
    mode === MODES.LONG_BREAK;

  const transitionOnPhaseEnd = useCallback(() => {
    const { mode: m, currentCycle: c, focusMin: f, shortBreakMin: s, longBreakMin: l } =
      stateRef.current;
    if (m === MODES.FOCUS) {
      const nextCycle = c + 1;
      if (nextCycle >= CYCLES_BEFORE_LONG_BREAK) {
        setCurrentCycle(0);
        setEndTime(Date.now() + l * 60 * 1000);
        setMode(MODES.LONG_BREAK);
      } else {
        setCurrentCycle(nextCycle);
        setEndTime(Date.now() + s * 60 * 1000);
        setMode(MODES.SHORT_BREAK);
      }
    } else if (m === MODES.SHORT_BREAK) {
      setEndTime(Date.now() + f * 60 * 1000);
      setMode(MODES.FOCUS);
    } else if (m === MODES.LONG_BREAK) {
      setEndTime(Date.now() + f * 60 * 1000);
      setMode(MODES.FOCUS);
      setCurrentCycle(0);
    }
  }, []);

  useEffect(() => {
    stateRef.current = {
      mode,
      currentCycle,
      focusMin,
      shortBreakMin,
      longBreakMin,
    };
    transitionRef.current = transitionOnPhaseEnd;
  }, [mode, currentCycle, focusMin, shortBreakMin, longBreakMin, transitionOnPhaseEnd]);

  useEffect(() => {
    if (mode === MODES.PAUSED || mode === MODES.IDLE || !endTime) return;

    const tick = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((endTime - now) / 1000));
      setDisplaySeconds(remaining);
      if (remaining <= 0 && transitionRef.current) {
        transitionRef.current();
      }
    };

    tick();
    tickRef.current = setInterval(tick, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [mode, endTime]);

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

  const value = {
    MODES,
    CYCLES_BEFORE_LONG_BREAK,
    mode,
    currentCycle,
    endTime,
    pausedRemainingSec,
    pausedFromMode,
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
  };

  return (
    <PomodoroContext.Provider value={value}>{children}</PomodoroContext.Provider>
  );
}
