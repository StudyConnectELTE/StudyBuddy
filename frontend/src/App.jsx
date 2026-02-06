import { useState, useEffect } from "react";  // 👈 useEffect HOZZÁADVA!
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import './index.css';
import LoginPage from "./components/LoginPage";
import {RegisterPage} from "./components/RegisterPage";
import HomePage from "./components/HomePage";
import { Toaster } from "sonner";
import { toast } from "sonner";
import { authService } from "./service/api";
import {ProfileSettingsPage} from "./components/ProfileSettingsPage";
import {SearchPage} from "./components/SearchPage";
import MyGroupsPage from "./components/MyGroupsPage";
import ForumPage from "./components/ForumPage";

function ProtectedHomePage() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  // Loading state amíg ellenőrzi
  const isAuthenticated = authService.isAuthenticated();
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-lg text-gray-600">Ellenőrizzük a bejelentkezésed...</div>
      </div>
    );
  }

  return <HomePage />;
}

function AuthPages() {
  const [currentPage, setCurrentPage] = useState("register");
  const navigate = useNavigate();

  const handleRegister = (userData) => {
    console.log("✅ Regisztráció:", userData);
    toast.success("Sikeres regisztráció! 👋", {
      description: `${userData.name}, üdv a StudyConnect-en!`,
    });
    setCurrentPage("login");
  };

  const handleLogin = (email, password) => {
    console.log("🔐 Bejelentkezés:", { email, password });
    toast.success("Sikeres bejelentkezés! 📚");
    navigate("/home", { replace: true });  // replace hozzáadva
  };

  const handleSwitchToLogin = () => {
    setCurrentPage("login");
    navigate("/login", { replace: true });
  };

  const handleSwitchToRegister = () => {
    setCurrentPage("register");
    navigate("/register", { replace: true });
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {currentPage === "register" ? (
          <RegisterPage 
            onRegister={handleRegister}
            onSwitchToLogin={handleSwitchToLogin}
          />
        ) : (
          <LoginPage 
            onLogin={handleLogin}
            onSwitchToRegister={handleSwitchToRegister}
          />
        )}
      </div>
    </>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ProtectedHomePage />} />
        <Route path="/home" element={<ProtectedHomePage />} />
        <Route path="/login" element={<AuthPages />} />
        <Route path="/register" element={<AuthPages />} />
        <Route path="/profile" element={<ProfileSettingsPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/mygroups" element={<MyGroupsPage />} />
        <Route path="/dashboard" element={<ForumPage />} />
      </Routes>
      <Toaster position="top-right" richColors closeButton />
    </Router>
  );
}

export default App;
