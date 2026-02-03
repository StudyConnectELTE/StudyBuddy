import './index.css'
import { RegisterPage } from "./components/RegisterPage";
import { toast } from "sonner";
import { Button } from "./components/ui/button";

function App() {
  const handleRegister = (userData) => {
    console.log("✅ Regisztráció:", userData);
    toast.success("Sikeres regisztráció! 👋", {
      description: `${userData.name}, üdv a StudyConnect-en!`,
    });
  };

  const handleSwitchToLogin = () => {
    console.log("🔄 Login oldalra váltás");
    toast.info("LoginPage hamarosan... ⏳");
  };

  return (
    <>
    
    <div className="min-h-screen bg-background">
      <RegisterPage 
        onRegister={handleRegister}
        onSwitchToLogin={handleSwitchToLogin}
      />
    </div>
    </>
  );
}

export default App;
