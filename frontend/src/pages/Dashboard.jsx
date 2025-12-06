import React, { useState, useEffect } from "react";
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
import authService, { groupService } from "../services/api";
import "./Dashboard.css";
import logo from "../assets/logo_studyBuddy.png";
import studySession from "../assets/study-group-session-stockcake.png";
import image2 from "../assets/generated-image.png";


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
  const [selectedGroupMembers, setSelectedGroupMembers] = useState(null);
  const [selectedGroupName, setSelectedGroupName] = useState("");
  const [myGroups, setMyGroups] = useState([]);
  const [myGroupsLoading, setMyGroupsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("home");


  useEffect(() => {
    const fetchMyGroups = async () => {
      setMyGroupsLoading(true);
      try {
        const response = await groupService.myGroups();
        setMyGroups(response.groups || []);
      } catch (err) {
        console.error("Saját csoportok hiba:", err);
      } finally {
        setMyGroupsLoading(false);
      }
    };
    fetchMyGroups();
  }, []);

  useEffect(() => {
    if (activeTab === "my") {
      const fetchMyGroups = async () => {
        setMyGroupsLoading(true);
        try {
          const response = await groupService.myGroups();
          setMyGroups(response.groups || []);
        } catch (err) {
          console.error("Saját csoportok hiba:", err);
        } finally {
          setMyGroupsLoading(false);
        }
      };
      fetchMyGroups();
    }
  }, [activeTab]); 


  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const user = localStorage.getItem("authUser");
    
    if (!token || !user) {
      navigate("/login");
    }
  }, [navigate]);

  useEffect(() => {
    console.log("🔄 GROUPS FRISSÜLT:", groups);
  }, [groups]);

  const handleLogout = () => {
    authService.logout();
    dispatch(logout());
    localStorage.clear();
    window.location.href = "/login";
  };
  

  const handleAddButton = () => {
    setActiveTab("search");
    setJoinGroupModalOpen(true);
  };

  const handleCloseJoinGroupModal = () => {
    setJoinGroupModalOpen(false);
    //setSelectedSubject("");
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
    console.log("HANDLE JOIN CALLED:", groupId);
    
    if (!groupId) return;
  
    setJoiningGroupId(groupId);
    setError(null);
  
    try {
      await groupService.joinGroup(groupId);
    } catch (err) {
      if (err.response?.status !== 400) {
        setError(err.response?.data?.error || "Hiba történt");
      }
      console.log("ℹ️ Már tag vagy:", err.response?.data);
    }
  
    // frissít (try/catch UTÁN)!
    if (selectedSubject) {
      try {
        const response = await groupService.searchGroups(selectedSubject);
        const allGroups = [];
        const seenIds = new Set();
  
        if (response.all_groups?.forEach) {
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
      } catch (e) {
        console.log("Frissítés hiba:", e);
      }
    }
  
    setJoiningGroupId(null);
  };
  
  

  const isUserMemberOfGroup = (group) => {
    return group.is_member === true;
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
    setSelectedGroupMembers([]);

    try {
      const members = await groupService.getGroupMembers(groupId);
      setSelectedGroupMembers(members || []);
    } catch (err) {
      console.error('Tagok hiba:', err);
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
              boxShadow: "0 4px 15px rgba(0, 0, 0, 0.3)",
              "&:hover": {
                transform: "scale(1.1)",
                boxShadow: "0 6px 20px rgba(0, 0, 0, 0.4)",
                bgcolor: "#1a1a1a",
              },
            }}
          >
            {getInitials(user?.name)}
          </Avatar>
          {/* HOME GOMB - Saját csoportok ELŐTT */}
        <Button
          onClick={() => setActiveTab("home")}
          variant={activeTab === "home" ? "contained" : "outlined"}
          sx={{
            ml: 2,
              mr: 1,
              borderRadius: "999px",
              px: 3,
              py: 1,
              fontWeight: 600,
              textTransform: "none",
              background: activeTab === "home"
                ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                : "transparent",
              color: activeTab === "home" ? "#ffffff" : "rgb(0, 0, 0)",
              borderColor: "#764ba2",
              boxShadow: activeTab === "home"
                ? "0 4px 15px rgb(169, 155, 230)"
                : "none",
              "&:hover": {
                background: activeTab === "home"
                  ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                  : "linear-gradient(135deg,rgb(190, 196, 231) 0%,rgb(209, 178, 234) 100%)",
                boxShadow: activeTab === "home"
                  ? "0 6px 20px rgba(102, 126, 234, 0.5)"
                  : "none",
              },
          }}
        >
         Kezdőlap
        </Button>

        <Button
            onClick={() => setActiveTab("my")}
            variant={activeTab === "my" ? "contained" : "outlined"}
            sx={{
               ml: 1, mr: 1,
              borderRadius: "999px",
              px: 3.5, py: 1,
              fontWeight: 600,
              textTransform: "none",
              minWidth: 120,
             
              background: activeTab === "my"
                ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                : "transparent",
              color: activeTab === "my" ? "#ffffff" : "#667eea",
              
              borderColor: activeTab === "my" ? "#667eea" : "#667eea",
              boxShadow: activeTab === "my"
                ? "0 4px 15px rgba(102, 126, 234, 0.3)"
                : "none",
              
              "&:hover": {
                background: activeTab === "search"
                  ? "linear-gradient(135deg, #5568d3 0%, #6a3d8f 100%)"
                  : "rgba(102, 126, 234, 0.08)",
                boxShadow: activeTab === "my"
                  ? "0 6px 20px rgba(102, 126, 234, 0.4)"
                  : "0 2px 8px rgba(102, 126, 234, 0.2)",
                transform: "translateY(-1px)",
              },
            }}
          >
          Saját csoportok
          </Button>
          <Button
            onClick={handleAddButton}
            variant={activeTab === "search" ? "contained" : "outlined"}
            sx={{
              ml: 1, mr: 1,
              borderRadius: "999px",  // ovális
              px: 3.5, py: 1,
              fontWeight: 600,
              textTransform: "none",
              minWidth: 120,
              
              // AKTÍV (kék háttér)
              background: activeTab === "search"
                ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                : "transparent",
              color: activeTab === "search" ? "#ffffff" : "#667eea",
              
              borderColor: activeTab === "search" ? "#667eea" : "#667eea",
              boxShadow: activeTab === "search"
                ? "0 4px 15px rgba(102, 126, 234, 0.3)"
                : "none",
              
              "&:hover": {
                background: activeTab === "search"
                  ? "linear-gradient(135deg, #5568d3 0%, #6a3d8f 100%)"
                  : "rgba(102, 126, 234, 0.08)",
                boxShadow: activeTab === "search"
                  ? "0 6px 20px rgba(102, 126, 234, 0.4)"
                  : "0 2px 8px rgba(102, 126, 234, 0.2)",
                transform: "translateY(-1px)",
              },
            }}
            startIcon={<AddIcon sx={{ fontSize: 20 }} />}
          >
           Keresés
          </Button>
          <Button
            onClick={handleLogout}
            variant="contained"
            startIcon={<LogoutIcon />}
            sx={{
              ml: 1, mr: 1,
              borderRadius: "999px",
              background: "linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)",
              color: "white",
              px: 3.5, py: 1,
              fontWeight: 600,
              boxShadow: "0 4px 15px rgba(255, 107, 107, 0.3)",
              transition: "all 0.3s ease",
              "&:hover": {
                background: "linear-gradient(135deg, #ff5252 0%, #e63950 100%)",
                boxShadow: "0 6px 20px rgba(255, 107, 107, 0.4)",
                transform: "translateY(-2px)",
              },
            }}
          >
            Kijelentkezés
          </Button>
        </div>
      </nav>

      <main className="dashboard-content">
        {/* KEZDŐLAP TAB */}
        {activeTab === "home" && (
          <Box
            sx={{
              maxWidth: "1100px",
              mx: "auto",
              mt: 4,
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1.4fr 1.6fr" },
              columnGap: 6,
              rowGap: 6,
              alignItems: "flex-start",
            }}
          >
            {/* Bal felső: cím + bevezető szöveg */}
            <Box>
              <Typography
                variant="h3"
                sx={{
                  mb: 3,
                  fontWeight: 700,
                  letterSpacing: "0.02em",
                }}
              >
                Study Buddy – Kezdőlap
              </Typography>

              <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                A Study Buddy egy tanulócsoport kereső és szervező felület, ahol
                tárgyak szerint találhatsz vagy hozhatsz létre csoportokat.  
                Csatlakozhatsz más hallgatókhoz, megnézheted a tagok adatait, és
                könnyebben szervezhetitek a közös tanulást.
              </Typography>
            </Box>

            {/* Jobb felső: “kártya” / kép helye */}
            <Box
              sx={{
                borderRadius: "8px",
                overflow: "hidden",
                minHeight: 160,
              }}
            >
              <img
                src={studySession}
                alt="Tanulócsoport"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            </Box>

            {/* Bal alsó: nagy kép blokk */}
        <Box
          sx={{
            borderRadius: "8px",
            overflow: "hidden",
          }}
        >
          <img
            src={image2}
            alt="Study Buddy lépések"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        </Box>


        <Box>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ lineHeight: 1.7, mb: 1 }}
          >
            Használat lépésről lépésre:
          </Typography>

          <Box component="ul" sx={{ pl: 3, m: 0 }}>
            <Box component="li" sx={{ mb: 0.5 }}>
              Válaszd a <strong>Keresés</strong> gombot, majd add meg a tárgyat, amihez csoportot keresel.
            </Box>
            <Box component="li" sx={{ mb: 0.5 }}>
              A találati listában látod a csoport nevét, leírását, létszámát és közös hobbikat.
            </Box>
            <Box component="li" sx={{ mb: 0.5 }}>
              A <strong>Csatlakozás</strong> gombbal beléphetsz a csoportba, ezután a
              <strong> Saját csoportok</strong> oldalon mindig elérhető lesz.
            </Box>
            <Box component="li">
              A profilodban módosíthatod a nevedet, szakodat és a hobbijaidat, hogy jobb ajánlásokat kapj.
            </Box>
          </Box>
        </Box>
      </Box>
        )}
        {/* KERESÉS TAB */}
        {activeTab === "search" && (
          <>
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
            <Box
              sx={{
                mb: 4,
                p: 3,
                borderRadius: "16px",
                background:
                  "linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)",
                border: "1px solid rgba(102, 126, 234, 0.2)",
              }}
            >
              <Typography
                variant="h4"
                sx={{
                  mb: 1,
                  background:
                    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  fontWeight: 700,
                }}
              >
                Elérhető csoportok
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  color: "#667eea",
                  fontWeight: 600,
                }}
              >
                {selectedSubject}
              </Typography>
            </Box>
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
                    background: "rgba(255, 255, 255, 1)",
                    borderRadius: "20px",
                    border: "1px solid rgba(102, 126, 234, 0.2)",
                    boxShadow: "0 4px 20px rgba(102, 126, 234, 0.1)",
                    overflow: "hidden",
                    "&:hover": {
                      boxShadow: "0 8px 32px rgba(102, 126, 234, 0.25)",
                      transform: "translateY(-4px)",
                      borderColor: "rgba(102, 126, 234, 0.4)",
                    },
                    "&::before": {
                      content: '""',
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      height: "4px",
                      background:
                        "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
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
                            fontWeight: 700,
                            background:
                              "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            backgroundClip: "text",
                            mb: 1,
                            fontSize: "1.5rem",
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
                                      fontWeight: 600,
                                      boxShadow:
                                        "0 2px 8px rgba(102, 126, 234, 0.3)",
                                      transition: "all 0.2s ease",
                                      "&:hover": {
                                        transform: "scale(1.05)",
                                        boxShadow:
                                          "0 4px 12px rgba(102, 126, 234, 0.4)",
                                      },
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
                          onClick={() => {
                            console.log("BUTTON CLICK group.id:", group.id);
                            handleJoinToGroup(group.id);
                          }}
                          disabled={
                            (group.member_count || 0) >= 6 ||
                            joiningGroupId === group.id ||
                            isUserMemberOfGroup(group) 
                          }
                          startIcon={
                            joiningGroupId === group.id ? (
                              <CircularProgress size={16} color="inherit" />
                            ) : (
                              <AddIcon />
                            )
                          }
                          sx={{
                            background:
                              "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                            color: "white",
                            px: 3,
                            py: 1.5,
                            borderRadius: "12px",
                            textTransform: "none",
                            fontWeight: 600,
                            boxShadow: "0 4px 15px rgba(102, 126, 234, 0.3)",
                            transition: "all 0.3s ease",
                            "&:hover": {
                              background:
                                "linear-gradient(135deg, #5568d3 0%, #6a3d8f 100%)",
                              boxShadow: "0 6px 20px rgba(102, 126, 234, 0.4)",
                              transform: "translateY(-2px)",
                            },
                            "&.Mui-disabled": {
                              background:
                                "linear-gradient(135deg, #e0e0e0 0%, #bdbdbd 100%)",
                              color: "#9e9e9e",
                              boxShadow: "none",
                            },
                          }}
                        >
                          {joiningGroupId === group.id
                            ? "Csatlakozás..."
                            : isUserMemberOfGroup(group)
                              ? "Már tag vagy"
                              : "Csatlakozás"
                          }
                        </Button>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Box>
        )}
        </>
  )}

        {/* SAJÁT CSOPORTOK TAB */}
        {activeTab === "my" && (
            <>
        {myGroupsLoading ? (
          <Box sx={{ py: 4, textAlign: "center" }}>
            <CircularProgress size={24} />
            <Typography sx={{ mt: 1 }}>Saját csoportok betöltése...</Typography>
          </Box>
        ) : myGroups.length > 0 && (
          <Box sx={{ mb: 6 }}>
            <Box sx={{
              mb: 4, p: 3, borderRadius: "16px",
              background: "linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(46, 125, 50, 0.1) 100%)",
              border: "1px solid rgba(76, 175, 80, 0.3)",
            }}>
              <Typography variant="h4" sx={{
                mb: 1,
                background: "linear-gradient(135deg, #4caf50 0%, #388e3c 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                fontWeight: 700,
              }}>
                Saját Csoportjaid ({myGroups.length})
              </Typography>
            </Box>
            
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {myGroups.map((group) => (
                <Card key={group.id} sx={{
                  borderRadius: "20px",
                  border: "1px solid rgba(76, 175, 80, 0.3)",
                  boxShadow: "0 4px 20px rgba(76, 175, 80, 0.1)",
                  "&:hover": {
                    boxShadow: "0 8px 32px rgba(76, 175, 80, 0.2)",
                    transform: "translateY(-2px)",
                  }
                }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Box flex={1}>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: "#2e7d32" }}>
                          {group.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {group.subject} • Csatlakoztál: {new Date(group.joined_at).toLocaleDateString('hu-HU')}
                        </Typography>
                        {group.description && (
                          <Typography variant="body2" sx={{ mt: 1, fontStyle: "italic" }}>
                            {group.description}
                          </Typography>
                        )}
                      </Box>
                      <IconButton onClick={() => handleViewMembers(group.id, group.name)}>
                        <PeopleIcon />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Box>
        )}
        </>
  )}
      </main>

      {/* Profil Modal */}
      <Dialog
        open={profileModalOpen}
        onClose={handleCloseProfileModal}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "24px",
            background: "rgba(255, 255, 255, 1)",
            boxShadow: "0 8px 32px rgba(102, 126, 234, 0.2)",
          },
        }}
      >
        <DialogTitle
          sx={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            borderRadius: "24px 24px 0 0",
            pb: 2,
          }}
        >
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar
              sx={{
                width: 60,
                height: 60,
                bgcolor: "#000000",
                color: "#ffffff",
                fontSize: "24px",
                fontWeight: 600,
                border: "2px solid rgba(255, 255, 255, 0.3)",
                boxShadow: "0 4px 15px rgba(0, 0, 0, 0.3)",
              }}
            >
              {getInitials(user?.name)}
            </Avatar>
            <Typography variant="h5" component="div" sx={{ fontWeight: 700 }}>
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

            <Divider sx={{ my: 2 }} />

            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Hobbik
              </Typography>
              {user?.hobbies && typeof user.hobbies === 'string' && user.hobbies.trim() !== "" ? (
                <Box
                sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 1,
                    mt: 1,
                  }}
                >
                  {user.hobbies.split(",").map((hobby, index) => (
                    <Box
                      key={index}
                      sx={{
                        px: 2,
                        py: 0.75,
                        borderRadius: "20px",
                        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        color: "white",
                        fontSize: "13px",
                        fontWeight: 600,
                        boxShadow: "0 2px 8px rgba(102, 126, 234, 0.3)",
                        transition: "all 0.2s ease",
                        "&:hover": {
                        transform: "scale(1.05)",
                        boxShadow: "0 4px 12px rgba(102, 126, 234, 0.4)",
                        },
                      }}
                    >
                      {hobby.trim()}
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Nincs megadva hobbi
                </Typography>
              )}
            </Box>

          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={handleCloseProfileModal}
            variant="contained"
            sx={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              borderRadius: "12px",
              px: 3,
              py: 1,
              fontWeight: 600,
              boxShadow: "0 4px 15px rgba(102, 126, 234, 0.3)",
              "&:hover": {
                background: "linear-gradient(135deg, #5568d3 0%, #6a3d8f 100%)",
                boxShadow: "0 6px 20px rgba(102, 126, 234, 0.4)",
              },
            }}
          >
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
        PaperProps={{
          sx: {
            borderRadius: "24px",
            background: "rgba(255, 255, 255, 1)",
            boxShadow: "0 8px 32px rgba(102, 126, 234, 0.2)",
          },
        }}
      >
        <DialogTitle
          sx={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            borderRadius: "24px 24px 0 0",
            pb: 2,
          }}
        >
          <Typography variant="h5" component="div" sx={{ fontWeight: 700 }}>
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
        <DialogActions sx={{ p: 3, gap: 2 }}>
          <Button
            onClick={handleCloseJoinGroupModal}
            sx={{
              borderRadius: "12px",
              px: 3,
              py: 1,
              fontWeight: 600,
              color: "#667eea",
              "&:hover": {
                background: "rgba(102, 126, 234, 0.1)",
              },
            }}
          >
            Mégse
          </Button>
          <Button
            onClick={handleJoinGroup}
            variant="contained"
            disabled={!selectedSubject}
            sx={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              borderRadius: "12px",
              px: 3,
              py: 1,
              fontWeight: 600,
              boxShadow: "0 4px 15px rgba(102, 126, 234, 0.3)",
              "&:hover": {
                background: "linear-gradient(135deg, #5568d3 0%, #6a3d8f 100%)",
                boxShadow: "0 6px 20px rgba(102, 126, 234, 0.4)",
              },
              "&.Mui-disabled": {
                background: "linear-gradient(135deg, #e0e0e0 0%, #bdbdbd 100%)",
                color: "#9e9e9e",
              },
            }}
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
        PaperProps={{
          sx: {
            borderRadius: "24px",
            background: "rgba(255, 255, 255, 1)",
            boxShadow: "0 8px 32px rgba(102, 126, 234, 0.2)",
          },
        }}
      >
        <DialogTitle
          sx={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            borderRadius: "24px 24px 0 0",
            pb: 2,
          }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <PeopleIcon sx={{ fontSize: 28 }} />
            <Typography variant="h5" component="div" sx={{ fontWeight: 700 }}>
              Tagok - {selectedGroupName}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedGroupMembers === null ? (
            <Box sx={{ py: 3, textAlign: "center" }}>
              <CircularProgress size={24} />
              <Typography variant="body2" sx={{ mt: 1 }}>Tagok betöltése...</Typography>
            </Box>
          ) : selectedGroupMembers.length === 0 ? (
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
                        width: 48,
                        height: 48,
                        background:
                          "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        color: "#ffffff",
                        fontSize: "18px",
                        fontWeight: 600,
                        boxShadow: "0 2px 8px rgba(102, 126, 234, 0.3)",
                      }}
                    >
                      {getInitials(member.name || member.email)}
                    </Avatar>
                    <Box flex={1}>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {member.name || "Névtelen felhasználó"}
                      </Typography>
                      <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.25 }}>
                          {member.email || "Nincs email"}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {member.major || ""}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  {index < selectedGroupMembers.length - 1 && <Divider />}
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={handleCloseMembersModal}
            variant="contained"
            sx={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              borderRadius: "12px",
              px: 3,
              py: 1,
              fontWeight: 600,
              boxShadow: "0 4px 15px rgba(102, 126, 234, 0.3)",
              "&:hover": {
                background: "linear-gradient(135deg, #5568d3 0%, #6a3d8f 100%)",
                boxShadow: "0 6px 20px rgba(102, 126, 234, 0.4)",
              },
            }}
          >
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
