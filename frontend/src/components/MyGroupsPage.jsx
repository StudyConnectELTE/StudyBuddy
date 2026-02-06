import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Eye, LogOut, BookOpen, Calendar,ArrowLeft, User as UserIcon } from "lucide-react";
import { Button } from "./ui/button";
import ForumPage from "./ForumPage";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { groupService } from "../service/api";

const MyGroupsPage = () => {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [membersDialog, setMembersDialog] = useState(false);
  const [selectedGroupMembers, setSelectedGroupMembers] = useState([]);
  const [selectedGroupName, setSelectedGroupName] = useState("");

  const navigate = useNavigate();

  // 🆕 CSOPORTOK BETÖLTÉSE + TAGOK SZÁMA API-ból
  useEffect(() => {
    const fetchMyGroups = async () => {
      try {
        setLoading(true);
        const response = await groupService.myGroups();
        const apiGroups = response.groups || [];

        // 🆗 MINDEN CSOPORTHOZ LEKÉRDEZZÜK A TAGOKAT
        const groupsWithMemberCounts = await Promise.all(
          apiGroups.map(async (group) => {
            try {
              const members = await groupService.getGroupMembers(group.id);
              return {
                id: group.id,
                name: group.name,
                subject: group.subject,
                description: group.description,
                members: members?.length || 0,  // ← VALÓDI TAG SZÁM!
                meetingSchedule: "Nincs ütemezve",
                membersList: [],
                membersWithEmails: []
              };
            } catch (err) {
              console.warn(`Tagok lekérdezése sikertelen ${group.id}-hez:`, err);
              return {
                id: group.id,
                name: group.name,
                subject: group.subject,
                description: group.description,
                members: 0,  // ← alapértelmezett 0
                meetingSchedule: "Nincs ütemezve",
                membersList: [],
                membersWithEmails: []
              };
            }
          })
        );

        setGroups(groupsWithMemberCounts);
      } catch (error) {
        console.error("Hiba:", error);
        setGroups([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMyGroups();
  }, []);

  const handleLeaveGroup = async (groupId) => {
    if (confirm("Biztosan ki szeretnél lépni ebből a csoportból?")) {
      try {
        await groupService.leaveGroup(groupId);
        setGroups(groups.filter(group => group.id !== groupId));
      } catch (error) {
        console.error("Hiba a kilépéskor:", error);
        alert("Hiba történt a kilépés során");
      }
    }
  };

  // Tagok betöltése DIALOG-hoz
  const handleViewMembers = async (groupId, groupName) => {
    setSelectedGroupName(groupName);
    setSelectedGroupMembers([]);
    
    try {
      const members = await groupService.getGroupMembers(groupId);
      setSelectedGroupMembers(members || []);
    } catch (err) {
      console.error("Tagok hiba:", err);
      setSelectedGroupMembers([]);
    }
  };

  const openMembersDialog = (group) => {
    handleViewMembers(group.id, group.name);
    setMembersDialog(true);
  };

  const closeMembersDialog = () => {
    setMembersDialog(false);
    setSelectedGroupMembers([]);
    setSelectedGroupName("");
  };

  if (selectedGroup) {
    return (
      <ForumPage
        groupName={selectedGroup.name}
        groupSubject={selectedGroup.subject}
        groupId={selectedGroup.id}
        members={selectedGroup.membersWithEmails}
        onBack={() => setSelectedGroup(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
        <Button
            variant="ghost"
            onClick={() => navigate("/home")}
            className="mb-4 hover:bg-primary/10 transition-all duration-300"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to the Home Page
          </Button>
          <h1 className="mb-2 text-3xl font-bold tracking-tight">Saját Csoportjaim</h1>
          <p className="text-muted-foreground text-lg">
            Kezeld tanulócsoportjaidat és maradj kapcsolatban társaiddal
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        )}

        {/* Groups Grid */}
        {!loading && groups.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map((group) => (
              <div
                key={group.id}
                onClick={() => setSelectedGroup(group)}
                className="bg-card border border-border rounded-2xl p-6 hover:shadow-lg hover:border-primary/50 transition-all duration-300 cursor-pointer hover:-translate-y-1 group"
              >
                {/* Group Header */}
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold mb-1 line-clamp-1">{group.name}</h3>
                    <p className="text-primary text-sm font-medium">{group.subject}</p>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                  {group.description}
                </p>

                {/* Info - VALÓDI TAG SZÁM! */}
                <div className="space-y-2 mb-6 pb-4 border-b border-border/50">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>{group.members} tag</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>{group.meetingSchedule}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <Dialog 
                    open={membersDialog}
                    onOpenChange={(open) => !open && closeMembersDialog()}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="flex-1 rounded-lg border-primary/30 hover:bg-primary/5 hover:border-primary transition-all duration-300"
                        onClick={(e) => {
                          e.stopPropagation();
                          openMembersDialog(group);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Tagok
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>{selectedGroupName}</DialogTitle>
                        <DialogDescription>
                          Csoport tagjai ({group.members})
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {selectedGroupMembers.length === 0 ? (
                          <div className="flex items-center justify-center py-8 text-muted-foreground">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2"></div>
                            Tagok betöltése...
                          </div>
                        ) : selectedGroupMembers.length > 0 ? (
                          selectedGroupMembers.map((member, index) => (
                            <div 
                              key={member.id || index} 
                              className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg"
                            >
                              <div className="w-10 h-10 bg-gradient-to-br from-primary to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                {member.name ? member.name.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase() : '?'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="text-sm font-medium block truncate">
                                  {member.name || "Névtelen felhasználó"}
                                </span>
                                <span className="text-xs text-muted-foreground block truncate">
                                  {member.email || "Nincs email"}
                                </span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-8">
                            Nincsenek tagok a csoportban
                          </p>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLeaveGroup(group.id);
                    }}
                    className="flex-1 rounded-lg border-destructive/30 hover:bg-destructive/5 hover:border-destructive text-destructive transition-all duration-300 font-medium"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Kilépés
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : !loading && (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-semibold mb-3 text-muted-foreground">Még nincsenek csoportjaid</h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-8">
              Nem csatlakoztál még egyetlen tanulócsoporthoz sem. Kezdd azzal, hogy keresel tárgyakat és csatlakozol megfelelő csoportokhoz.
            </p>
            <Button variant="outline" className="text-primary hover:bg-primary/5">
              Csoportok keresése
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyGroupsPage;
