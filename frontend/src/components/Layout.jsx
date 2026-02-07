import { useState, useEffect } from "react";
import { Sidebar } from "./SideBar";
import { MobileNav } from "./MobileNav";
import HomePage from "./HomePage";
import { SearchPage } from "./SearchPage";
import MyGroupsPage from "./MyGroupsPage";
import { ProfileSettingsPage } from "./ProfileSettingsPage";
import LoginPage from "./LoginPage";
import { RegisterPage } from "./RegisterPage";
import { Toaster } from "./ui/sonner";
import { toast } from "sonner";
import { authService } from "../service/api";

export function Layout() {
  const [currentPage, setCurrentPage] = useState("home");
  const [authMode, setAuthMode] = useState("login");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

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
  

  const handleRegister = async (data) => {
    try {
      setLoading(true);
      await authService.register(
        data.email,
        data.name,
        data.major,
        data.hobbies,
        data.neptunCode,
        data.semester
      );
      
      // Regisztráció után automatikus bejelentkezés
      setIsAuthenticated(true);
      setAuthMode(null);
      setUserData(authService.getUser());
      
      toast.success("Sikeres regisztráció!", {
        description: "Bejelentkeztél!"
      });
    } catch (error) {
      toast.error("Regisztráció sikertelen", {
        description: error || "Próbáld újra"
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
      case "profile":
        return <ProfileSettingsPage userData={userData} />;
      default:
        return <HomePage onNavigate={setCurrentPage} />;
    }
  };

  return (
    <>
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
        
        <main className="flex-1 overflow-auto">
          {renderContent()}
        </main>
      </div>
      <Toaster /> {/* ← EZ KELL! */}
    </>
  );
}
