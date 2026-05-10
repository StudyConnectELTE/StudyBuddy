import { useState } from "react";
import { cn } from "./ui/utils";
import {
  Home,
  Search,
  Users,
  User,
  BookOpen,
  X,
  LogOut,
  Timer,
  Trophy,
  BarChart3,
  Moon,
  Sun,
} from "lucide-react";
import { XPWidget } from "./XPWidget";

export function Sidebar({
  currentPage,
  onPageChange,
  onLogout,
  isDark,
  onThemeToggle,
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleNavigationClick = (pageId) => {
    if (!isExpanded) {
      setIsExpanded(true);
      setTimeout(() => onPageChange(pageId), 150);
    } else {
      onPageChange(pageId);
    }
  };

  const navigationItems = [
    {
      id: "home",
      name: "Kezdőlap",
      icon: Home,
      description: "Kezdő oldal",
    },
    {
      id: "search",
      name: "Csoport keresés",
      icon: Search,
      description: "Tantárgyak keresése",
    },
    {
      id: "mygroups",
      name: "Saját csoportok",
      icon: Users,
      description: "Saját tanulócsoportjaid",
    },
    {
      id: "pomodoro",
      name: "Pomodoro Timer",
      icon: Timer,
      description: "Fókuszálj a tanulásra",
    },
    {
      id: "leaderboard",
      name: "Ranglista",
      icon: Trophy,
      description: "Top tanulók és csoportok",
    },
    {
      id: "pomodoro-stats",
      name: "Pomodoro statisztikák",
      icon: BarChart3,
      description: "Havi fókusz és session adatok",
    },
    {
      id: "profile",
      name: "Profil és Beállitások",
      icon: User,
      description: "Profil adatok és beállitások",
    },
  ];

  return (
    <div className="ml-6 my-6">
      <div
        className={cn(
          "flex flex-col h-[calc(100vh-3rem)] transition-all duration-300 ease-in-out rounded-3xl",
          "bg-sidebar shadow-2xl border border-sidebar-border/20 overflow-hidden",
          isExpanded ? "w-64" : "w-20"
        )}
      >
        <div className="p-6 flex flex-col items-center relative shrink-0">
          {isExpanded && (
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
              <button
                onClick={onThemeToggle}
                title={isDark ? "Váltás világos módra" : "Váltás sötét módra"}
                className="w-8 h-8 bg-sidebar-accent/50 hover:bg-sidebar-accent rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
              >
                {isDark ? (
                  <Sun className="w-4 h-4 text-sidebar-foreground" />
                ) : (
                  <Moon className="w-4 h-4 text-sidebar-foreground" />
                )}
              </button>

              <button
                onClick={() => setIsExpanded(false)}
                className="w-8 h-8 bg-sidebar-accent/50 hover:bg-sidebar-accent rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
              >
                <X className="w-4 h-4 text-sidebar-foreground" />
              </button>
            </div>
          )}

          <div className="w-12 h-12 bg-sidebar-primary rounded-full flex items-center justify-center shadow-lg">
            <BookOpen className="w-6 h-6 text-sidebar-primary-foreground" />
          </div>

          {isExpanded && (
            <div className="mt-3 text-center">
              <h2 className="text-sidebar-foreground font-semibold text-base whitespace-nowrap">
                StudyConnect
              </h2>
              <p className="text-sidebar-foreground/70 text-xs whitespace-nowrap mt-1">
                Találd meg a tanulócsoportod
              </p>
            </div>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hidden touch-pan-y">
          <nav className="px-4 py-6">
            <div className="space-y-4">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;

                return (
                  <div key={item.id} className="relative group">
                    <button
                      onClick={() => handleNavigationClick(item.id)}
                      className={cn(
                        "transition-all duration-300 flex items-center relative overflow-hidden",
                        "hover:scale-110 hover:shadow-lg",
                        isExpanded
                          ? "w-full px-4 py-3 justify-start rounded-xl"
                          : "w-12 h-12 justify-center mx-auto rounded-full",
                        isActive
                          ? "bg-sidebar-primary shadow-lg shadow-sidebar-primary/30 scale-105"
                          : "bg-sidebar-accent hover:bg-sidebar-primary/80"
                      )}
                    >
                      <Icon
                        className={cn(
                          "transition-colors duration-300 flex-shrink-0 w-5 h-5",
                          isActive
                            ? "text-sidebar-primary-foreground"
                            : "text-sidebar-accent-foreground group-hover:text-sidebar-primary-foreground"
                        )}
                      />

                      {isExpanded && (
                        <div className="ml-3 overflow-hidden">
                          <div
                            className={cn(
                              "font-medium text-sm whitespace-nowrap transition-colors duration-300",
                              isActive
                                ? "text-sidebar-primary-foreground"
                                : "text-sidebar-accent-foreground group-hover:text-sidebar-primary-foreground"
                            )}
                          >
                            {item.name}
                          </div>

                          {isActive && (
                            <div className="text-xs text-sidebar-primary-foreground/70 mt-0.5 whitespace-nowrap">
                              {item.description}
                            </div>
                          )}
                        </div>
                      )}

                      {isActive && !isExpanded && (
                        <>
                          <div className="absolute inset-0 rounded-full bg-sidebar-primary opacity-20 animate-pulse" />
                          <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-1 h-6 bg-sidebar-primary rounded-l-full" />
                        </>
                      )}

                      {isActive && isExpanded && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-sidebar-primary-foreground rounded-full animate-pulse" />
                      )}
                    </button>

                    {!isExpanded && (
                      <div className="absolute left-full ml-4 px-3 py-2 bg-sidebar-primary text-sidebar-primary-foreground rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap z-50 shadow-lg transform translate-x-2 group-hover:translate-x-0">
                        <div className="font-medium text-sm">{item.name}</div>
                        <div className="text-xs opacity-75 mt-1">
                          {item.description}
                        </div>
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-sidebar-primary rotate-45" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </nav>

          <div className="pb-3">
            <XPWidget isExpanded={isExpanded} />
          </div>

          <div className={cn("p-4", isExpanded ? "" : "flex justify-center")}>
            <div className="relative group">
              <button
                onClick={onLogout}
                className={cn(
                  "transition-all duration-300 flex items-center bg-sidebar-primary shadow-lg hover:scale-105",
                  isExpanded
                    ? "w-full px-4 py-3 justify-start rounded-xl"
                    : "w-12 h-12 justify-center rounded-full hover:scale-110"
                )}
              >
                <LogOut className="w-5 h-5 text-sidebar-primary-foreground flex-shrink-0" />
                {isExpanded && (
                  <span className="ml-3 font-medium text-sm whitespace-nowrap text-sidebar-primary-foreground">
                    Kijelentkezés
                  </span>
                )}
              </button>

              {!isExpanded && (
                <div className="absolute left-full ml-4 px-3 py-2 bg-sidebar-primary text-sidebar-primary-foreground rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap z-50 shadow-lg transform translate-x-2 group-hover:translate-x-0">
                  <div className="font-medium text-sm">Kijelentkezés</div>
                  <div className="text-xs opacity-75 mt-1">
                    Kijelentkezés a fiókból
                  </div>
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-sidebar-primary rotate-45" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}