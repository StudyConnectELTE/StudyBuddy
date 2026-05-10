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

  // Initial fallback – egyszer, login után (page refresh / offline esetén)
  useEffect(() => {
    if (!isAuthenticated) {
      setPomodoroInvite(null);
      return;
    }
    pomodoroService.getPendingInvites()
      .then((data) => {
        const first = (data.invites || [])[0];
        if (first) setPomodoroInvite(first);
      })
      .catch(() => {});
  }, [isAuthenticated]);

  // App indításkor ellenőrizzük a localStorage-t
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
      await authService.login(email, password); // ← Nincs response!
      
      // API sikeres → localStorage már frissítve
      setIsAuthenticated(true);
      setAuthMode(null);
      setUserData(authService.getUser());
      
      toast.success("Sikeres bejelentkezés!", {
        description: "Üdvözlünk újra!"
      });
    } catch (error) {
      toast.error("Hibás adatok", {
        description: error || "Ellenőrizd az emailt és jelszót"
      });
    } finally {
      setLoading(false);
    }
  };

  const getErrorMessage = (error) => {
    if (!error) return "Ismeretlen hiba";
  
    // Axios-szerű hiba
    const data = error.response?.data;
    if (typeof data?.message === "string") return data.message;
    if (typeof data?.error === "string") return data.error;
  
    // Simán dobott hiba
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
      
      setPomodoroInvitePollStopped(false);
  
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

  // Loading állapot
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-lg">Betöltés...</div>
      </div>
    );
  }

  // Show auth pages if not authenticated
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
        return <HomePage onNavigate={setCurrentPage} onLogout={handleLogout} />;  // ✅ 
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
      case "profile":
        return <ProfileSettingsPage userData={userData} isDark={isDark} onThemeToggle={toggleTheme} />;
      default:
        return <HomePage onNavigate={setCurrentPage} />;
    }
  };

  return (
    <>
      <PomodoroProvider>
        <div className="flex flex-col md:flex-row h-screen bg-background">
          {/* Mobile Navigation - Top */}
          <MobileNav 
            currentPage={currentPage} 
            onPageChange={setCurrentPage}
            onLogout={handleLogout}
          />
          
          {/* Desktop Sidebar - Left */}
          <div className="hidden md:block flex-shrink-0">
            <Sidebar 
              currentPage={currentPage} 
              onPageChange={setCurrentPage}
              onLogout={handleLogout}
            />
          </div>
          
          <main className="flex-1 overflow-auto relative">
            {/* Theme toggle — top right */}
            <button
              onClick={toggleTheme}
              title={isDark ? "Váltás világos módra" : "Váltás sötét módra"}
              className="fixed top-4 right-14 z-40 w-12 h-12 rounded-full bg-card border border-border shadow-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:shadow-lg transition-all duration-200 hover:scale-110"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
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
      <Toaster /> {/* ← EZ KELL! */}
    </>
  );
}
