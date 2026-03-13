import { useContext } from "react";
import { PomodoroContext } from "./pomodoroContext2";

export function usePomodoro() {
  const ctx = useContext(PomodoroContext);
  if (!ctx) throw new Error("usePomodoro must be used within PomodoroProvider");
  return ctx;
}
