import { useXP } from "../hooks/useXP";

// Circular SVG progress ring for the collapsed sidebar state
function ProgressRing({ percent, size = 44, stroke = 3 }) {
  const radius = (size - stroke * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      {/* Track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={stroke}
        stroke="currentColor"
        className="text-sidebar-foreground/20"
      />
      {/* Progress */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={stroke}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="stroke-sidebar-primary transition-all duration-500"
      />
    </svg>
  );
}

export function XPWidget({ isExpanded }) {
  const { xp, level, xpInCurrentLevel, xpToNextLevel, progressPercent, rankName, nextRankName } = useXP();

  if (!isExpanded) {
    // Collapsed: level number inside a progress ring
    return (
      <div className="relative flex items-center justify-center mx-auto w-12 h-12 group">
        <ProgressRing percent={progressPercent} size={44} stroke={3} />
        <span className="absolute flex flex-col items-center leading-none text-sidebar-foreground">
          <span className="text-[8px] font-medium opacity-60 uppercase tracking-wider">Lv</span>
          <span className="text-sm font-bold mt-0.5">{level}</span>
        </span>

        {/* Tooltip on hover */}
        <div className="absolute left-full ml-4 px-3 py-2 bg-sidebar-primary text-sidebar-primary-foreground rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap z-50 shadow-lg transform translate-x-2 group-hover:translate-x-0">
          <div className="font-medium text-sm">{rankName}</div>
          <div className="text-xs opacity-75 mt-0.5">Level {level} · {xp} XP</div>
          <div className="text-xs opacity-60 mt-0.5">{xpToNextLevel} XP to next level</div>
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-sidebar-primary rotate-45" />
        </div>
      </div>
    );
  }

  // Expanded: full rank card
  return (
    <div className="mx-3 px-3 py-3 rounded-xl bg-sidebar-accent/40 border border-sidebar-border/10">
      {/* Rank name + level */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-sidebar-foreground font-semibold text-xs truncate">
          {rankName}
        </span>
        <span className="text-sidebar-primary text-xs font-bold ml-2 flex-shrink-0">
          Lv {level}
        </span>
      </div>

      {/* XP progress bar */}
      <div className="w-full h-2 rounded-full bg-sidebar-foreground/20 overflow-hidden mb-1.5">
        <div
          className="h-full rounded-full bg-sidebar-primary transition-all duration-500"
          style={{ width: `${Math.max(progressPercent, 3)}%` }}
        />
      </div>

      {/* XP numbers */}
      <div className="flex items-center justify-between">
        <span className="text-sidebar-foreground/60 text-[10px]">
          {xpInCurrentLevel} / 100 XP
        </span>
        <span className="text-sidebar-foreground/40 text-[10px] truncate ml-1">
          → {nextRankName !== rankName ? nextRankName : `Lv ${level + 1}`}
        </span>
      </div>
    </div>
  );
}
