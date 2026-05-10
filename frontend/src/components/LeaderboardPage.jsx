import { useState, useEffect } from "react";
import { Trophy, Users, User, RefreshCw } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { leaderboardService } from "../service/api";
import { getRankName } from "../hooks/useXP";
import authService from "../service/api";
import { cn } from "./ui/utils";

const TABS = [
  { id: "individual", label: "Egyéni", icon: User },
  { id: "group", label: "Csoportos", icon: Users },
];

const MEDAL_COLORS = [
  "text-amber-500",
  "text-slate-400",
  "text-amber-700",
];

function RankBadge({ rank }) {
  if (rank <= 3) {
    return (
      <span className={cn("text-lg font-bold w-8 text-center", MEDAL_COLORS[rank - 1])}>
        {rank === 1 ? "1" : rank === 2 ? "2" : "3"}
      </span>
    );
  }
  return (
    <span className="text-sm text-muted-foreground w-8 text-center font-medium">
      {rank}
    </span>
  );
}

function IndividualRow({ entry, isCurrentUser }) {
  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors",
      isCurrentUser
        ? "bg-primary/10 border border-primary/20"
        : "hover:bg-muted/50"
    )}>
      <RankBadge rank={entry.rank} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn("font-medium text-sm truncate", isCurrentUser && "text-primary")}>
            {entry.name}
            {isCurrentUser && <span className="ml-1 text-xs text-primary/70">(Te)</span>}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground">{getRankName(entry.level)}</span>
          {entry.major && (
            <span className="text-xs text-muted-foreground/60">· {entry.major}</span>
          )}
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="font-bold text-sm text-primary">{entry.xp.toLocaleString()}</div>
        <div className="text-xs text-muted-foreground">XP</div>
      </div>
    </div>
  );
}

function GroupRow({ entry }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted/50 transition-colors">
      <RankBadge rank={entry.rank} />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{entry.name}</div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {entry.member_count} tag
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="font-bold text-sm text-primary">{entry.xp.toLocaleString()}</div>
        <div className="text-xs text-muted-foreground">XP</div>
      </div>
    </div>
  );
}

export function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState("individual");
  const [data, setData] = useState({ individual: null, group: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const currentUser = authService.getUser?.() ?? null;

  const loadData = async (type) => {
    setLoading(true);
    setError(null);
    try {
      const result = type === "individual"
        ? await leaderboardService.getIndividual(10)
        : await leaderboardService.getGroup(10);
      setData((prev) => ({ ...prev, [type]: result }));
    } catch {
      setError("Nem sikerült betölteni a ranglitát.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!data[activeTab]) {
      loadData(activeTab);
    }
  }, [activeTab]);

  const entries = data[activeTab]?.entries ?? [];
  const currentUserId = data[activeTab]?.current_user_id;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="container mx-auto max-w-2xl">

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
              <Trophy className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Ranglista</h1>
              <p className="text-sm text-muted-foreground">
                Összes idő · XP alapján
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(activeTab)}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            Frissítés
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 bg-muted/40 p-1 rounded-xl w-fit">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  activeTab === tab.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <Card className="p-2 border-border">
          {loading && (
            <div className="py-12 text-center text-muted-foreground text-sm">
              Betöltés...
            </div>
          )}

          {error && !loading && (
            <div className="py-12 text-center text-destructive text-sm">
              {error}
            </div>
          )}

          {!loading && !error && entries.length === 0 && (
            <div className="py-12 text-center text-muted-foreground text-sm">
              Még nincs adat.
            </div>
          )}

          {!loading && !error && entries.length > 0 && (
            <div className="space-y-1">
              {activeTab === "individual"
                ? entries.map((entry) => (
                    <IndividualRow
                      key={entry.user_id}
                      entry={entry}
                      isCurrentUser={entry.user_id === currentUserId}
                    />
                  ))
                : entries.map((entry) => (
                    <GroupRow key={entry.group_id} entry={entry} />
                  ))}
            </div>
          )}
        </Card>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Heti és havi bontás hamarosan
        </p>
      </div>
    </div>
  );
}
