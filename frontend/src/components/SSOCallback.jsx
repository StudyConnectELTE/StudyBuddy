import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { authService } from "../service/api";
import { toast } from "sonner";

export function SSOCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const handleSSO = async () => {
      try {
        const token = searchParams.get("token");
        
        if (!token) {
          toast.error("SAML bejelentkezés hiba", {
            description: "Hiányzik az autentikációs token"
          });
          navigate("/");
          return;
        }

        // Store the token in localStorage
        localStorage.setItem("authToken", token);
        
        // Optionally decode and store user info if available
        // You can add a user data endpoint call here if needed
        
        toast.success("Sikeres ELTE bejelentkezés!", {
          description: "Üdvözlünk az alkalmazásban!"
        });

        // Redirect to home page after a short delay
        setTimeout(() => {
          navigate("/");
          window.location.reload(); // Reload to trigger auth check
        }, 1000);
      } catch (error) {
        console.error("SSO error:", error);
        toast.error("SAML bejelentkezés sikertelen", {
          description: error.message || "Próbáld újra később"
        });
        navigate("/");
      }
    };

    handleSSO();
  }, [searchParams, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-lg text-center">
        <p>ELTE azonosítás feldolgozása...</p>
        <p className="text-sm text-muted-foreground mt-2">Kérjük, várjon</p>
      </div>
    </div>
  );
}
