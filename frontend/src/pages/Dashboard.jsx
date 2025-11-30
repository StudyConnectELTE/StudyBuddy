import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  Fab,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  IconButton,
} from "@mui/material";
import {
  Add as AddIcon,
  Logout as LogoutIcon,
  People as PeopleIcon,
} from "@mui/icons-material";
import { logout } from "../redux/slices/authSlice";
import { authService, groupService } from "../services/api";
import "./Dashboard.css";
import logo from "../assets/logo_studyBuddy.png";

// Tárgyak listája pelda
const SUBJECTS = [
  "Analízis",
  "Lineáris algebra",
  "Diszkrét matematika",
  "Adatstruktúrák és algoritmusok",
  "Programozás",
  "Adatbázisok",
  "Hálózatok",
  "Operációs rendszerek",
  "Szoftvertechnológia",
  "Mesterséges intelligencia",
  "Gépi tanulás",
  "Webfejlesztés",
  "Mobilalkalmazás fejlesztés",
  "Számítógépes grafika",
  "Kriptográfia",
  "Adatbányászat",
  "Statisztika",
  "Valószínűségszámítás",
];

const Dashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [joinGroupModalOpen, setJoinGroupModalOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [joiningGroupId, setJoiningGroupId] = useState(null);
  const [membersModalOpen, setMembersModalOpen] = useState(false);
  const [selectedGroupMembers, setSelectedGroupMembers] = useState([]);
  const [selectedGroupName, setSelectedGroupName] = useState("");

  const handleLogout = () => {
    authService.logout();
    dispatch(logout());
    navigate("/login");
  };

  const handleAddButton = () => {
    setJoinGroupModalOpen(true);
  };

  const handleCloseJoinGroupModal = () => {
    setJoinGroupModalOpen(false);
    setSelectedSubject("");
  };

  const handleJoinGroup = async () => {
    if (!selectedSubject) {
      setError("Válassz ki egy tárgyat!");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await groupService.searchGroups(selectedSubject);
      // A response tartalmazza a recommended_group és all_groups mezőket
      const allGroups = [];
      const seenIds = new Set();

      // Először az all_groups-ot adjuk hozzá
      if (response.all_groups && Array.isArray(response.all_groups)) {
        response.all_groups.forEach((group) => {
          if (!seenIds.has(group.id)) {
            allGroups.push(group);
            seenIds.add(group.id);
          }
        });
      }

      // Ha van recommended_group és még nincs benne, akkor hozzáadjuk
      if (
        response.recommended_group &&
        !seenIds.has(response.recommended_group.id)
      ) {
        allGroups.push(response.recommended_group);
      }

      setGroups(allGroups);
      handleCloseJoinGroupModal();
    } catch (err) {
      setError(err.message || "Hiba történt a csoportok keresése során");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinToGroup = async (groupId) => {
    setJoiningGroupId(groupId);
    setError(null);

    try {
      await groupService.joinGroup(groupId);
      // Frissítjük a csoportok listáját, hogy lássuk az új tag számot
      if (selectedSubject) {
        const response = await groupService.searchGroups(selectedSubject);
        const allGroups = [];
        const seenIds = new Set();

        // Először az all_groups-ot adjuk hozzá
        if (response.all_groups && Array.isArray(response.all_groups)) {
          response.all_groups.forEach((group) => {
            if (!seenIds.has(group.id)) {
              allGroups.push(group);
              seenIds.add(group.id);
            }
          });
        }

        // Ha van recommended_group és még nincs benne, akkor hozzáadjuk
        if (
          response.recommended_group &&
          !seenIds.has(response.recommended_group.id)
        ) {
          allGroups.push(response.recommended_group);
        }

        setGroups(allGroups);
      }
    } catch (err) {
      setError(err.message || "Hiba történt a csatlakozás során");
    } finally {
      setJoiningGroupId(null);
    }
  };

  const getInitials = (name) => {
    if (!name) return "U";
    const words = name.trim().split(" ");
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleProfileClick = () => {
    setProfileModalOpen(true);
  };

  const handleCloseProfileModal = () => {
    setProfileModalOpen(false);
  };

  const handleViewMembers = async (groupId, groupName) => {
    setSelectedGroupName(groupName);
    setMembersModalOpen(true);
    try {
      const members = await groupService.getGroupMembers(groupId);
      setSelectedGroupMembers(members);
    } catch (err) {
      setError(err.message || "Hiba történt a tagok lekérése során");
      setSelectedGroupMembers([]);
    }
  };

  const handleCloseMembersModal = () => {
    setMembersModalOpen(false);
    setSelectedGroupMembers([]);
    setSelectedGroupName("");
  };

  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        <img src={logo} alt="Study Buddy" className="dashboard-logo" />
        <div>
          <Fab
            size="medium"
            color="primary"
            onClick={handleAddButton}
            sx={{
              width: 50,
              height: 50,
              minWidth: 50,
              minHeight: 50,
              borderRadius: "50%",
              boxShadow: "0 2px 8px rgba(102, 126, 234, 0.3)",
              fontSize: "32px",
              fontWeight: 300,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1,
              "&:hover": {
                transform: "scale(1.1)",
                boxShadow: "0 4px 12px rgba(102, 126, 234, 0.4)",
              },
            }}
          >
            +
          </Fab>
          <Avatar
            onClick={handleProfileClick}
            sx={{
              width: 50,
              height: 50,
              bgcolor: "#000000",
              color: "#ffffff",
              cursor: "pointer",
              fontSize: "18px",
              fontWeight: 600,
              transition: "all 0.3s ease",
              "&:hover": {
                transform: "scale(1.1)",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
              },
            }}
          >
            {getInitials(user?.name)}
          </Avatar>
          <Button
            onClick={handleLogout}
            variant="contained"
            startIcon={<LogoutIcon />}
            sx={{
              bgcolor: "#ff6b6b",
              color: "white",
              "&:hover": {
                bgcolor: "#ff5252",
              },
            }}
          >
            Kijelentkezés
          </Button>
        </div>
      </nav>

      <main className="dashboard-content">
        {groups.length === 0 && !loading && (
          <>
            <h2>Üdvözöllek a Study Buddy-ban!</h2>
            <p>Szak: {user?.major}</p>
            <p>Email: {user?.email}</p>
          </>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {loading && (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            minHeight="200px"
          >
            <CircularProgress />
          </Box>
        )}

        {groups.length > 0 && (
          <Box sx={{ width: "100%" }}>
            <Typography variant="h4" sx={{ mb: 3 }}>
              Elérhető csoportok - {selectedSubject}
            </Typography>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
                pb: 4,
                width: "100%",
              }}
            >
              {groups.map((group) => (
                <Card
                  key={group.id}
                  sx={{
                    position: "relative",
                    transition: "all 0.3s ease",
                    "&:hover": {
                      boxShadow: "0 4px 20px rgba(102, 126, 234, 0.15)",
                      transform: "translateY(-2px)",
                    },
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      alignItems="flex-start"
                      gap={2}
                      flexWrap={{ xs: "wrap", sm: "nowrap" }}
                    >
                      <Box flex={1} minWidth={0}>
                        <Typography
                          variant="h6"
                          gutterBottom
                          sx={{
                            fontWeight: 600,
                            color: "#333",
                            mb: 1,
                          }}
                        >
                          {group.name}
                        </Typography>
                        {group.description && (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ mb: 2 }}
                          >
                            {group.description}
                          </Typography>
                        )}
                        {group.common_hobbies &&
                          group.common_hobbies.length > 0 && (
                            <Box sx={{ mb: 2 }}>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{
                                  display: "block",
                                  mb: 0.75,
                                  fontWeight: 500,
                                }}
                              >
                                Közös hobbik:
                              </Typography>
                              <Box
                                sx={{
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: 0.75,
                                }}
                              >
                                {group.common_hobbies.map((hobby) => (
                                  <Box
                                    key={hobby}
                                    sx={{
                                      px: 1.5,
                                      py: 0.5,
                                      borderRadius: "12px",
                                      background:
                                        "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                      color: "white",
                                      fontSize: "12px",
                                      fontWeight: 500,
                                    }}
                                  >
                                    {hobby}
                                  </Box>
                                ))}
                              </Box>
                            </Box>
                          )}
                        <Box display="flex" alignItems="center" gap={1}>
                          <IconButton
                            size="small"
                            onClick={() =>
                              handleViewMembers(group.id, group.name)
                            }
                            sx={{
                              color: "text.secondary",
                              "&:hover": {
                                bgcolor: "action.hover",
                              },
                            }}
                          >
                            <PeopleIcon />
                          </IconButton>
                          <Typography variant="body2" color="text.secondary">
                            {group.member_count || 0} / 6 fő
                          </Typography>
                        </Box>
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                        }}
                      >
                        <Button
                          variant="contained"
                          onClick={() => handleJoinToGroup(group.id)}
                          disabled={
                            (group.member_count || 0) >= 6 ||
                            joiningGroupId === group.id
                          }
                          startIcon={
                            joiningGroupId === group.id ? (
                              <CircularProgress size={16} color="inherit" />
                            ) : (
                              <AddIcon />
                            )
                          }
                          sx={{
                            bgcolor: "primary.main",
                            color: "white",
                            px: 3,
                            py: 1,
                            borderRadius: "8px",
                            textTransform: "none",
                            fontWeight: 600,
                            "&:hover": {
                              bgcolor: "primary.dark",
                            },
                            "&.Mui-disabled": {
                              bgcolor: "grey.300",
                              color: "grey.500",
                            },
                          }}
                        >
                          {joiningGroupId === group.id
                            ? "Csatlakozás..."
                            : "Csatlakozás"}
                        </Button>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Box>
        )}
      </main>

      {/* Profil Modal */}
      <Dialog
        open={profileModalOpen}
        onClose={handleCloseProfileModal}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar
              sx={{
                width: 60,
                height: 60,
                bgcolor: "#000000",
                color: "#ffffff",
                fontSize: "24px",
                fontWeight: 600,
              }}
            >
              {getInitials(user?.name)}
            </Avatar>
            <Typography variant="h5" component="div">
              Profil
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Teljes név
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                {user?.name || "Nincs megadva"}
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Email cím
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                {user?.email || "Nincs megadva"}
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Szak
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                {user?.major || "Nincs megadva"}
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Hobbik
              </Typography>
              {user?.hobbies && user.hobbies.length > 0 ? (
                <Box
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 1,
                    mt: 1,
                  }}
                >
                  {user.hobbies.map((hobby) => (
                    <Box
                      key={hobby}
                      sx={{
                        px: 2,
                        py: 0.75,
                        borderRadius: "20px",
                        background:
                          "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        color: "white",
                        fontSize: "13px",
                        fontWeight: 500,
                      }}
                    >
                      {hobby}
                    </Box>
                  ))}
                </Box>
              ) : user?.interests && user.interests.length > 0 ? (
                <Box
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 1,
                    mt: 1,
                  }}
                >
                  {user.interests.map((hobby) => (
                    <Box
                      key={hobby}
                      sx={{
                        px: 2,
                        py: 0.75,
                        borderRadius: "20px",
                        background:
                          "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        color: "white",
                        fontSize: "13px",
                        fontWeight: 500,
                      }}
                    >
                      {hobby}
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  Nincs megadva hobbik
                </Typography>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseProfileModal} variant="contained">
            Bezárás
          </Button>
        </DialogActions>
      </Dialog>

      {/* Csatlakozás csoporthoz Modal */}
      <Dialog
        open={joinGroupModalOpen}
        onClose={handleCloseJoinGroupModal}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h5" component="div">
            Csatlakozás csoporthoz
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel id="subject-select-label">Tárgy</InputLabel>
              <Select
                labelId="subject-select-label"
                id="subject-select"
                value={selectedSubject}
                label="Tárgy"
                onChange={(e) => setSelectedSubject(e.target.value)}
              >
                {SUBJECTS.map((subject) => (
                  <MenuItem key={subject} value={subject}>
                    {subject}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseJoinGroupModal}>Mégse</Button>
          <Button
            onClick={handleJoinGroup}
            variant="contained"
            disabled={!selectedSubject}
          >
            Keresés
          </Button>
        </DialogActions>
      </Dialog>

      {/* Tagok lista Modal */}
      <Dialog
        open={membersModalOpen}
        onClose={handleCloseMembersModal}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <PeopleIcon />
            <Typography variant="h5" component="div">
              Tagok - {selectedGroupName}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedGroupMembers.length === 0 ? (
            <Box sx={{ py: 3, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                Még nincsenek tagok ebben a csoportban.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ mt: 2 }}>
              {selectedGroupMembers.map((member, index) => (
                <Box key={member.id || index}>
                  <Box
                    display="flex"
                    alignItems="center"
                    gap={2}
                    sx={{ py: 1.5 }}
                  >
                    <Avatar
                      sx={{
                        width: 40,
                        height: 40,
                        bgcolor: "#000000",
                        color: "#ffffff",
                        fontSize: "16px",
                        fontWeight: 600,
                      }}
                    >
                      {getInitials(member.name || member.email)}
                    </Avatar>
                    <Box flex={1}>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {member.name || "Névtelen felhasználó"}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {member.email || member.major || ""}
                      </Typography>
                    </Box>
                  </Box>
                  {index < selectedGroupMembers.length - 1 && <Divider />}
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseMembersModal} variant="contained">
            Bezárás
          </Button>
        </DialogActions>
      </Dialog>

      {/* Footer */}
      <footer className="dashboard-footer">
        <Box
          sx={{
            maxWidth: "1400px",
            margin: "0 auto",
            width: "100%",
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            justifyContent: "space-between",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Box>
            <Typography
              variant="body2"
              sx={{
                color: "#666",
                fontWeight: 500,
                mb: 0.5,
              }}
            >
              Study Buddy
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: "#999",
              }}
            >
              Együtt könnyebb a tanulás!
            </Typography>
          </Box>
          <Box
            sx={{
              display: "flex",
              gap: 3,
              flexWrap: "wrap",
              justifyContent: { xs: "center", sm: "flex-end" },
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: "#999",
              }}
            >
              © 2025 Study Buddy. Minden jog fenntartva.
            </Typography>
          </Box>
        </Box>
      </footer>
    </div>
  );
};

export default Dashboard;
