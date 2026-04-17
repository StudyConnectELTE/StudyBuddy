import { useState } from "react";
import { Mail, Lock, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card } from "./ui/card";
import { toast } from "sonner";
import { authService } from '../service/api';

function LoginPage({ onLogin, onSwitchToRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {  // async-ra változtatva
    e.preventDefault();
    if (!email || !password) {
      toast.error("Kérlek töltsd ki az összes mezőt");  // Magyarosítva opcionálisan
      return;
    }
    setIsLoading(true);
    try {
      // TÉNYLEGES API HÍVÁS: authService.login használata
      await authService.login(email, password);
      // Sikeres: token mentődik localStorage-be automatikusan a service-ben
      toast.success("Sikeres bejelentkezés!");
      onLogin(email, password);  // Callback az App-hoz
    } catch (error) {
      // Hibakezelés a service-ből (pl. "Login failed")
      toast.error(error.message || error || "Bejelentkezés sikertelen");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!forgotEmail) {
      toast.error("Kérlek add meg a másodlagos email címed! (Nem ELTE-s)");
      return;
    }
    
    setIsLoading(true);
    
    try {
      await authService.forgotPassword(forgotEmail);
      toast.success(`Ideiglenes jelszó elküldve ${forgotEmail}-re!`, {
        description: "Ellenőrizd a postafiókod!"
      });
      setShowForgotPassword(false);
      setForgotEmail("");
    } catch (error) {
      toast.error(error?.message || "Hiba történt! Valószínűleg a megadott másodlagos e-mail cím nincs regisztrálva.");
    } finally {
      setIsLoading(false);
    }
  };

  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 border-border shadow-lg">
          <button
            onClick={() => setShowForgotPassword(false)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Bejelentkezés
          </button>

          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="mb-2">Elfelejtett jelszó</h1>
            <p className="text-sm text-muted-foreground">
                Add meg az e-mail címed, és küldünk neked egy ideiglenes jelszót
            </p>
          </div>

          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <Label htmlFor="forgot-email">Másodlagos e-mail cím</Label>
              <div style={{height: 10 + 'px'}}></div>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="your.email@gmail.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Nem ELTE-s cím! Erre küldjük az ideiglenes jelszót és az egyetemi levelező rendszer blokkolhatja az üzenetet.
              </p>
            </div>

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-white"
              disabled={isLoading}
            >
              {isLoading ? "Küldés.." : "Ideiglenes jelszó küldése"}
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 border-border shadow-lg">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl">SC</span>
          </div>
          <h1 className="mb-2">StudyConnect</h1>
          <p className="text-sm text-muted-foreground">
            Jelentkezzen be a tanulócsoportok eléréséhez
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <Label htmlFor="email">E-mail cím</Label>
            <div style={{height: 10 + 'px'}}></div>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="your.email@inf.elte.hu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="password">Jelszó</Label>
            <div style={{height: 10 + 'px'}}></div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="írd be a jelszavad"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="text-sm text-primary hover:underline"
            >
              Elfelejtetted a jelszavad?
            </button>
          </div>

          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90 text-white"
            disabled={isLoading}
          >
            {isLoading ? "Bejelentkezés..." : "Bejelentkezés"}
          </Button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">vagy</span>
            </div>
          </div>

          <Button
            type="button"
            onClick={() => window.location.replace('http://localhost:5000/saml/login')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            disabled={isLoading}
          >
            🎓 Bejelentkezés ELTE fiókkal
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Még nincs fiókod?{" "}
            <button
              onClick={onSwitchToRegister}
              className="text-primary hover:underline"
            >
              Regisztráció
            </button>
          </p>
        </div>
      </Card>
    </div>
  );
}

export default LoginPage;
