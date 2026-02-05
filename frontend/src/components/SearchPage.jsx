import { useState } from "react";
import { Search, BookOpen, Users, UserPlus, Eye, User as UserIcon, Home } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/Dialog";
import { subjectService, groupService } from "../service/api";
import { useNavigate } from "react-router-dom";

export function SearchPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [groups, setGroups] = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [joiningGroupId, setJoiningGroupId] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [membersModalOpen, setMembersModalOpen] = useState(false);
  const [selectedGroupMembers, setSelectedGroupMembers] = useState([]);
  const [selectedGroupName, setSelectedGroupName] = useState("");
  const [membersLoading, setMembersLoading] = useState(false);
  const [error, setError] = useState("");

  // Vissza a HomePage-re
  const handleGoHome = () => {
    navigate("/");
  };

  // 1. Tantárgy keresés
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoadingSubjects(true);
    setError("");
    setHasSearched(true);
    setSelectedSubject(null);
    setGroups([]);
    
    try {
      const data = await subjectService.searchSubjects(searchQuery.trim());
      setSubjects(data || []);
    } catch (err) {
      console.error(err);
      setError("Nem sikerült a tantárgyak keresése.");
      setSubjects([]);
    } finally {
      setLoadingSubjects(false);
    }
  };

  // 2. Tantárgy kiválasztása → csoportok betöltése
  const handleSelectSubject = async (subject) => {
    setSelectedSubject(subject);
    setGroups([]);
    setError("");
    setLoadingGroups(true);

    try {
      const response = await groupService.searchGroups(subject.name);
      
      const allGroups = [];
      const seenIds = new Set();

      if (response.all_groups && Array.isArray(response.all_groups)) {
        response.all_groups.forEach((group) => {
          if (!seenIds.has(group.id)) {
            allGroups.push(group);
            seenIds.add(group.id);
          }
        });
      }

      if (response.recommended_group && !seenIds.has(response.recommended_group.id)) {
        allGroups.push(response.recommended_group);
      }

      setGroups(allGroups);
    } catch (err) {
      console.error(err);
      setError("Nem sikerült a csoportok betöltése.");
    } finally {
      setLoadingGroups(false);
    }
  };

  // 3. Csatlakozás csoporthoz
  const handleJoinGroup = async (groupId) => {
    if (!groupId) return;
    setJoiningGroupId(groupId);
    setError("");

    try {
      await groupService.joinGroup(groupId);

      if (selectedSubject) {
        const response = await groupService.searchGroups(selectedSubject.name);
        const allGroups = [];
        const seenIds = new Set();

        if (response.all_groups && Array.isArray(response.all_groups)) {
          response.all_groups.forEach((group) => {
            if (!seenIds.has(group.id)) {
              allGroups.push(group);
              seenIds.add(group.id);
            }
          });
        }

        if (response.recommended_group && !seenIds.has(response.recommended_group.id)) {
          allGroups.push(response.recommended_group);
        }

        setGroups(allGroups);
      }
    } catch (err) {
      console.error(err);
      setError("Nem sikerült csatlakozni a csoporthoz.");
    } finally {
      setJoiningGroupId(null);
    }
  };

  // 4. Tagok megtekintése
  const handleViewMembers = async (groupId, groupName) => {
    setSelectedGroupName(groupName);
    setMembersModalOpen(true);
    setSelectedGroupMembers([]);
    setMembersLoading(true);

    try {
      const members = await groupService.getGroupMembers(groupId);
      setSelectedGroupMembers(members || []);
    } catch (err) {
      console.error("Tagok hiba:", err);
      setError(err.message || "Hiba történt a tagok lekérése során");
      setSelectedGroupMembers([]);
    } finally {
      setMembersLoading(false);
    }
  };


  const isUserMemberOfGroup = (group) => group.is_member === true;

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="container mx-auto max-w-6xl">
        {/* Home gomb */}
        <div className="mb-6 flex justify-between items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={handleGoHome}
            className="flex items-center gap-2 border-[#3b82f6]/30 hover:bg-[#3b82f6]/5 hover:border-[#3b82f6] transition-all duration-300"
          >
            <Home className="w-4 h-4" />
            Vissza a kezdőlapra
          </Button>
        </div>

        {/* Search Header */}
        <div className="text-center mb-8">
          <h1 className="mb-4">Találd meg a csoportod!</h1>
          <p className="text-muted-foreground">
            A csoportokra a tantárgy neve és kódja szerint is rákereshetsz
          </p>
        </div>

        {/* Search Box */}
        <div className="bg-card rounded-2xl shadow-lg p-8 mb-8 border border-border">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Keresés név vagy kód szerint..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-12 py-6 text-base bg-input-background rounded-xl border-2 border-border focus:border-primary transition-all duration-300"
                disabled={loadingSubjects}
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={loadingSubjects || !searchQuery.trim()}
              className="bg-gradient-to-r from-[#012851] to-[#3b82f6] hover:from-[#012851]/90 hover:to-[#3b82f6]/90 text-white px-8 py-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300"
            >
              {loadingSubjects ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                "Keresés"
              )}
            </Button>
          </div>
          
          {error && (
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Subjects Results */}
        {hasSearched && !selectedSubject && !loadingSubjects && (
          <div>
            <div className="mb-6">
              <h2 className="mb-2">Eredmények</h2>
              <p className="text-muted-foreground">
                Found {subjects.length} {subjects.length === 1 ? 'subject' : 'subjects'}
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subjects.map((subject) => (
                <div
                  key={subject.code || subject.id}
                  onClick={() => handleSelectSubject(subject)}
                  className="bg-card border border-border rounded-xl p-5 hover:shadow-lg hover:border-[#3b82f6]/50 transition-all duration-300 cursor-pointer hover:-translate-y-1"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#012851] to-[#3b82f6] rounded-lg flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base mb-1 line-clamp-2">{subject.name}</h3>
                      <p className="text-primary text-sm">{subject.code}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground pt-3 border-t border-border/50">
                    <span>Kattints a csoportok megtekintéséhez</span>
                  </div>
                </div>
              ))}
            </div>

            {subjects.length === 0 && (
              <div className="text-center py-20">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="mb-2">Nem található ilyen tantárgy</h3>
                <p className="text-muted-foreground">
                  Ellenőrizd a beírt tárgy nevét vagy kódját
                </p>
              </div>
            )}
          </div>
        )}

        {/* Groups Results - MyGroupsPage stílus */}
        {selectedSubject && (
          <div>
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h2 className="mb-2 text-2xl font-bold bg-gradient-to-r from-[#012851] to-[#3b82f6] bg-clip-text text-transparent">
                  Elérhető csoportok
                </h2>
                <p className="text-muted-foreground">{selectedSubject.name} ({selectedSubject.code})</p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedSubject(null);
                  setGroups([]);
                }}
                className="border-[#3b82f6]/50 hover:bg-[#3b82f6]/5"
              >
                ← Vissza a tantárgyakhoz
              </Button>
            </div>

            {loadingGroups && (
              <div className="text-center py-20">
                <div className="w-16 h-16 border-2 border-[#3b82f6]/20 border-t-[#3b82f6] rounded-full animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Csoportok betöltése...</p>
              </div>
            )}

            {!loadingGroups && groups.length === 0 && (
              <div className="text-center py-20 bg-muted/20 rounded-2xl p-12">
                <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="mb-2 text-lg font-semibold">Még nincs csoport</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Ehhez a tantárgyhoz még nem hoztak létre tanulócsoportot.
                </p>
              </div>
            )}

            {!loadingGroups && groups.length > 0 && (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groups.map((group) => (
                  <div
                    key={group.id}
                    className="bg-card border border-border rounded-2xl p-6 hover:shadow-lg hover:border-[#3b82f6]/50 transition-all duration-300 cursor-pointer hover:-translate-y-1"
                  >
                    {/* Group Header */}
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#012851] to-[#3b82f6] rounded-xl flex items-center justify-center flex-shrink-0">
                        <Users className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base mb-1">{group.name}</h3>
                        <p className="text-[#3b82f6] text-sm font-medium">{selectedSubject.code}</p>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                      {group.description || "Nincs leírás"}
                    </p>

                    {/* Info */}
                    <div className="space-y-2 mb-4 pb-4 border-b border-border/50">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Users className="w-4 h-4" />
                        <span>{group.member_count || 0} members</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            className="flex-1 rounded-lg border-[#3b82f6]/30 hover:bg-[#3b82f6]/5 hover:border-[#3b82f6] transition-all duration-300 h-9"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewMembers(group.id, group.name);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Members
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>{selectedGroupName}</DialogTitle>
                            <DialogDescription>
                              Group members ({selectedGroupMembers.length})
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-2 max-h-96 overflow-y-auto">
                            {membersLoading ? (
                              <div className="flex flex-col items-center py-8">
                                <div className="w-8 h-8 border-2 border-[#3b82f6]/20 border-t-[#3b82f6] rounded-full animate-spin mb-2" />
                                <p className="text-sm text-muted-foreground">Tagok betöltése...</p>
                              </div>
                            ) : selectedGroupMembers.length === 0 ? (
                              <div className="text-center py-8">
                                <p className="text-sm text-muted-foreground">Még nincsenek tagok</p>
                              </div>
                            ) : (
                              selectedGroupMembers.map((member, index) => (
                                <div
                                  key={member.id || index}
                                  className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg"
                                >
                                  <div className="w-10 h-10 bg-gradient-to-br from-[#012851] to-[#3b82f6] rounded-full flex items-center justify-center">
                                    <UserIcon className="w-5 h-5 text-white" />
                                  </div>
                                  <span className="text-sm font-medium flex-1 min-w-0 truncate">
                                    {member.name || member.email || "Névtelen felhasználó"}
                                  </span>
                                  {member.role === "You" && (
                                    <span className="text-xs bg-[#3b82f6]/20 text-[#3b82f6] px-2 py-1 rounded font-medium">
                                      You
                                    </span>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleJoinGroup(group.id);
                        }}
                        disabled={
                          (group.member_count || 0) >= 6 ||
                          joiningGroupId === group.id ||
                          isUserMemberOfGroup(group)
                        }
                        className="flex-1 bg-gradient-to-r from-[#012851] to-[#3b82f6] hover:from-[#012851]/90 hover:to-[#3b82f6]/90 h-9 shadow-md hover:shadow-lg transition-all duration-300 text-white rounded-lg"
                      >
                        {joiningGroupId === group.id ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        ) : isUserMemberOfGroup(group) ? (
                          "Már tag vagy"
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4 mr-2" />
                            Csatlakozás
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!hasSearched && (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gradient-to-br from-[#012851]/20 to-[#3b82f6]/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="w-10 h-10 text-[#3b82f6]" />
            </div>
            <h2 className="mb-3">Készen állsz hogy megtaláld a tanulócsoportod?</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Írj be egy tantárgy nevét vagy kurzuskódot a fenti keresőmezőbe az elérhető tanulmányi csoportok megtekintéséhez.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
