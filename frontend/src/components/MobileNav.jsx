import { useState } from "react";
import {
  Menu,
  X,
  BookOpen,
  Home,
  Search,
  Users,
  User,
  LogOut,
  Timer,
  Trophy,
  BarChart3,
  BookCheck,
} from "lucide-react";
import { cn } from "./ui/utils";

export function MobileNav({ currentPage, onPageChange, onLogout }) {
  const [isOpen, setIsOpen] = useState(false);

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
      id: "flashcards",
      name: "FlashCard tanulás",
      icon: BookCheck,
      description: "FlashCard a hatékony tanuláshoz",
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

  const handleNavigate = (pageId) => {
    onPageChange(pageId);
    setIsOpen(false);
  };

  const handleLogout = () => {
    setIsOpen(false);
    onLogout();
  };

  return (
    <div className="md:hidden relative z-50">
      {/* Top Bar */}
      <div className="bg-sidebar border-b border-sidebar-border/20 px-4 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-sidebar-primary rounded-full flex items-center justify-center shadow-lg shrink-0">
            <BookOpen className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sidebar-foreground font-semibold text-base truncate">
              StudyConnect
            </h2>
            <p className="text-sidebar-foreground/70 text-xs truncate">
              Találd meg a tanulócsoportod
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-10 h-10 bg-sidebar-accent/50 hover:bg-sidebar-accent rounded-xl flex items-center justify-center transition-all duration-200 shrink-0"
          aria-label={isOpen ? "Menü bezárása" : "Menü megnyitása"}
        >
          {isOpen ? (
            <X className="w-5 h-5 text-sidebar-foreground" />
          ) : (
            <Menu className="w-5 h-5 text-sidebar-foreground" />
          )}
        </button>
      </div>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
            onClick={() => setIsOpen(false)}
          />

          {/* Floating dropdown */}
          <div className="absolute top-[82px] left-3 right-3 z-50">
            <div className="rounded-3xl border border-sidebar-border/30 bg-sidebar/95 shadow-2xl backdrop-blur-md overflow-hidden">
              <div className="max-h-[70vh] overflow-y-auto scrollbar-hidden touch-pan-y">
                <div className="p-3 space-y-2">
                  {navigationItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentPage === item.id;

                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavigate(item.id)}
                        className={cn(
                          "w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-300 text-left",
                          isActive
                            ? "bg-sidebar-primary shadow-lg shadow-sidebar-primary/30"
                            : "bg-sidebar-accent/70 hover:bg-sidebar-primary/80"
                        )}
                      >
                        <Icon
                          className={cn(
                            "w-5 h-5 shrink-0",
                            isActive
                              ? "text-sidebar-primary-foreground"
                              : "text-sidebar-accent-foreground"
                          )}
                        />

                        <div className="flex-1 min-w-0">
                          <div
                            className={cn(
                              "font-medium text-sm truncate",
                              isActive
                                ? "text-sidebar-primary-foreground"
                                : "text-sidebar-accent-foreground"
                            )}
                          >
                            {item.name}
                          </div>

                          <div
                            className={cn(
                              "text-xs mt-0.5 truncate",
                              isActive
                                ? "text-sidebar-primary-foreground/75"
                                : "text-sidebar-accent-foreground/70"
                            )}
                          >
                            {item.description}
                          </div>
                        </div>

                        {isActive && (
                          <div className="w-2 h-2 bg-sidebar-primary-foreground rounded-full animate-pulse shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="p-3 pt-0">
                  <div className="border-t border-sidebar-border/20 pt-3">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-300 bg-sidebar-accent/70 hover:bg-sidebar-primary/80 text-left"
                    >
                      <LogOut className="w-5 h-5 text-sidebar-accent-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-sidebar-accent-foreground truncate">
                          Kijelentkezés
                        </div>
                        <div className="text-xs text-sidebar-accent-foreground/70 mt-0.5 truncate">
                          Kijelentkezés a fiókból
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}