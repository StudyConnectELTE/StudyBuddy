import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Mail, School, Calendar, Bell, BellOff, Lock, Eye, EyeOff, Heart, ArrowLeft, Star } from "lucide-react";
import { useXP, getRankName } from "../hooks/useXP";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "./ui/Dialog";
import { toast } from "sonner";
import { authService } from "../service/api";  // 👈 HOZZÁADANDÓ!


export function ProfileSettingsPage() {
  const navigate = useNavigate();  // ✅ useNavigate React Router-ból
  
  // Notification states
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [groupUpdates, setGroupUpdates] = useState(true);
  const [meetingReminders, setMeetingReminders] = useState(true);
  
  // Password change states
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Felhasználói adatok localStorage-ból vagy API-ból
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = () => {
      try {
        const user = authService.getUser();
        console.log('🔍 authService.getUser():', user);  // 👈 DEBUG!
        
        if (user) {
          const profileData = {
            name: user.name || 'Nincs név',
            email: user.email || 'Nincs email',
            major: user.major || 'Nincs szak megadva',
            year: user.current_semester || 'Nincs évfolyam',
            studentId: user.neptun_code || 'Nincs Neptun',
            phone: user.secondary_email || 'Nincs telefonszám',
            joinedDate: '2026', 
            groupsJoined: 0, 
            totalStudyHours: 0,
            hobbies: user.hobbies ? user.hobbies.split(',') : []  // 👈 VESSZŐ!
          };
          console.log('📊 profileData:', profileData);  // 👈 DEBUG!
          setUserData(profileData);
        } else {
          navigate('/login');
        }
      } catch (error) {
        console.error('Profil hiba:', error);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, [navigate]);
  

  // Fallback adatok ha nincs userData
  const displayData = userData || {
    name: "Betöltés...",
    email: "betoltes@fiktiv.hu",
    phone: "",
    studentId: "",
    major: "Betöltés...",
    year: "",
    joinedDate: "",
    groupsJoined: 0,
    totalStudyHours: 0,
    hobbies: []
  };

  const { xp, level, xpInCurrentLevel, xpToNextLevel, progressPercent, rankName, nextRankName } = useXP();

  const rankColors = {
    "Focus Beginner":    "bg-muted text-muted-foreground",
    "Study Enthusiast":  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    "Focused Student":   "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    "ELTE Focus Master": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    "Focus Legend":      "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  };
  const rankColor = rankColors[rankName] || rankColors["Focus Beginner"];

  const getInitials = (name) => {
    if (!name || name === "Betöltés...") return "TU";
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Kérlek töltsd ki az összes mezőt");
      return;
    }
  
    if (newPassword !== confirmPassword) {
      toast.error("Az új jelszavak nem egyeznek");
      return;
    }
  
    if (newPassword.length < 8) {
      toast.error("A jelszónak legalább 8 karakter hosszúnak kell lennie");
      return;
    }
  
    setIsChangingPassword(true);
  
    try {
      // 👈 IGAZI API HÍVÁS!
      await authService.changePassword(currentPassword, newPassword);
      toast.success("✅ Jelszó sikeresen megváltoztatva!");
      
      // Űrlap törlése
      setShowPasswordDialog(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      
    } catch (error) {
      console.error('Jelszóváltoztatás hiba:', error);
      toast.error(error || "Hiba történt a jelszóváltoztatáskor");
    } finally {
      setIsChangingPassword(false);
    }
  };
  

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">Profil betöltése...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="container mx-auto max-w-5xl">
        {/* Header + VISSZA gomb */}
        <div className="mb-8 flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => navigate('/')}  // ✅ navigate('/')
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Vissza a kezdőlapra
          </Button>
          
          <div>
            <h1 className="mb-2">Profil & Beállítások</h1>
            <p className="text-muted-foreground">
              Kezeld személyes adataidat és értesítési beállításaidat
            </p>
          </div>
        </div>

        {/* ... A többi kód pontosan ugyanaz marad, mint az előző válaszban ... */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <Card className="p-6 border-border">
              <div className="text-center">
                <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <span className="text-white text-3xl">{getInitials(userData.name)}</span>
                </div>
                <h2 className="mb-1">{userData.name}</h2>
                <p className="text-sm text-muted-foreground mb-4">{userData.major}</p>
                
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                  <School className="w-4 h-4" />
                  <span>{userData.year}. szemeszter</span>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-border space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Csoportok száma</span>
                  <span>{userData.groupsJoined}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tanulási órák</span>
                  <span>{userData.totalStudyHours}h</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tag óta</span>
                  <span>{userData.joinedDate}</span>
                </div>
              </div>
            </Card>
          </div>
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <Card className="p-6 border-border">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3>Személyes információk</h3>
                  <p className="text-sm text-muted-foreground">Fiókod adatai</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-sm mb-2 block">Teljes név</Label>
                    <div className="text-sm">{userData.name}</div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm mb-2 block">Neptun/kód</Label>
                    <div className="text-sm">{userData.studentId}</div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-sm mb-2 block">Email cím</Label>
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span>{userData.email}</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm mb-2 block">Másodlagos email cím</Label>
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span>{userData.phone || 'Nincs megadva'}</span>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground text-sm mb-2 block">Szak</Label>
                    <div className="flex items-center gap-2 text-sm">
                      <School className="w-4 h-4 text-muted-foreground" />
                      <span>{displayData.major}</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-sm mb-2 block">Évfolyam</Label>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span>{userData.year}. szemeszter</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Gamification — XP & Level */}
            <Card className="p-6 border-border">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                  <Star className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3>Haladás & XP</h3>
                  <p className="text-sm text-muted-foreground">Tanulási teljesítményed</p>
                </div>
              </div>

              {/* Rank badge + level */}
              <div className="flex items-center gap-3 mb-5">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${rankColor}`}>
                  {rankName}
                </span>
                <span className="text-muted-foreground text-sm">· {level}. szint</span>
              </div>

              {/* XP progress bar */}
              <div className="mb-2">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">XP haladás</span>
                  <span className="font-medium">{xpInCurrentLevel} / 100 XP</span>
                </div>
                <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-700"
                    style={{ width: `${Math.max(progressPercent, 2)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Még {xpToNextLevel} XP kell a következő szinthez
                  {nextRankName !== rankName && ` (${nextRankName})`}
                </p>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-2 gap-4 mt-5 pt-5 border-t border-border">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Összes XP</p>
                  <p className="text-2xl font-bold text-primary">{xp}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Következő rang</p>
                  <p className="text-sm font-medium">
                    {nextRankName !== rankName ? nextRankName : "Maximum szint!"}
                  </p>
                </div>
              </div>
            </Card>

            {/* Hobbies & Interests */}
            {displayData?.hobbies && displayData.hobbies.length > 0 && (
              <Card className="p-6 border-border">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                    <Heart className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3>Hobbi & Érdeklődési körök</h3>
                    <p className="text-sm text-muted-foreground">Kiválasztott hobbik</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {userData.hobbies.map((hobby) => (
                    <div
                      key={hobby}
                      className="px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm border border-primary/20"
                    >
                      {hobby}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Security Settings */}
            <Card className="p-6 border-border">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                  <Lock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3>Biztonság</h3>
                  <p className="text-sm text-muted-foreground">Jelszó kezelése</p>
                </div>
              </div>

              <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full md:w-auto">
                    <Lock className="w-4 h-4 mr-2" />
                    Jelszó módosítása
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Jelszó módosítása</DialogTitle>
                    <DialogDescription>
                      Add meg a jelenlegi jelszavad, majd válassz új jelszót
                    </DialogDescription>
                  </DialogHeader>
                  
                  <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div>
                      <Label htmlFor="current-password">Jelenlegi jelszó</Label>
                      <div style={{height: 10 + 'px'}}></div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="current-password"
                          type={showCurrentPassword ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="pl-10 pr-10"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="new-password">Új jelszó</Label>
                      <div style={{height: 10 + 'px'}}></div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="new-password"
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="pl-10 pr-10"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Legalább 8 karakter
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="confirm-password">Új jelszó megerősítése</Label>
                      <div style={{height: 10 + 'px'}}></div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="confirm-password"
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="pl-10 pr-10"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowPasswordDialog(false);
                          setCurrentPassword("");
                          setNewPassword("");
                          setConfirmPassword("");
                        }}
                        disabled={isChangingPassword}
                      >
                        Mégse
                      </Button>
                      <Button
                        type="submit"
                        disabled={isChangingPassword}
                      >
                        {isChangingPassword ? "Módosítás..." : "Jelszó módosítása"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </Card>

            {/* Notification Settings */}
            <Card className="p-6 border-border">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                  {notificationsEnabled ? (
                    <Bell className="w-5 h-5 text-primary" />
                  ) : (
                    <BellOff className="w-5 h-5 text-primary" />
                  )}
                </div>
                <div>
                  <h3>Értesítési beállítások</h3>
                  <p className="text-sm text-muted-foreground">Kezeld hogyan kapsz értesítéseket</p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Master Notification Toggle */}
                <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
                  <div className="flex-1">
                    <Label htmlFor="all-notifications" className="cursor-pointer">
                      Minden értesítés
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Minden értesítés ki-/bekapcsolása
                    </p>
                  </div>
                  <Switch
                    id="all-notifications"
                    checked={notificationsEnabled}
                    onCheckedChange={setNotificationsEnabled}
                  />
                </div>

                {/* Individual Settings */}
                <div 
                  className="space-y-4 opacity-100 transition-opacity duration-300"
                  style={{ 
                    opacity: notificationsEnabled ? 1 : 0.5, 
                    pointerEvents: notificationsEnabled ? 'auto' : 'none' 
                  }}
                >
                  <div className="flex items-center justify-between py-3 border-b border-border/50">
                    <div className="flex-1">
                      <Label htmlFor="email-notifications" className="cursor-pointer">
                        Email értesítések
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Értesítések emailben
                      </p>
                    </div>
                    <Switch
                      id="email-notifications"
                      checked={emailNotifications}
                      onCheckedChange={setEmailNotifications}
                      disabled={!notificationsEnabled}
                    />
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-border/50">
                    <div className="flex-1">
                      <Label htmlFor="group-updates" className="cursor-pointer">
                        Csoport frissítések
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Értesítések csoport aktivitásról
                      </p>
                    </div>
                    <Switch
                      id="group-updates"
                      checked={groupUpdates}
                      onCheckedChange={setGroupUpdates}
                      disabled={!notificationsEnabled}
                    />
                  </div>

                  <div className="flex items-center justify-between py-3">
                    <div className="flex-1">
                      <Label htmlFor="meeting-reminders" className="cursor-pointer">
                        Találkozó emlékeztetők
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Emlékeztetők közelgő tanulási alkalmakra
                      </p>
                    </div>
                    <Switch
                      id="meeting-reminders"
                      checked={meetingReminders}
                      onCheckedChange={setMeetingReminders}
                      disabled={!notificationsEnabled}
                    />
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
