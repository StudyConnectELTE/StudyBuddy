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
} from "lucide-react";
import { cn } from "./ui/utils";

export function MobileNav({ currentPage, onPageChange, onLogout }) {
  const [isOpen, setIsOpen] = useState(false);

  const navigationItems = [
    {
      id: "home",
      name: "Home",
      icon: Home,
      description: "Welcome page",
    },
    {
      id: "search",
      name: "Find Groups",
      icon: Search,
      description: "Search subjects",
    },
    {
      id: "mygroups",
      name: "My Groups",
      icon: Users,
      description: "Your study groups",
    },
    {
      id: "profile",
      name: "Profile & Settings",
      icon: User,
      description: "Account settings",
    },
  ];

  const handleNavigate = (pageId) => {
    onPageChange(pageId);
    setIsOpen(false);
  };

  return (
    <div className="md:hidden">
      {/* Top Bar */}
      <div className="bg-sidebar border-b border-sidebar-border/20 px-4 py-3 flex items-center justify-between shadow-lg">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-sidebar-primary rounded-full flex items-center justify-center shadow-lg">
            <BookOpen className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h2 className="text-sidebar-foreground font-semibold text-base">
              StudyConnect
            </h2>
            <p className="text-sidebar-foreground/70 text-xs">
              Find Your Study Group
            </p>
          </div>
        </div>

        {/* Menu Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-10 h-10 bg-sidebar-accent/50 hover:bg-sidebar-accent rounded-lg flex items-center justify-center transition-all duration-200"
        >
          {isOpen ? (
            <X className="w-5 h-5 text-sidebar-foreground" />
          ) : (
            <Menu className="w-5 h-5 text-sidebar-foreground" />
          )}
        </button>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu Content */}
          <div className="absolute top-[73px] left-0 right-0 bg-sidebar border-b border-sidebar-border/20 shadow-2xl z-50 animate-in slide-in-from-top duration-300">
            <div className="px-4 py-4 space-y-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item.id)}
                    className={cn(
                      "w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300",
                      isActive
                        ? "bg-sidebar-primary shadow-lg shadow-sidebar-primary/30"
                        : "bg-sidebar-accent/80 hover:bg-sidebar-primary/80",
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-5 h-5",
                        isActive
                          ? "text-sidebar-primary-foreground"
                          : "text-sidebar-accent-foreground",
                      )}
                    />
                    <div className="flex-1 text-left">
                      <div
                        className={cn(
                          "font-medium text-sm",
                          isActive
                            ? "text-sidebar-primary-foreground"
                            : "text-sidebar-accent-foreground",
                        )}
                      >
                        {item.name}
                      </div>
                      {isActive && (
                        <div className="text-xs text-sidebar-primary-foreground/70 mt-0.5">
                          {item.description}
                        </div>
                      )}
                    </div>
                    {isActive && (
                      <div className="w-2 h-2 bg-sidebar-primary-foreground rounded-full animate-pulse" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* User Profile */}
            <div className="px-4 py-4 border-t border-sidebar-border/20">
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 bg-sidebar-accent/80 hover:bg-sidebar-primary/80"
              >
                <LogOut className="w-5 h-5 text-sidebar-accent-foreground" />
                <div className="flex-1 text-left">
                  <div className="font-medium text-sm text-sidebar-accent-foreground">
                    Logout
                  </div>
                </div>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
