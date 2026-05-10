import { useState, useEffect, useCallback } from "react";
import authService from "../service/api";

const XP_PER_LEVEL = 100;

export function getRankName(level) {
  if (level <= 2) return "Focus Beginner";
  if (level <= 5) return "Study Enthusiast";
  if (level <= 10) return "Focused Student";
  if (level <= 20) return "ELTE Focus Master";
  return "Focus Legend";
}

export function useXP() {
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);

  const loadFromStorage = useCallback(() => {
    const user = authService.getUser();
    if (user) {
      setXp(user.xp ?? 0);
      setLevel(user.level ?? 1);
    }
  }, []);

  useEffect(() => {
    loadFromStorage();
    // Refresh when login/register updates localStorage
    window.addEventListener("storage", loadFromStorage);
    return () => window.removeEventListener("storage", loadFromStorage);
  }, [loadFromStorage]);

  const xpInCurrentLevel = xp % XP_PER_LEVEL;
  const xpToNextLevel = XP_PER_LEVEL - xpInCurrentLevel;
  const progressPercent = Math.round((xpInCurrentLevel / XP_PER_LEVEL) * 100);
  const rankName = getRankName(level);
  const nextRankName = getRankName(level + 1);

  return {
    xp,
    level,
    xpInCurrentLevel,
    xpToNextLevel,
    progressPercent,
    rankName,
    nextRankName,
    refresh: loadFromStorage,
  };
}
