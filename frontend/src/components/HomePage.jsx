import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, Users, Search, Sparkles, MessageSquare, UserPlus, Calendar, User, LogOut} from "lucide-react";  // ÚJ: User icon
import { Button } from "./ui/button";
import { authService } from "../service/api";



function HomePage() {
  const navigate = useNavigate();

  // Auth ellenőrzés - ha nincs bejelentkezve, login-ra dob
  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate("/login");
    }
  }, [navigate]);

  // Logout handler
  const handleLogout = () => {
    authService.logout();
    navigate("/login");
  };

  const features = [
    {
      icon: Search,
      title: "Tanulócsoport keresés",
      description: "Böngéssz több száz tantárgy között, és találd meg a kurzusaidhoz tökéletes tanulócsoportot"
    },
    {
      icon: Users,
      title: "Lépjen kapcsolatba a szaktársakkal",
      description: "Csatlakozz csoportokhoz, és működj együtt a diáktársakkal a könyebb tanulás érdekében"
    },
    {
      icon: BookOpen,
      title: "Szervezze meg tanulmányait",
      description: "Kövesd nyomon az összes tanulmányi csoportodat, és kezeld hatékonyan a tanulmányi időbeosztásodat"
    },
    {
      icon: Sparkles,
      title: "Fejlödjetek közösen",
      description: "Érj el jobb jegyeket az együttmükődés és a támogatás által"
    }
  ];

  return (
    <div className="min-h-screen bg-background pt-0 md:pt-0">
      {/* Header - KIJELENTKEZÉS + ÚJ PROFIL gomb */}
      <header className="container mx-auto px-6 py-4 border-b border-border">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">StudyConnect</h1>
          <div className="flex items-center gap-2">
            {/* ÚJ: Profil gomb */}
            <Button 
              onClick={() => navigate("/profile")} 
              variant="ghost"
              size="sm"
              className="flex items-center gap-2 hover:bg-primary/10"
            >
              <User className="w-4 h-4" />
              Profil
            </Button>
            {/* Kijelentkezés gomb */}
            <Button 
              onClick={handleLogout}
              variant="ghost"
              size="sm"
              className="flex items-center gap-2 hover:bg-destructive hover:text-destructive-foreground"
            >
              <LogOut className="w-4 h-4" />
              Kijelentkezés
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="container mx-auto px-6 py-12 md:py-20">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary rounded-full shadow-lg mb-8">
            <BookOpen className="w-10 h-10 text-white" />
          </div>
          
          <h1 className="text-5xl mb-6 text-primary">
            Üdvözli a StudyConnect
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Találd meg a számodra tökéletes tanulócsoportot, lépj kapcsolatba társaiddal, és teljesíts a kurzusaidat a közös tanulás segítségével.
          </p>
          
          <div className="flex gap-4 justify-center flex-col sm:flex-row">
            <Button 
              onClick={() => navigate("/search")}
              className="bg-primary hover:bg-primary/90 text-white px-8 py-6 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Search className="w-5 h-5 mr-2" />
              Tanulócsoport kereső
            </Button>
            
            <Button 
              onClick={() => navigate("/mygroups")}
              variant="outline"
              className="px-8 py-6 text-lg rounded-xl border-2 border-primary/30 hover:border-primary hover:bg-primary/5 transition-all duration-300"
            >
              <Users className="w-5 h-5 mr-2" />
              Saját csoportok
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-20">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div 
                key={index}
                className="bg-card border border-border rounded-2xl p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            );
          })}
        </div>

        {/* Quick Actions Section */}
        <div className="mt-20 bg-sidebar rounded-3xl p-8 md:p-12 shadow-2xl">
          <div className="text-center mb-10">
            <h2 className="text-3xl text-white mb-3">Kezdj hozzá ma!</h2>
            <p className="text-white/70">Válaszd ki, hogyan szeretnél bekapcsolódni a StudyConnectbe</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <button
              onClick={() => navigate("/search")}
              className="bg-background/80 hover:bg-background border border-border/50 rounded-2xl p-6 text-left transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group"
            >
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Search className="w-7 h-7 text-primary" />
              </div>
              <h3 className="mb-2 text-black">Csoportok felfedezése</h3>
              <p className="text-sm text-black/70">Böngéssz és csatlakozz tanuló csoportokhoz az ELTE tantárgy kínálata alapján</p>
            </button>

            <button
              onClick={handleLogout}
              className="bg-background/80 hover:bg-background border border-border/50 rounded-2xl p-6 text-left transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group"
            >
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <UserPlus className="w-7 h-7 text-primary" />
              </div>
              <h3 className="mb-2 text-black">Hívd meg a társaidat</h3>
              <p className="text-sm text-black/70">Már van akivel bevált a közös tanulás? Mentsd el ismerősnek és hívd meg a többi csoportodba is</p>
            </button>

            <button
              onClick={handleLogout}
              className="bg-background/80 hover:bg-background border border-border/50 rounded-2xl p-6 text-left transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group"
            >
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Calendar className="w-7 h-7 text-primary" />
              </div>
              <h3 className="mb-2 text-black">Események szervezése</h3>
              <p className="text-sm text-black/70">Hozz létre eseményeket a csoportok fórum oldalain, így biztositva hogy mindenki értesül a fontos eseményekről</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
