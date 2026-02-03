import { useState } from "react";
import {
  User,
  Mail,
  Lock,
  BookOpen,
  Hash,
  GraduationCap,
  ArrowLeft,
  Search,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card } from "./ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/Select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/Command";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { toast } from "sonner";

const MAJORS = [
'IK - autonómrendszer-informatikus',
  'IK - gépészmérnöki BSc',
  'IK - gépészmérnöki BSc - Gépészeti mechatronika',
  'IK - gépészmérnöki BSc - Ipar 4.0',
  'IK - gépészmérnöki MSc',
  'IK - adattudomány',
  'IK - geoinformatika',
  'IK - műszaki menedzser',
  'IK - programtervező informatikus [fejlesztő] F',
  'IK - programtervező informatikus BSc',
  'IK - programtervező informatikus BSc - A szakirány',
  'IK - programtervező informatikus BSc - B szakirány',
  'IK - programtervező informatikus BSc - C szakirány',
  'IK - programtervező informatikus BSc - D szakirány',
  'IK - programtervező informatikus MSc - Kiberbiztonság',
  'IK - programtervező informatikus MSc - Szoftvertechnológia',
  'IK - programtervező informatikus MSc - Modellalkotó',
  'IK - programtervező informatikus MSc - Pénzügyi informatika (Fintech)',
  'IK - térképész',
  'TTK - alkalmazott matematikus',
  'TTK - anyagtudomyány',
  'TTK - biológia BSc',
  'TTK - biológia MSc - IH specializáció',
  'TTK - biológia MSc - MGSF specializáció',
  'TTK - biológia MSc - MIM specializáció',
  'TTK - biológia MSc - NÖB specializáció',
  'TTK - biológia MSc - ÖEK specializáció',
  'TTK - biológia MSc - Bioinformatika specializáció',
  'TTK - biotechnológia',
  'TTK - biztonsítási és pénzügyi matematika',
  'TTK - biztonsítási és pénzügyi matematika - Aktuárius',
  'TTK - biztonsítási és pénzügyi matematika - Kvantitatív pénzügyek',
  'TTK - csillagászat',
  'TTK - fizika BSc',
  'TTK - fizika BSc - Számítógépes fizikus',
  'TTK - fizika BSc - Fizikus',
  'TTK - fizika BSc - Biofizikus',
  'TTK - fizika BSc - Csillagász',
  'TTK - fizika BSc - Geofizikus',
  'TTK - fizika BSc - Meterológus',
  'TTK - fizika MSc - Biofizika',
  'TTK - fizika MSc - Kutató fizikus',
  'TTK - fizika MSc - Tudományos adatanalitika és modellezés',
  'TTK - földrajz',
  'TTK - földrajz - Megújuló energiaforrások',
  'TTK - földrajz - Regionális elemző',
  'TTK - földrajz - Táj- és környezetföldrajz',
  'TTK - földrajz - Terület- és településfejlesztő',
  'TTK - földrajz - Turizmus',
  'TTK - földtudomyány',
  'TTK - földtudomyány - Csillagász',
  'TTK - földtudomyány - Geofizikus',
  'TTK - földtudomyány - Geográfus',
  'TTK - földtudomyány - Geológus',
  'TTK - földtudomyány - Meterológus',
  'TTK - földtudomyány - Térképész-geoinformatikus',
  'TTK - geofizikus - Kutató geofizikus',
  'TTK - geofizikus - Űrkutató-távérzékelő',
  'TTK - geográfus - Terület- és településfejlesztés',
  'TTK - geográfus - Regionális elemző',
  'TTK - geográfus - Környezetelemző',
  'TTK - geográfus - Geoinformatika',
  'TTK - geológus',
  'TTK - geológus - Ásvány-kőzettan-geokémia, ásványi nyersanyagok, archeometria',
  'TTK - geológus - Földtan-őslénytan',
  'TTK - geológus - Vízföldtan, szénhidrogénföldtan, környezetföldtan',
  'TTK - kémia',
  'TTK - kémia - Vegyész analitikus',
  'TTK - kémia - Elméleti kémia',
  'TTK - környezettan',
  'TTK - környezettan - Környezetkutató',
  'TTK - környezettan - Meterológia',
  'TTK - környezettudomány',
  'TTK - környezettudomány - Alkalmazott ökológia',
  'TTK - környezettudomány - Környezet-földtudomány',
  'TTK - környezettudomány - Környezetfizika',
  'TTK - környezettudomány - Műszeres környezeti analitika',
  'TTK - matematika BSc',
  'TTK - matematika BSc - Matematikus',
  'TTK - matematika BSc - Matematikai elemző',
  'TTK - matematika BSc - Alkalmazomatikus',
  'TTK - matematikus MSc',
  'TTK - matematikus MSc - Alkalmazott analízis',
  'TTK - matematikus MSc - Operációkutatás',
  'TTK - matematikus MSc - Számítástudomány',
  'TTK - matematikus MSc - Sztochasztika',
  'TTK - meterológus',
  'TTK - meterológus - Időjárás előrejelző',
  'TTK - meterológus - Éghajlatkutató',
  'TTK - vegyész',
  'TTK - vegyész - Anyagkutatás',
  'TTK - vegyész - Analitikai kémia',
  'TTK - vegyész - Elméleti kémia és szerkezetvizsgáló módszerek',
  'TTK - vegyész - Szintetikus biomolekuláris és gyógyszerkémia',
];

export function RegisterPage({ onRegister, onSwitchToLogin }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [major, setMajor] = useState("");
  const [neptuneCode, setNeptuneCode] = useState("");
  const [semester, setSemester] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const validateEmail = (email) => {
    return email.endsWith("@inf.elte.hu") || email.endsWith("@student.hu");
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!name || !email || !major || !neptuneCode || !semester) {
      toast.error("Please fill in all fields");
      return;
    }

    if (!validateEmail(email)) {
      toast.error("Email must end with @inf.elte.hu or @student.hu");
      return;
    }

    if (neptuneCode.length !== 6) {
      toast.error("Neptune code must be 6 characters long");
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const userData = {
        name,
        email,
        major,
        neptuneCode,
        semester,
        registeredAt: new Date().toISOString(),
      };

      toast.success("Registration successful!", {
        description: `A temporary password has been sent to ${email}`,
      });

      onRegister(userData);
      setIsLoading(false);
    }, 1500);
  };

  const filteredMajors = MAJORS.filter((m) =>
    m.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 py-8">
      <Card className="w-full max-w-2xl p-8 border-border shadow-lg">
        <button
          onClick={onSwitchToLogin}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to login
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="mb-2">Create Your Account</h1>
          <p className="text-sm text-muted-foreground">
            Join StudyConnect and start collaborating
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div>
            <Label htmlFor="name">Full Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <Label htmlFor="email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="student@inf.elte.hu or student@student.hu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Must end with @inf.elte.hu or @student.hu
            </p>
          </div>

          {/* Major */}
          <div>
            <Label htmlFor="major">Major</Label>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-full justify-between"
                >
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-muted-foreground" />
                    <span className={major ? "" : "text-muted-foreground"}>
                      {major || "Select your major..."}
                    </span>
                  </div>
                  <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput
                    placeholder="Search major..."
                    value={searchQuery}
                    onValueChange={setSearchQuery}
                  />
                  <CommandList>
                    <CommandEmpty>No major found.</CommandEmpty>
                    <CommandGroup>
                      {filteredMajors.map((m) => (
                        <CommandItem
                          key={m}
                          value={m}
                          onSelect={(currentValue) => {
                            setMajor(currentValue);
                            setOpen(false);
                            setSearchQuery("");
                          }}
                        >
                          {m}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {/* Neptune Code */}
            <div>
              <Label htmlFor="neptune">Neptune Code</Label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="neptune"
                  type="text"
                  placeholder="ABC123"
                  value={neptuneCode}
                  onChange={(e) =>
                    setNeptuneCode(e.target.value.toUpperCase())
                  }
                  className="pl-10"
                  maxLength={6}
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                6 characters
              </p>
            </div>

            {/* Semester */}
            <div>
              <Label htmlFor="semester">Current Semester</Label>
              <Select value={semester} onValueChange={setSemester}>
                <SelectTrigger id="semester">
                  <SelectValue placeholder="Select semester" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1st Semester</SelectItem>
                  <SelectItem value="2">2nd Semester</SelectItem>
                  <SelectItem value="3">3rd Semester</SelectItem>
                  <SelectItem value="4">4th Semester</SelectItem>
                  <SelectItem value="5">5th Semester</SelectItem>
                  <SelectItem value="6">6th Semester</SelectItem>
                  <SelectItem value="7">7th Semester</SelectItem>
                  <SelectItem value="8">8th Semester</SelectItem>
                  <SelectItem value="9">9th Semester</SelectItem>
                  <SelectItem value="10">10th Semester</SelectItem>
                  <SelectItem value="11">11th Semester</SelectItem>
                  <SelectItem value="12">12th Semester</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
            <div className="flex gap-3">
              <Lock className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm">
                  A temporary password will be sent to your email address after
                  registration.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  You can change it later in your profile settings.
                </p>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary90 text-white"
            disabled={isLoading}
          >
            {isLoading ? "Creating Account..." : "Create Account"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <button
              onClick={onSwitchToLogin}
              className="text-primary hover:underline"
            >
              Sign in
            </button>
          </p>
        </div>
      </Card>
    </div>
  );
}
