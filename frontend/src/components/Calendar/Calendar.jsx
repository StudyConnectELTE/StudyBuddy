import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  Card,
  CardContent,
  IconButton,
  CircularProgress,
  Alert,
  Chip,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Close as CloseIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from "@mui/icons-material";
import { eventService } from "../../services/api";
import { authService } from "../../services/api";

const Calendar = ({ open, onClose, groupId }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [eventForm, setEventForm] = useState({
    title: "",
    date: "",
    time: "",
    description: "",
    location: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const months = [
    "Január",
    "Február",
    "Március",
    "Április",
    "Május",
    "Június",
    "Július",
    "Augusztus",
    "Szeptember",
    "Október",
    "November",
    "December",
  ];

  const daysOfWeek = ["H", "K", "Sz", "Cs", "P", "Sz", "V"];

  const fetchEvents = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    setError(null);
    try {
      const eventsData = await eventService.getEvents(groupId);
      setEvents(eventsData || []);
    } catch (err) {
      console.error("Események betöltési hiba:", err);
      setError(
        err.response?.data?.error || "Hiba történt az események betöltése során"
      );
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    if (open && groupId) {
      fetchEvents();
    }
  }, [open, groupId, fetchEvents]);

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek =
      firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Hétfő = 0

    const days = [];
    // Üres cellák a hónap elején
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    // A hónap napjai
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const getEventsForDate = (date) => {
    if (!date) return [];
    const dateStr = date.toISOString().split("T")[0];
    return events.filter((event) => {
      const eventDate = new Date(event.date);
      return eventDate.toISOString().split("T")[0] === dateStr;
    });
  };

  // Események csoportosítása időpont szerint
  const groupEventsByTime = (dayEvents) => {
    const grouped = {};
    dayEvents.forEach((event) => {
      const eventDate = new Date(event.date);
      const timeKey = `${eventDate.getHours()}:${String(eventDate.getMinutes()).padStart(2, '0')}`;
      if (!grouped[timeKey]) {
        grouped[timeKey] = [];
      }
      grouped[timeKey].push(event);
    });
    return grouped;
  };

  // Szöveg rövidítése ellipszissel
  const truncateText = (text, maxLength = 15) => {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  const handleDateClick = (date) => {
    if (!date) return;
    const dateStr = date.toISOString().split("T")[0];
    const timeStr = new Date().toTimeString().slice(0, 5);
    setEventForm({
      title: "",
      date: dateStr,
      time: timeStr,
      description: "",
      location: "",
    });
    setEditingEvent(null);
    setEventDialogOpen(true);
  };

  const handleEventClick = (event) => {
    const eventDate = new Date(event.date);
    setEventForm({
      title: event.title || "",
      date: eventDate.toISOString().split("T")[0],
      time: eventDate.toTimeString().slice(0, 5),
      description: event.description || "",
      location: event.location || "",
    });
    setEditingEvent(event);
    setEventDialogOpen(true);
  };

  const handleSubmitEvent = async () => {
    if (!eventForm.title.trim() || !eventForm.date) {
      setError("A cím és dátum megadása kötelező!");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Kombináljuk a dátumot és időt
      const dateTime = new Date(`${eventForm.date}T${eventForm.time}`);
      const isoDateTime = dateTime.toISOString();

      if (editingEvent) {
        await eventService.updateEvent(
          editingEvent.id,
          eventForm.title,
          isoDateTime,
          eventForm.description,
          eventForm.location
        );
      } else {
        await eventService.createEvent(
          groupId,
          eventForm.title,
          isoDateTime,
          eventForm.description,
          eventForm.location
        );
      }

      setEventDialogOpen(false);
      setEventForm({
        title: "",
        date: "",
        time: "",
        description: "",
        location: "",
      });
      setEditingEvent(null);
      await fetchEvents();
    } catch (err) {
      console.error("Esemény mentési hiba:", err);
      setError(
        err.response?.data?.error || "Hiba történt az esemény mentése során"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm("Biztosan törölni szeretnéd ezt az eseményt?")) {
      return;
    }

    try {
      await eventService.deleteEvent(eventId);
      await fetchEvents();
      setEventDialogOpen(false);
      setEditingEvent(null);
    } catch (err) {
      console.error("Esemény törlési hiba:", err);
      setError(
        err.response?.data?.error || "Hiba történt az esemény törlése során"
      );
    }
  };

  const getCurrentUserId = () => {
    const user = authService.getUser();
    return user ? user.id : null;
  };

  const previousMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );
  };

  const nextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    );
  };

  const days = getDaysInMonth(currentMonth);

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "24px",
            boxShadow: "0 8px 32px rgba(102, 126, 234, 0.2)",
            maxHeight: "90vh",
          },
        }}
      >
        <DialogTitle
          sx={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            borderRadius: "24px 24px 0 0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="h5" component="div" sx={{ fontWeight: 700 }}>
            Naptár
          </Typography>
          <IconButton onClick={onClose} sx={{ color: "white" }} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ mt: 2, p: 3 }}>
          {error && (
            <Alert
              severity="error"
              onClose={() => setError(null)}
              sx={{ mb: 2 }}
            >
              {error}
            </Alert>
          )}

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {/* Hónap navigáció */}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 3,
                }}
              >
                <IconButton 
                  onClick={previousMonth}
                  sx={{
                    color: "#667eea",
                    "&:hover": {
                      backgroundColor: "rgba(102, 126, 234, 0.1)",
                      transform: "scale(1.1)",
                    },
                    transition: "all 0.2s",
                  }}
                  size="large"
                >
                  <ChevronLeftIcon sx={{ fontSize: "2rem" }} />
                </IconButton>
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                  {months[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </Typography>
                <IconButton 
                  onClick={nextMonth}
                  sx={{
                    color: "#667eea",
                    "&:hover": {
                      backgroundColor: "rgba(102, 126, 234, 0.1)",
                      transform: "scale(1.1)",
                    },
                    transition: "all 0.2s",
                  }}
                  size="large"
                >
                  <ChevronRightIcon sx={{ fontSize: "2rem" }} />
                </IconButton>
              </Box>

              {/* Naptár rács */}
              <Box>
                {/* Hét napjai fejléc */}
                <Box
                  sx={{
                    display: "flex",
                    gap: 0.5,
                    mb: 0.5,
                  }}
                >
                  {daysOfWeek.map((day) => (
                    <Box
                      key={day}
                      sx={{
                        flex: "1 1 0",
                        p: 1,
                        textAlign: "center",
                        fontWeight: 600,
                        color: "#667eea",
                      }}
                    >
                      {day}
                    </Box>
                  ))}
                </Box>

                {/* Naptár napjai */}
                <Box
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 0.5,
                  }}
                >
                  {days.map((day, index) => {
                    const dayEvents = day ? getEventsForDate(day) : [];
                    const isToday =
                      day && day.toDateString() === new Date().toDateString();
                    const eventsByTime = day ? groupEventsByTime(dayEvents) : {};
                    const timeSlots = Object.keys(eventsByTime).sort();
                    const displayedEvents = [];
                    let eventCount = 0;

                    // Maximum 2 eseményt jelenítünk meg, prioritás az azonos időpontú eseményeknek
                    for (let i = 0; i < timeSlots.length && eventCount < 2; i++) {
                      const timeSlot = timeSlots[i];
                      const eventsAtTime = eventsByTime[timeSlot];
                      
                      if (eventsAtTime.length >= 2 && eventCount === 0) {
                        // Két vagy több esemény ugyanazon az időponton - egymás mellé
                        displayedEvents.push({
                          events: eventsAtTime.slice(0, 2),
                          sideBySide: true,
                        });
                        eventCount += 2;
                        break; // Ha már 2 eseményt mutatunk, nem folytatjuk
                      } else if (eventsAtTime.length === 1) {
                        // Egy esemény az időponton
                        displayedEvents.push({
                          events: [eventsAtTime[0]],
                          sideBySide: false,
                        });
                        eventCount++;
                      }
                    }

                    return (
                      <Box
                        key={index}
                        onClick={() => handleDateClick(day)}
                        sx={{
                          flex: "0 0 calc(14.285% - 0.5px)",
                          maxWidth: "calc(14.285% - 0.5px)",
                          minHeight: "60px",
                          p: 0.5,
                          border: "1px solid rgba(102, 126, 234, 0.2)",
                          borderRadius: "8px",
                          cursor: day ? "pointer" : "default",
                          backgroundColor: day
                            ? isToday
                              ? "rgba(102, 126, 234, 0.1)"
                              : "white"
                            : "transparent",
                          "&:hover": day
                            ? {
                                backgroundColor: "rgba(102, 126, 234, 0.05)",
                                transform: "scale(1.02)",
                              }
                            : {},
                          transition: "all 0.2s",
                          position: "relative",
                        }}
                      >
                        {day && (
                          <>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: isToday ? 700 : 500,
                                color: isToday ? "#667eea" : "#333",
                                mb: 0.5,
                              }}
                            >
                              {day.getDate()}
                            </Typography>
                            {displayedEvents.map((eventGroup, groupIndex) => (
                              <Box
                                key={groupIndex}
                                sx={{
                                  display: "flex",
                                  gap: 0.25,
                                  mb: 0.5,
                                  flexWrap: eventGroup.sideBySide ? "nowrap" : "wrap",
                                }}
                              >
                                {eventGroup.events.map((event) => (
                                  <Chip
                                    key={event.id}
                                    label={truncateText(event.title, 8)}
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEventClick(event);
                                    }}
                                    sx={{
                                      flex: eventGroup.sideBySide ? "1 1 0" : "1 1 100%",
                                      minWidth: 0,
                                      fontSize: "0.7rem",
                                      height: "22px",
                                      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                      color: "white",
                                      fontWeight: 500,
                                      border: "none",
                                      "&:hover": {
                                        background: "linear-gradient(135deg, #5568d3 0%, #6a3d8f 100%)",
                                        transform: "scale(1.02)",
                                      },
                                      "& .MuiChip-label": {
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                        padding: "0 4px",
                                        maxWidth: "100%",
                                      },
                                    }}
                                  />
                                ))}
                              </Box>
                            ))}
                            {dayEvents.length > eventCount && (
                              <Typography
                                variant="caption"
                                sx={{ color: "#667eea", fontSize: "0.7rem" }}
                              >
                                +{dayEvents.length - eventCount} több
                              </Typography>
                            )}
                          </>
                        )}
                      </Box>
                    );
                  })}
                </Box>
              </Box>

              {/* Események listája */}
              {events.length > 0 && (
                <Box sx={{ mt: 4 }}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    Közelgő események
                  </Typography>
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 2 }}
                  >
                    {events
                      .sort((a, b) => new Date(a.date) - new Date(b.date))
                      .slice(0, 5)
                      .map((event) => {
                        const eventDate = new Date(event.date);
                        return (
                          <Card
                            key={event.id}
                            sx={{
                              borderRadius: "12px",
                              border: "1px solid rgba(102, 126, 234, 0.2)",
                              "&:hover": {
                                boxShadow:
                                  "0 4px 12px rgba(102, 126, 234, 0.2)",
                              },
                            }}
                          >
                            <CardContent sx={{ p: 2 }}>
                              <Box
                                sx={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "flex-start",
                                }}
                              >
                                <Box flex={1}>
                                  <Typography
                                    variant="h6"
                                    sx={{ fontWeight: 600, mb: 0.5 }}
                                  >
                                    {event.title}
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{ mb: 0.5 }}
                                  >
                                    {eventDate.toLocaleString("hu-HU", {
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </Typography>
                                  {event.location && (
                                    <Typography
                                      variant="body2"
                                      color="text.secondary"
                                      sx={{ mb: 0.5 }}
                                    >
                                      📍 {event.location}
                                    </Typography>
                                  )}
                                  {event.description && (
                                    <Typography
                                      variant="body2"
                                      sx={{ mt: 1, color: "#555" }}
                                    >
                                      {event.description}
                                    </Typography>
                                  )}
                                </Box>
                                {event.creator_id === getCurrentUserId() && (
                                  <Box sx={{ display: "flex", gap: 0.5 }}>
                                    <IconButton
                                      size="small"
                                      onClick={() => handleEventClick(event)}
                                      sx={{ color: "#667eea" }}
                                    >
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton
                                      size="small"
                                      onClick={() =>
                                        handleDeleteEvent(event.id)
                                      }
                                      sx={{ color: "#d32f2f" }}
                                    >
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Box>
                                )}
                              </Box>
                            </CardContent>
                          </Card>
                        );
                      })}
                  </Box>
                </Box>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={onClose}
            sx={{
              color: "#666",
            }}
          >
            Bezárás
          </Button>
        </DialogActions>
      </Dialog>

      {/* Esemény létrehozás/szerkesztés dialog */}
      <Dialog
        open={eventDialogOpen}
        onClose={() => {
          setEventDialogOpen(false);
          setEditingEvent(null);
          setEventForm({
            title: "",
            date: "",
            time: "",
            description: "",
            location: "",
          });
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "24px",
            boxShadow: "0 8px 32px rgba(102, 126, 234, 0.2)",
          },
        }}
      >
        <DialogTitle
          sx={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            borderRadius: "24px 24px 0 0",
            fontWeight: 600,
            pb: 2,
          }}
        >
          {editingEvent
            ? editingEvent.creator_id === getCurrentUserId()
              ? "Esemény szerkesztése"
              : "Esemény megtekintése"
            : "Új esemény"}
        </DialogTitle>
        <DialogContent sx={{ pt: 5, pb: 2 }}>
          <Box sx={{ mb: 3, mt: 1 }}>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: "#666" }}>
              Esemény neve *
            </Typography>
            <TextField
              fullWidth
              placeholder="Írd be az esemény nevét..."
              value={eventForm.title}
              onChange={(e) =>
                setEventForm({ ...eventForm, title: e.target.value })
              }
              required
              variant="outlined"
              disabled={
                editingEvent &&
                editingEvent.creator_id !== getCurrentUserId()
              }
            />
          </Box>
          <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: "#666" }}>
                Dátum *
              </Typography>
              <TextField
                fullWidth
                type="date"
                value={eventForm.date}
                onChange={(e) =>
                  setEventForm({ ...eventForm, date: e.target.value })
                }
                required
                variant="outlined"
                disabled={
                  editingEvent &&
                  editingEvent.creator_id !== getCurrentUserId()
                }
              />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: "#666" }}>
                Idő *
              </Typography>
              <TextField
                fullWidth
                type="time"
                value={eventForm.time}
                onChange={(e) =>
                  setEventForm({ ...eventForm, time: e.target.value })
                }
                required
                variant="outlined"
                disabled={
                  editingEvent &&
                  editingEvent.creator_id !== getCurrentUserId()
                }
              />
            </Box>
          </Box>
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: "#666" }}>
              Helyszín (opcionális)
            </Typography>
            <TextField
              fullWidth
              placeholder="Írd be a helyszínt..."
              value={eventForm.location}
              onChange={(e) =>
                setEventForm({ ...eventForm, location: e.target.value })
              }
              variant="outlined"
              disabled={
                editingEvent &&
                editingEvent.creator_id !== getCurrentUserId()
              }
            />
          </Box>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 500, color: "#666" }}>
              Leírás (opcionális)
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              placeholder="Írd be az esemény leírását..."
              value={eventForm.description}
              onChange={(e) =>
                setEventForm({ ...eventForm, description: e.target.value })
              }
              variant="outlined"
              disabled={
                editingEvent &&
                editingEvent.creator_id !== getCurrentUserId()
              }
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          {editingEvent && editingEvent.creator_id === getCurrentUserId() && (
            <Button
              onClick={() => handleDeleteEvent(editingEvent.id)}
              sx={{ color: "#d32f2f", mr: "auto" }}
            >
              Törlés
            </Button>
          )}
          <Button
            onClick={() => {
              setEventDialogOpen(false);
              setEditingEvent(null);
              setEventForm({
                title: "",
                date: "",
                time: "",
                description: "",
                location: "",
              });
            }}
            disabled={submitting}
          >
            Mégse
          </Button>
          <Button
            onClick={handleSubmitEvent}
            variant="contained"
            disabled={
              submitting ||
              !eventForm.title.trim() ||
              !eventForm.date ||
              (editingEvent &&
                editingEvent.creator_id !== getCurrentUserId())
            }
            sx={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              "&:hover": {
                background: "linear-gradient(135deg, #5568d3 0%, #6a3d8f 100%)",
              },
            }}
          >
            {submitting ? (
              <CircularProgress size={20} />
            ) : editingEvent ? (
              "Mentés"
            ) : (
              "Létrehozás"
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Calendar;
