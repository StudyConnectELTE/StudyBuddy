"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  X as CloseIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
} from "lucide-react";
import { eventService } from "../../service/api";
import { authService } from "../../service/api";

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
    "Január", "Február", "Március", "Április", "Május", "Június",
    "Július", "Augusztus", "Szeptember", "Október", "November", "December",
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
      firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
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

  const truncateText = (text, maxLength = 15) => {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  const handleDateClick = (date) => {
    if (!date) return;
    const dateStr = date.toDateString().split("T")[0];
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

  if (!open) return null;

  return (
    <>
      {/* Fő naptár dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="w-full max-w-6xl max-h-[90vh] rounded-3xl shadow-2xl bg-white/95 backdrop-blur-md overflow-hidden border border-blue-200/50">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#012851] to-[#3b82f6] text-white p-6 flex justify-between items-center rounded-t-3xl shadow-xl">
            <h2 className="text-2xl font-bold">Naptár</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-xl transition-all duration-200"
            >
              <CloseIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-8 overflow-y-auto max-h-[calc(90vh-200px)]">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-800 text-sm flex items-center">
                {error}
                <button
                  onClick={() => setError(null)}
                  className="ml-2 text-red-600 hover:text-red-800 font-bold text-xl"
                >
                  ×
                </button>
              </div>
            )}

            {loading ? (
              <div className="flex justify-center p-16">
                <div className="w-12 h-12 border-4 border-gray-200/50 border-t-[#3b82f6] rounded-full animate-spin shadow-lg"></div>
              </div>
            ) : (
              <>
                {/* Hónap navigáció */}
                <div className="flex justify-between items-center mb-8">
                  <button
                    onClick={previousMonth}
                    className="p-4 hover:bg-[#3b82f6]/10 hover:scale-110 rounded-2xl transition-all duration-200 text-[#3b82f6] hover:text-[#012851]"
                  >
                    <ChevronLeftIcon className="w-8 h-8" />
                  </button>
                  <h3 className="text-2xl font-semibold text-[#012851]">
                    {months[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                  </h3>
                  <button
                    onClick={nextMonth}
                    className="p-4 hover:bg-[#3b82f6]/10 hover:scale-110 rounded-2xl transition-all duration-200 text-[#3b82f6] hover:text-[#012851]"
                  >
                    <ChevronRightIcon className="w-8 h-8" />
                  </button>
                </div>

                {/* Naptár rács */}
                <div>
                  {/* Hét napjai fejléc */}
                  <div className="flex gap-2 mb-2">
                    {daysOfWeek.map((day) => (
                      <div
                        key={day}
                        className="flex-1 p-3 text-center font-semibold text-[#3b82f6] bg-[#3b82f6]/5 border border-[#3b82f6]/20 rounded-xl shadow-sm"
                      >
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Naptár napjai */}
                  <div className="flex flex-wrap gap-2">
                    {days.map((day, index) => {
                      const dayEvents = day ? getEventsForDate(day) : [];
                      const isToday =
                        day && day.toDateString() === new Date().toDateString();
                      const eventsByTime = day ? groupEventsByTime(dayEvents) : {};
                      const timeSlots = Object.keys(eventsByTime).sort();
                      const displayedEvents = [];
                      let eventCount = 0;

                      for (let i = 0; i < timeSlots.length && eventCount < 2; i++) {
                        const timeSlot = timeSlots[i];
                        const eventsAtTime = eventsByTime[timeSlot];
                        
                        if (eventsAtTime.length >= 2 && eventCount === 0) {
                          displayedEvents.push({
                            events: eventsAtTime.slice(0, 2),
                            sideBySide: true,
                          });
                          eventCount += 2;
                          break;
                        } else if (eventsAtTime.length === 1) {
                          displayedEvents.push({
                            events: [eventsAtTime[0]],
                            sideBySide: false,
                          });
                          eventCount++;
                        }
                      }

                      return (
                        <div
                          key={index}
                          onClick={() => handleDateClick(day)}
                          className={`flex-1 basis-[14.285%] min-h-[80px] p-3 border-2 border-[#3b82f6]/20 rounded-2xl cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-lg hover:border-[#3b82f6]/40 relative overflow-hidden
                            ${day 
                              ? isToday 
                                ? 'bg-gradient-to-br from-[#3b82f6]/10 to-blue-50/50 ring-2 ring-[#3b82f6]/30 shadow-md' 
                                : 'bg-white/80 hover:bg-[#3b82f6]/5' 
                              : 'bg-gray-50/50 opacity-40'
                            }`}
                        >
                          {day && (
                            <>
                              <div className={`text-sm font-bold mb-2 transition-colors ${
                                isToday 
                                  ? 'text-[#012851]' 
                                  : 'text-gray-800 hover:text-[#012851]'
                              }`}>
                                {day.getDate()}
                              </div>
                              {displayedEvents.map((eventGroup, groupIndex) => (
                                <div
                                  key={groupIndex}
                                  className="flex gap-1 mb-1 flex-wrap"
                                >
                                  {eventGroup.events.map((event) => (
                                    <div
                                      key={event.id}
                                      className="px-2 py-1 bg-gradient-to-r from-[#012851] to-[#3b82f6] text-white text-xs font-semibold rounded-lg truncate max-w-full hover:scale-105 hover:shadow-md transition-all duration-200 cursor-pointer flex-shrink-0 shadow-sm"
                                      style={{ minWidth: eventGroup.sideBySide ? '0' : '100%' }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEventClick(event);
                                      }}
                                      title={event.title}
                                    >
                                      {truncateText(event.title, 8)}
                                    </div>
                                  ))}
                                </div>
                              ))}
                              {dayEvents.length > eventCount && (
                                <div className="text-xs text-[#3b82f6] font-semibold absolute bottom-1 right-1 bg-[#3b82f6]/10 px-2 py-1 rounded-lg border border-[#3b82f6]/30">
                                  +{dayEvents.length - eventCount} több
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Események listája */}
                {events.length > 0 && (
                  <div className="mt-16">
                    <h4 className="text-2xl font-bold mb-8 text-[#012851] border-b border-[#3b82f6]/20 pb-4">
                      Közelgő események
                    </h4>
                    <div className="space-y-4">
                      {events
                        .sort((a, b) => new Date(a.date) - new Date(b.date))
                        .slice(0, 5)
                        .map((event) => {
                          const eventDate = new Date(event.date);
                          return (
                            <div
                              key={event.id}
                              className="p-8 rounded-3xl border border-[#3b82f6]/20 hover:shadow-2xl hover:border-[#3b82f6]/40 hover:-translate-y-1 transition-all duration-300 bg-gradient-to-br from-white/70 to-blue-50/30 backdrop-blur-sm"
                            >
                              <div className="flex justify-between items-start gap-6">
                                <div className="flex-1">
                                  <h5 className="text-xl font-bold text-[#012851] mb-2">
                                    {event.title}
                                  </h5>
                                  <p className="text-base text-[#6b7280] mb-2 font-medium">
                                    {eventDate.toLocaleString("hu-HU", {
                                      year: "numeric",
                                      month: "long",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </p>
                                  {event.location && (
                                    <p className="text-sm text-[#6b7280] mb-3 flex items-center">
                                      📍 {event.location}
                                    </p>
                                  )}
                                  {event.description && (
                                    <p className="text-base text-[#6b7280] leading-relaxed">
                                      {event.description}
                                    </p>
                                  )}
                                </div>
                                {event.creator_id === getCurrentUserId() && (
                                  <div className="flex gap-2 flex-shrink-0">
                                    <button
                                      onClick={() => handleEventClick(event)}
                                      className="p-3 hover:bg-[#3b82f6]/10 rounded-2xl text-[#3b82f6] hover:text-[#012851] hover:shadow-md transition-all duration-200 border border-[#3b82f6]/30"
                                      title="Szerkesztés"
                                    >
                                      <EditIcon className="w-5 h-5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteEvent(event.id)}
                                      className="p-3 hover:bg-red-50 rounded-2xl text-red-600 hover:text-red-700 hover:shadow-md transition-all duration-200 border border-red-200"
                                      title="Törlés"
                                    >
                                      <DeleteIcon className="w-5 h-5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-8 border-t border-gray-200/50 bg-gradient-to-r from-gray-50/50 to-white/50 backdrop-blur-sm">
            <button
              onClick={onClose}
              className="px-10 py-4 text-[#6b7280] hover:text-[#012851] hover:bg-[#3b82f6]/5 border border-[#6b7280]/30 rounded-3xl transition-all duration-200 font-semibold shadow-sm hover:shadow-md w-full"
            >
              Bezárás
            </button>
          </div>
        </div>
      </div>

      {/* Esemény létrehozás/szerkesztés dialog */}
      {eventDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden border border-blue-200/50">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#012851] to-[#3b82f6] text-white p-8">
              <h3 className="text-2xl font-bold pb-2">
                {editingEvent
                  ? editingEvent.creator_id === getCurrentUserId()
                    ? "Esemény szerkesztése"
                    : "Esemény megtekintése"
                  : "Új esemény"}
              </h3>
            </div>

            {/* Content */}
            <div className="p-10 space-y-8">
              <div>
                <label className="block text-sm font-semibold text-[#012851] mb-3">
                  Esemény neve <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Írd be az esemény nevét..."
                  value={eventForm.title}
                  onChange={(e) =>
                    setEventForm({ ...eventForm, title: e.target.value })
                  }
                  required
                  disabled={
                    editingEvent &&
                    editingEvent.creator_id !== getCurrentUserId()
                  }
                  className="w-full px-6 py-5 text-lg border-2 border-gray-200/50 rounded-3xl focus:ring-4 focus:ring-[#3b82f6]/20 focus:border-[#3b82f6] transition-all duration-300 shadow-sm hover:shadow-md disabled:bg-gray-50/50 disabled:cursor-not-allowed disabled:text-gray-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-[#012851] mb-3">
                    Dátum <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={eventForm.date}
                    onChange={(e) =>
                      setEventForm({ ...eventForm, date: e.target.value })
                    }
                    required
                    disabled={
                      editingEvent &&
                      editingEvent.creator_id !== getCurrentUserId()
                    }
                    className="w-full px-6 py-5 text-lg border-2 border-gray-200/50 rounded-3xl focus:ring-4 focus:ring-[#3b82f6]/20 focus:border-[#3b82f6] transition-all duration-300 shadow-sm hover:shadow-md disabled:bg-gray-50/50 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#012851] mb-3">
                    Idő <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    value={eventForm.time}
                    onChange={(e) =>
                      setEventForm({ ...eventForm, time: e.target.value })
                    }
                    required
                    disabled={
                      editingEvent &&
                      editingEvent.creator_id !== getCurrentUserId()
                    }
                    className="w-full px-6 py-5 text-lg border-2 border-gray-200/50 rounded-3xl focus:ring-4 focus:ring-[#3b82f6]/20 focus:border-[#3b82f6] transition-all duration-300 shadow-sm hover:shadow-md disabled:bg-gray-50/50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#012851] mb-3">
                  Helyszín (opcionális)
                </label>
                <input
                  type="text"
                  placeholder="Írd be a helyszínt..."
                  value={eventForm.location}
                  onChange={(e) =>
                    setEventForm({ ...eventForm, location: e.target.value })
                  }
                  disabled={
                    editingEvent &&
                    editingEvent.creator_id !== getCurrentUserId()
                  }
                  className="w-full px-6 py-5 text-lg border-2 border-gray-200/50 rounded-3xl focus:ring-4 focus:ring-[#3b82f6]/20 focus:border-[#3b82f6] transition-all duration-300 shadow-sm hover:shadow-md disabled:bg-gray-50/50 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#012851] mb-3">
                  Leírás (opcionális)
                </label>
                <textarea
                  rows={5}
                  placeholder="Írd be az esemény leírását..."
                  value={eventForm.description}
                  onChange={(e) =>
                    setEventForm({ ...eventForm, description: e.target.value })
                  }
                  disabled={
                    editingEvent &&
                    editingEvent.creator_id !== getCurrentUserId()
                  }
                  className="w-full px-6 py-5 text-lg border-2 border-gray-200/50 rounded-3xl focus:ring-4 focus:ring-[#3b82f6]/20 focus:border-[#3b82f6] resize-vertical transition-all duration-300 shadow-sm hover:shadow-md disabled:bg-gray-50/50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-10 py-8 border-t border-gray-200/50 bg-gradient-to-r from-gray-50/70 to-white/50 backdrop-blur-sm flex gap-4 justify-end items-center">
              {editingEvent && editingEvent.creator_id === getCurrentUserId() && (
                <button
                  onClick={() => handleDeleteEvent(editingEvent.id)}
                  className="px-8 py-4 text-red-600 hover:text-red-700 hover:bg-red-50/50 border border-red-200/50 rounded-3xl transition-all duration-200 font-semibold shadow-sm hover:shadow-md"
                >
                  Törlés
                </button>
              )}
              <button
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
                className="px-8 py-4 text-[#6b7280] hover:text-[#012851] hover:bg-[#3b82f6]/5 border border-[#6b7280]/30 rounded-3xl transition-all duration-200 font-semibold shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Mégse
              </button>
              <button
                onClick={handleSubmitEvent}
                disabled={
                  submitting ||
                  !eventForm.title.trim() ||
                  !eventForm.date ||
                  (editingEvent &&
                    editingEvent.creator_id !== getCurrentUserId())
                }
                className="px-10 py-4 bg-gradient-to-r from-[#012851] to-[#3b82f6] text-white font-bold rounded-3xl hover:from-[#3b82f6]/90 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 min-w-[140px] justify-center"
              >
                {submitting ? (
                  <>
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Mentés...
                  </>
                ) : editingEvent ? (
                  "Mentés"
                ) : (
                  "Létrehozás"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Calendar;
