import React, { useState, useEffect } from "react";

export const AdminCalendar = () => {
  const [year, setYear] = useState(new Date().getFullYear());
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState({
    title: "",
    description: "",
    date: "",
    type: "calendar-entry",
    category: "event",
    published: false
  });

  useEffect(() => {
    fetch(`/api/calendar/${year}`)
      .then(res => res.json())
      .then(data => setItems(data))
      .catch(err => console.error(err));
  }, [year]);

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItem.title || !newItem.date) return alert("Title and date required!");

    // Ensure category is always defined
    const itemToSend = { ...newItem, category: newItem.category || "event" };

    const res = await fetch(`/api/calendar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(itemToSend)
    });

    const added = await res.json();
    setItems([...items, added]);

    // Reset newItem while keeping type and category defaulted properly
    setNewItem({
      title: "",
      description: "",
      date: "",
      type: newItem.type,                     // keep what the user selected
      category: newItem.category || "event",  // default if undefined
      published: newItem.published || false
    });
  }; // <- close handleAddItem properly

  const handleDelete = async (id) => {
    await fetch(`/api/calendar/${id}`, { method: "DELETE" });
    setItems(items.filter(i => i.id !== id));
  };

  const togglePublish = async (id) => {
    const res = await fetch(`/api/calendar/${id}/publish`, { method: "PUT" });
    const updated = await res.json();
    setItems(items.map(i => i.id === id ? updated : i));
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Calendar Admin</h1>
      <label>
        Year:{" "}
        <input type="number" value={year} onChange={e => setYear(e.target.value)} />
      </label>

      <h2>Items for {year}</h2>
      <ul>
        {items.map(item => (
          <li key={item.id}>
            {new Date(item.date).toLocaleDateString()} - <strong>{item.title}</strong>
            {item.description && `: ${item.description}`}
            <button onClick={() => handleDelete(item.id)} style={{ marginLeft: "10px" }}>Delete</button>
            {item.type === "event" && (
              <label style={{ marginLeft: "10px" }}>
                <input type="checkbox" checked={item.published} onChange={() => togglePublish(item.id)} /> Publish
              </label>
            )}
            <span style={{ marginLeft: "10px", fontStyle: "italic" }}>{item.type}</span>
          </li>
        ))}
        {items.length === 0 && <li>No calendar items yet</li>}
      </ul>

      <h3>Add New Item</h3>
      <form onSubmit={handleAddItem}>
        <input
          type="text"
          placeholder="Title"
          value={newItem.title}
          onChange={e => setNewItem({ ...newItem, title: e.target.value })}
          required
        />
        <select
          value={newItem.category}
          onChange={e => setNewItem({ ...newItem, category: e.target.value })}
        >
          <option value="holiday">Holiday</option>
          <option value="exam">Exam</option>
          <option value="event">Event</option>
        </select>
        <input
          type="text"
          placeholder="Description"
          value={newItem.description}
          onChange={e => setNewItem({ ...newItem, description: e.target.value })}
        />
        <input
          type="date"
          value={newItem.date}
          onChange={e => setNewItem({ ...newItem, date: e.target.value })}
          required
        />
        <select value={newItem.type} onChange={e => setNewItem({ ...newItem, type: e.target.value })}>
          <option value="event">Event</option>
          <option value="calendar-entry">Calendar Entry</option>
        </select>
        {newItem.type === "event" && (
          <label>
            <input
              type="checkbox"
              checked={newItem.published}
              onChange={e => setNewItem({ ...newItem, published: e.target.checked })}
            /> Publish
          </label>
        )}
        <button type="submit">Add Item</button>
      </form>
    </div>
  );
};
