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
} from "@mui/material";
import { logout } from "../redux/slices/authSlice";
import { authService } from "../services/api";
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

  const handleJoinGroup = () => {
    if (!selectedSubject) {
      // TODO: Hibaüzenet megjelenítése
      return;
    }
    // TODO: Csoport keresése és csatlakozás a kiválasztott tárgyhoz
    console.log("Csatlakozás tárgyhoz:", selectedSubject);
    handleCloseJoinGroupModal();
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
          <button onClick={handleLogout} className="btn btn-logout">
            Kijelentkezés
          </button>
        </div>
      </nav>

      <main className="dashboard-content">
        <h2>Üdvözöllek a Study Buddy-ban!</h2>
        <p>Szak: {user?.major}</p>
        <p>Email: {user?.email}</p>
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
    </div>
  );
};

export default Dashboard;
