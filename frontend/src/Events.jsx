import React, { useState, useEffect } from "react";

export function EventSubmission() {
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    date: "",
    images: []
  });
  const [message, setMessage] = useState("");

  // For adding notes to a specific event
  const [noteForm, setNoteForm] = useState({ eventId: "", text: "" });

  useEffect(() => {
    fetch(`/api/events`)
      .then(r => r.json())
      .then(setEvents);
  }, []);

  const handleSubmitEvent = async () => {
    const data = new FormData();
    data.append("title", form.title);
    data.append("description", form.description);
    data.append("date", form.date);
    form.images.forEach(img => data.append("images", img));

    try {
      const res = await fetch(`/api/events`, {
        method: "POST",
        body: data
      });
      const saved = await res.json();
      setEvents(saved);
      setForm({ title: "", description: "", date: "", images: [] });
      setMessage("Event submitted successfully!");
    } catch {
      setMessage("Submission failed. Try again.");
    }
  };

  const handleSubmitNote = async () => {
    if (!noteForm.eventId || !noteForm.text) return;

    const res = await fetch(
      `/api/events/${noteForm.eventId}/notes`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: noteForm.text })
      }
    );
    const updatedEvent = await res.json();

    // Replace the updated event in events list
    setEvents(events.map(ev => (ev.id === updatedEvent.id ? updatedEvent : ev)));
    setNoteForm({ eventId: "", text: "" });
    setMessage("Note added successfully!");
  };

  return (
    <div style={{ display: "flex", gap: 20 }}>
      {/* LEFT PANEL: Event Form */}
      <div style={{ width: "40%", border: "1px solid #ccc", padding: 20 }}>
        <h2>Submit New Event</h2>

        {message && <p style={{ color: "green" }}>{message}</p>}

        <label>Title:</label>
        <input
          value={form.title}
          onChange={e => setForm({ ...form, title: e.target.value })}
        />

        <label>Description:</label>
        <textarea
          value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })}
        />

        <label>Date:</label>
        <input
          type="date"
          value={form.date}
          onChange={e => setForm({ ...form, date: e.target.value })}
        />

        <label>Images:</label>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={e => setForm({ ...form, images: Array.from(e.target.files) })}
        />

        <button onClick={handleSubmitEvent} style={{ marginTop: 10 }}>
          Submit Event
        </button>

        {/* Extra Note Submission */}
        <h3 style={{ marginTop: 30 }}>Add Extra Note / Winners</h3>
        <select
          value={noteForm.eventId}
          onChange={e => setNoteForm({ ...noteForm, eventId: e.target.value })}
        >
          <option value="">-- Select Event --</option>
          {events.map(ev => (
            <option key={ev.id} value={ev.id}>
              {ev.title}
            </option>
          ))}
        </select>
        <textarea
          placeholder="Add note or winners"
          value={noteForm.text}
          onChange={e => setNoteForm({ ...noteForm, text: e.target.value })}
        />
        <button onClick={handleSubmitNote} style={{ marginTop: 10 }}>
          Submit Note
        </button>


      </div>
    
    

      {/* RIGHT PANEL: Display Events */}
      <div style={{ width: "60%" }}>
        <h2>All Events</h2>
       {events.map(ev => (
  <div
    key={ev.id}
    style={{ marginBottom: 30, borderBottom: "1px solid #ccc", paddingBottom: 10 }}
  >
    <strong>{ev.title}</strong> ({ev.date})
    <p>{ev.description}</p>

    <button
      onClick={async () => {
        if (!window.confirm("Are you sure?")) return;

        const res = await fetch(
          `/api/events/${ev.id}`,
          { method: "DELETE" }
        );

        const updated = await res.json();
        setEvents(updated);
      }}
      style={{ background: "red", color: "white", marginBottom: 10 }}
    >
      Delete Event
    </button>

    {ev.images && ev.images.length > 0 && (
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {ev.images.map((url, i) => (
          <img
            key={i}
            src={`https://learningsanctuaryt.onrender.com/api/${url}`}
            alt={ev.title}
            width="150"
          />
        ))}
      </div>
    )}

            {ev.notes && ev.notes.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <strong>Notes:</strong>
                <ul>
                  {ev.notes.map((n, i) => (
                    <li key={i}>{n.text}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

