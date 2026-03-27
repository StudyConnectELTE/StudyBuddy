import { useState } from "react";
import { Lightbulb, CircleHelp } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "./ui/utils";
import { usePomodoro } from "../context/usePomodoro";

function formatTime(seconds) {
  if (seconds == null || seconds < 0) return "25:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getModeLabel(mode, MODES) {
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

  const [sessionPhases, setSessionPhases] = useState([]);

  // ÚJ: infó modál állapota
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
    setTasks((prev) =>
      prev.map((task, i) =>
        i === idx ? { ...task, done: !task.done } : task,
      ),
    );
  };

  const handleStartSession = () => {
    if (mode === MODES.IDLE) {
      setSessionPhases(buildSessionPhases());
      startFocus();
    } else if (mode === MODES.PAUSED) {
      resume();
    }
    setShowSessionSetup(false);
  };

  const handlePause = () => {
    if (isActive) startPause();
  };

  const handleResetClick = () => {
    setShowResetConfirm(true);
  };

  const confirmFullReset = () => {
    reset();
    setShowSessionSetup(true);
    setShowResetConfirm(false);
    // opcionális:
    // setTasks([]);
    // setSessionPhases([]);
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
                className="min-w-[140px] rounded-xl"
              >
                Indítás
              </Button>
            </div>
          </div>
        ) : (
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
                    {getModeLabel(mode, MODES)}
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
                    onClick={handleStartSession}
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
                  <Button
                    onClick={handleResetClick}
                    variant="outline"
                    className="rounded-xl"
                  >
                    Reset
                  </Button>
                )}
              </div>
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