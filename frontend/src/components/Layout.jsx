import { useState, useEffect, useCallback } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "../hooks/useTheme";
import { Sidebar } from "./SideBar";
import { MobileNav } from "./MobileNav";
import HomePage from "./HomePage";
import { SearchPage } from "./SearchPage";
import MyGroupsPage from "./MyGroupsPage";
import { ProfileSettingsPage } from "./ProfileSettingsPage";
import { PomodoroPage } from "./PomodoroPage";
import { LeaderboardPage } from "./LeaderboardPage";
import { PomodoroProvider } from "../context/PomodoroContext";
import LoginPage from "./LoginPage";
import { RegisterPage } from "./RegisterPage";
import { Toaster } from "./ui/sonner";
import { toast } from "sonner";
import { authService, pomodoroService } from "../service/api";
import { PomodoroInviteModal } from "./PomodoroInviteModal";
import { useGroupSession } from "../hooks/useGroupSession";
import PomodoroStatsPage from "./PomodoroStatsPage";
import { FloatingPomodoroWidget } from "./FloatingPomodoroWidget";
import { FlashCardBoard } from "./FlashCardBoard";

export function Layout() {
  const { isDark, toggle: toggleTheme } = useTheme();
  const [currentPage, setCurrentPage] = useState("home");
  const [authMode, setAuthMode] = useState("login");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pomodoroInvite, setPomodoroInvite] = useState(null);

  const closePomodoroInvite = useCallback(() => setPomodoroInvite(null), []);

  const handleInviteReceived = useCallback((invite) => {
    setPomodoroInvite((prev) => prev ?? invite);
  }, []);

  useGroupSession({
    backendSessionId: null,
    onInviteReceived: handleInviteReceived,
    onSessionFinished: null,
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      setPomodoroInvite(null);
      return;
    }
    pomodoroService
      .getPendingInvites()
      .then((data) => {
        const first = (data.invites || [])[0];
        if (first) setPomodoroInvite(first);
      })
      .catch(() => {});
  }, [isAuthenticated]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuth = authService.isAuthenticated();
        const user = authService.getUser();

        if (isAuth && user) {
          setIsAuthenticated(true);
          setUserData(user);
        } else {
          setIsAuthenticated(false);
          setUserData(null);
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogin = async (email, password) => {
    try {
      setLoading(true);
      await authService.login(email, password);

      setIsAuthenticated(true);
      setAuthMode(null);
      setUserData(authService.getUser());

      toast.success("Sikeres bejelentkezés!", {
        description: "Üdvözlünk újra!",
      });
    } catch (error) {
      toast.error("Hibás adatok", {
        description: error || "Ellenőrizd az emailt és jelszót",
      });
    } finally {
      setLoading(false);
    }
  };

  const getErrorMessage = (error) => {
    if (!error) return "Ismeretlen hiba";

    const data = error.response?.data;
    if (typeof data?.message === "string") return data.message;
    if (typeof data?.error === "string") return data.error;

    if (typeof error.message === "string") return error.message;

    return "Regisztráció sikertelen, próbáld újra.";
  };

  const handleRegister = async (data) => {
    try {
      setLoading(true);
      await authService.register(data);

      setIsAuthenticated(true);
      setAuthMode(null);
      setUserData(authService.getUser());

      toast.success("Sikeres regisztráció!", {
        description: "Bejelentkeztél!",
      });
    } catch (error) {
      console.error("Regisztráció hiba:", error);
      toast.error("Regisztráció sikertelen", {
        description: getErrorMessage(error),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    authService.logout();
    setIsAuthenticated(false);
    setUserData(null);
    setCurrentPage("home");
    setAuthMode("login");
    toast.success("Sikeres kijelentkezés");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-lg">Betöltés...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        {authMode === "login" ? (
          <LoginPage
            onLogin={handleLogin}
            onSwitchToRegister={() => setAuthMode("register")}
          />
        ) : (
          <RegisterPage
            onRegister={handleRegister}
            onSwitchToLogin={() => setAuthMode("login")}
          />
        )}
        <Toaster />
      </>
    );
  }

  const renderContent = () => {
    switch (currentPage) {
      case "home":
        return (
          <HomePage
            onNavigate={setCurrentPage}
            onLogout={handleLogout}
          />
        );
      case "search":
        return <SearchPage />;
      case "mygroups":
        return <MyGroupsPage />;
      case "pomodoro":
        return (
          <PomodoroPage blockGroupStartDueToInvite={!!pomodoroInvite} />
        );
      case "leaderboard":
        return <LeaderboardPage />;
      case "pomodoro-stats":
        return <PomodoroStatsPage />;
      case "profile":
        return (
          <ProfileSettingsPage
            userData={userData}
            isDark={isDark}
            onThemeToggle={toggleTheme}
          />
        );
      case "flashcards":
        return <FlashCardBoard />;
      default:
        return <HomePage onNavigate={setCurrentPage} />;
    }
  };

  return (
    <>
      <PomodoroProvider>
        <div className="flex flex-col md:flex-row h-screen bg-background">
          <MobileNav
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            onLogout={handleLogout}
          />

          <div className="hidden md:block flex-shrink-0">
            <Sidebar
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              onLogout={handleLogout}
              isDark={isDark}
              onThemeToggle={toggleTheme}
            />
          </div>

          <main className="flex-1 overflow-auto relative">
            {/* Theme toggle */}
            {/* Lebegő mini Pomodoro timer */}
            <FloatingPomodoroWidget
              currentPage={currentPage}
              isGroup={false} // ha később lesz group meta, ide jöhet
              onOpenPomodoro={() => setCurrentPage("pomodoro")}
            />

            {renderContent()}
          </main>
        </div>
      </PomodoroProvider>

      {pomodoroInvite && (
        <PomodoroInviteModal
          invite={pomodoroInvite}
          onClose={closePomodoroInvite}
          onNavigatePomodoro={() => setCurrentPage("pomodoro")}
        />
      )}
      <Toaster />
    </>
  );
}