import { useEffect, useMemo, useState } from "react";
import {
  Flame,
  Trophy,
  TimerReset,
  CheckSquare,
  Users,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Grid2X2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/Dialog";
import { pomodoroService, getApiErrorMessage } from "../service/api";

const WEEKDAY_NAMES_HU = ["H", "K", "Sze", "Cs", "P", "Szo", "V"];

function formatHoursMinutes(totalMinutes) {
  const safeMinutes = Number(totalMinutes || 0);
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

function formatDateHu(date) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("hu-HU", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getHeatLevel(value, max) {
  if (value <= 0) return "bg-secondary border-border";
  const ratio = max > 0 ? value / max : 0;
  if (ratio < 0.25) return "bg-primary/15 border-primary/10";
  if (ratio < 0.5) return "bg-primary/25 border-primary/20";
  if (ratio < 0.75) return "bg-primary/40 border-primary/30";
  return "bg-primary/60 border-primary/40";
}

function HighlightCard({ icon: IconComponent, title, value, subtitle }) {
  return (
    <div className="bg-card border border-border rounded-3xl p-6 shadow-lg">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-2xl border border-primary/20 bg-primary/10 flex items-center justify-center flex-shrink-0">
          <IconComponent className="w-7 h-7 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-4xl font-bold leading-none text-foreground">
            {value}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: IconComponent, title, value, onClick, clickable = false }) {
  const Wrapper = clickable ? "button" : "div";

  return (
    <Wrapper
      type={clickable ? "button" : undefined}
      onClick={onClick}
      className={`bg-card border border-border rounded-2xl p-5 shadow-sm text-left w-full ${
        clickable
          ? "transition-all hover:bg-primary/5 hover:border-primary/20 hover:shadow-md cursor-pointer"
          : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-2xl font-bold text-foreground break-words">
            {value}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{title}</p>
          {clickable && (
            <p className="mt-2 text-xs text-primary">
              Kattints a részletek megnyitásához
            </p>
          )}
        </div>
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
          <IconComponent className="w-5 h-5 text-primary" />
        </div>
      </div>
    </Wrapper>
  );
}

function MonthSummaryRow({ totalFocusMinutes, totalTasks, totalGroupSessions }) {
  return (
    <div className="bg-card border border-border rounded-3xl p-6 shadow-lg">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Havi összesítés</h2>
            <p className="text-sm text-muted-foreground">
              A kiválasztott hónap statisztikái
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl bg-primary/5 border border-primary/10 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Fókuszidő
            </p>
            <p className="mt-1 text-xl font-bold text-foreground">
              {formatHoursMinutes(totalFocusMinutes)}
            </p>
          </div>
          <div className="rounded-2xl bg-primary/5 border border-primary/10 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Feladatok
            </p>
            <p className="mt-1 text-xl font-bold text-foreground">
              {totalTasks}
            </p>
          </div>
          <div className="rounded-2xl bg-primary/5 border border-primary/10 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Csoport session
            </p>
            <p className="mt-1 text-xl font-bold text-foreground">
              {totalGroupSessions}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MonthlyActivityChart({ daily }) {
  const maxFocus = Math.max(...daily.map((d) => d.focusMinutes || 0), 1);

  return (
    <div className="bg-card border border-border rounded-3xl p-6 shadow-lg h-full">
      <div className="mb-6 flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Havi aktivitás</h2>
          <p className="text-sm text-muted-foreground">
            Napi fókuszidő oszlopdiagramon
          </p>
        </div>
      </div>
      <div className="h-72 rounded-2xl bg-secondary/30 border border-border px-3 pb-8 pt-4">
        <div className="flex h-full items-end gap-2 overflow-hidden">
          {daily.map((entry) => {
            const height = `${Math.max(
              8,
              ((entry.focusMinutes || 0) / maxFocus) * 100
            )}%`;
            return (
              <div
                key={entry.day}
                className="flex h-full flex-1 flex-col items-center justify-end gap-2"
              >
                <div
                  className="w-full rounded-t-md bg-primary/80 hover:bg-primary transition-all"
                  style={{ height }}
                  title={`${entry.day}. nap – ${entry.focusMinutes || 0} perc fókusz`}
                />
                <span className="text-xs text-muted-foreground">{entry.day}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MonthlyHeatmap({ daily }) {
  const maxFocus = Math.max(...daily.map((d) => d.focusMinutes || 0), 1);

  if (!daily.length) return null;

  const firstDate = new Date(daily[0].date);
  const jsDay = firstDate.getDay();
  const mondayBasedOffset = jsDay === 0 ? 6 : jsDay - 1;

  const calendarCells = [
    ...Array.from({ length: mondayBasedOffset }, (_, index) => ({
      id: `empty-start-${index}`,
      empty: true,
      day: 0,
      date: "",
      focusMinutes: 0,
      tasks: 0,
      groupSessions: 0,
      taskList: [],
    })),
    ...daily.map((entry) => ({
      ...entry,
      empty: false,
    })),
  ];

  while (calendarCells.length % 7 !== 0) {
    calendarCells.push({
      id: `empty-end-${calendarCells.length}`,
      empty: true,
      day: 0,
      date: "",
      focusMinutes: 0,
      tasks: 0,
      groupSessions: 0,
      taskList: [],
    });
  }

  return (
    <div className="bg-card border border-border rounded-3xl p-6 shadow-lg h-full">
      <div className="mb-6 flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Grid2X2 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Havi heatmap</h2>
          <p className="text-sm text-muted-foreground">Havi fókusz áttekintés</p>
        </div>
      </div>
      <div className="rounded-2xl bg-secondary/30 border border-border p-4">
        <div className="grid grid-cols-7 gap-2 mb-3">
          {WEEKDAY_NAMES_HU.map((label) => (
            <div
              key={label}
              className="text-center text-xs font-medium text-muted-foreground py-1"
            >
              {label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {calendarCells.map((cell, index) => {
            if (cell.empty) {
              return (
                <div
                  key={cell.id || index}
                  className="aspect-square rounded-xl border border-transparent"
                />
              );
            }
            const dateObj = new Date(cell.date);
            return (
              <div key={cell.day} className="group relative">
                <div
                  className={`aspect-square rounded-xl border transition-all duration-200 cursor-pointer flex items-start justify-end p-1.5 hover:scale-[1.03] hover:shadow-md ${getHeatLevel(
                    cell.focusMinutes || 0,
                    maxFocus
                  )}`}
                  title={`${formatDateHu(dateObj)} – ${cell.focusMinutes || 0} perc fókusz`}
                  tabIndex={0}
                >
                  <span className="text-[11px] font-medium text-foreground/80">
                    {cell.day}
                  </span>
                </div>
                <div className="pointer-events-none absolute left-1/2 top-0 z-20 w-48 -translate-x-1/2 -translate-y-[calc(100%+8px)] rounded-xl border border-border bg-card p-3 text-xs shadow-xl opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-all">
                  <div className="font-semibold text-foreground">
                    {formatDateHu(dateObj)}
                  </div>
                  <div className="mt-2 space-y-1 text-muted-foreground">
                    <div>
                      Fókuszidő:{" "}
                      <span className="font-medium text-foreground">
                        {cell.focusMinutes || 0} perc
                      </span>
                    </div>
                    <div>
                      Feladatok:{" "}
                      <span className="font-medium text-foreground">
                        {cell.tasks || 0}
                      </span>
                    </div>
                    <div>
                      Csoport session:{" "}
                      <span className="font-medium text-foreground">
                        {cell.groupSessions || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="text-xs text-muted-foreground">
            Vidd rá az egeret egy napra a részletekhez
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <span>Kevesebb</span>
            <div className="h-4 w-4 rounded bg-secondary border border-border" />
            <div className="h-4 w-4 rounded bg-primary/15 border border-primary/10" />
            <div className="h-4 w-4 rounded bg-primary/25 border border-primary/20" />
            <div className="h-4 w-4 rounded bg-primary/40 border border-primary/30" />
            <div className="h-4 w-4 rounded bg-primary/60 border border-primary/40" />
            <span>Több</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TasksDialog({ open, onOpenChange, tasks, monthLabel }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Elvégzett feladatok</DialogTitle>
          <DialogDescription>
            A(z) {monthLabel} hónap sessionjei alatt felvett feladatok listája
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto pr-1">
          {tasks.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              Nincs megjeleníthető feladat ebben a hónapban.
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-start gap-3 p-4 bg-secondary/50 rounded-xl border border-border"
                >
                  <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                    <CheckSquare className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-foreground">{task.title}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {formatDateHu(task.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function PomodoroStatsPage() {
  const today = new Date();
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [selectedMonth, setSelectedMonth] = useState(currentMonthStart);
  const [isTasksDialogOpen, setIsTasksDialogOpen] = useState(false);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const loadStats = async () => {
      setLoading(true);
      setError(null);

      try {
        const year = selectedMonth.getFullYear();
        const month = selectedMonth.getMonth() + 1;
        const data = await pomodoroService.getStats(year, month);
        if (!cancelled) {
          setStats(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(getApiErrorMessage(err));
          setStats(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadStats();

    return () => {
      cancelled = true;
    };
  }, [selectedMonth]);

  const monthlyTasks = useMemo(() => {
    if (!stats?.daily) return [];
    return stats.daily.flatMap((day) =>
      (day.taskList || []).map((task) => ({
        ...task,
        date: day.date,
      }))
    );
  }, [stats]);

  const canGoNext =
    selectedMonth.getFullYear() < currentMonthStart.getFullYear() ||
    (selectedMonth.getFullYear() === currentMonthStart.getFullYear() &&
      selectedMonth.getMonth() < currentMonthStart.getMonth());

  const changeMonth = (delta) => {
    setSelectedMonth((prev) => {
      const next = new Date(prev.getFullYear(), prev.getMonth() + delta, 1);
      if (next > currentMonthStart) return prev;
      return next;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="container mx-auto max-w-7xl">
          <p className="text-muted-foreground">Statisztika betöltése…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="container mx-auto max-w-7xl">
          <p className="text-destructive">Hiba: {error}</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="container mx-auto max-w-7xl">
          <p className="text-muted-foreground">
            Nincs elérhető pomodoro statisztika erre a hónapra.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="min-w-0">
              <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent mb-2">
                Pomodoro statisztikák
              </h1>
              <p className="text-lg text-muted-foreground">
                Havi analitika valós adatokkal
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="bg-card border border-border rounded-2xl p-2 flex items-center gap-2 shadow-sm">
                <button
                  type="button"
                  onClick={() => changeMonth(-1)}
                  className="h-10 w-10 rounded-xl border border-border bg-background hover:bg-primary/10 hover:border-primary/20 transition-all flex items-center justify-center"
                  aria-label="Előző hónap"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="min-w-[180px] text-center px-3">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    Kiválasztott hónap
                  </div>
                  <div className="text-base font-semibold text-foreground mt-1">
                    {stats.monthLabel}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => changeMonth(1)}
                  disabled={!canGoNext}
                  className="h-10 w-10 rounded-xl border border-border bg-background hover:bg-primary/10 hover:border-primary/20 transition-all flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Következő hónap"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <HighlightCard
            icon={Flame}
            title="Jelenlegi streak"
            value={stats.currentStreak}
            subtitle="napos aktuális sorozat"
          />
          <HighlightCard
            icon={Trophy}
            title="Leghosszabb streak"
            value={stats.longestStreak}
            subtitle="napos eddigi legjobb"
          />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={TimerReset}
            title="Fókuszidő"
            value={formatHoursMinutes(stats.totalFocusMinutes)}
          />
          <StatCard
            icon={CheckSquare}
            title="Elvégzett feladatok"
            value={stats.totalTasks}
            clickable
            onClick={() => setIsTasksDialogOpen(true)}
          />
          <StatCard
            icon={Users}
            title="Csoport session"
            value={stats.totalGroupSessions}
          />
          <StatCard
            icon={CalendarDays}
            title="Aktív napok"
            value={stats.activeDays}
          />
        </div>

        <div className="mt-6">
          <MonthSummaryRow
            totalFocusMinutes={stats.totalFocusMinutes}
            totalTasks={stats.totalTasks}
            totalGroupSessions={stats.totalGroupSessions}
          />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <MonthlyActivityChart daily={stats.daily || []} />
          <MonthlyHeatmap daily={stats.daily || []} />
        </div>
      </div>

      <TasksDialog
        open={isTasksDialogOpen}
        onOpenChange={setIsTasksDialogOpen}
        tasks={monthlyTasks}
        monthLabel={stats.monthLabel}
      />
    </div>
  );
}