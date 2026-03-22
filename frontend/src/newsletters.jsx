import React, { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

export function NewsletterAdmin() {
  const [issues, setIssues] = useState([]);
  const [selectedIssueId, setSelectedIssueId] = useState(null);
  const [newIssue, setNewIssue] = useState({ month: "", year: "" });
  const [form, setForm] = useState({
    type: "text",
    title: "",
    content: "",
    author: "",
    image: null,
    style: { 
      bold: false, italic: false, fontFamily: "Arial", fontSize: 16, color: "#000000",
      padding: "5px", margin: "5px 0", border: "none", borderRadius: "0px", backgroundColor: "#ffffff"
    },
  });

  const [editingRowId, setEditingRowId] = useState(null);
  const [editingColId, setEditingColId] = useState(null);

// Add this above the component body
const parseJSONSafe = (val, fallback) => {
  if (!val) return fallback;
  if (typeof val === "object") return val;
  try { return JSON.parse(val); } catch { return fallback; }
};

  const selectedIssueRaw = issues.find(i => i.id === selectedIssueId);
 const selectedIssue = selectedIssueRaw
  ? {
      ...selectedIssueRaw,
      headerStyle: parseJSONSafe(selectedIssueRaw.headerStyle, { bold: true, italic: false, fontFamily: "Georgia", fontSize: 32, color: "#ffffff" }),
      theme: parseJSONSafe(selectedIssueRaw.theme, { primary: "#2c3e50", secondary: "#f4f4f4", accent: "#f39c12" }),
      layout: parseJSONSafe(selectedIssueRaw.layout, []),
      items: parseJSONSafe(selectedIssueRaw.items, {}),
      counter: selectedIssueRaw.counter || 1,
    }
  : null;



 /* ================= FETCH ISSUES ================= */
useEffect(() => {
  if (!selectedIssueId) return;

  fetch(`${API_BASE}/api/newsletter/${selectedIssueId}`)
    .then(res => res.json())
    .then(issue => {
      const normalized = {
        ...issue,
        layout: parseJSONSafe(issue.layout, []),
        items: parseJSONSafe(issue.items, {}),
        theme: parseJSONSafe(issue.theme, { primary: "#2c3e50", secondary: "#f4f4f4", accent: "#f39c12" }),
        headerStyle: parseJSONSafe(issue.headerStyle, { bold: true, italic: false, fontFamily: "Georgia", fontSize: 32, color: "#ffffff" }),
      };

      // update issues so preview works
      setIssues(prev => prev.map(i => i.id === normalized.id ? normalized : i));
    })
    .catch(err => console.error(err));
}, [selectedIssueId]);

// Edit Issues!

  useEffect(() => {
  if (!selectedIssueId) return;

  fetch(`${API_BASE}/api/newsletter/${selectedIssueId}`)
    .then(res => res.json())
    .then(issue => {
      const parseJSONSafe = (val, fallback) => {
        if (!val) return fallback;
        if (typeof val === "object") return val;
        try { return JSON.parse(val); } catch { return fallback; }
      };

      const normalized = {
        ...issue,
        layout: parseJSONSafe(issue.layout, []),
        items: parseJSONSafe(issue.items, {}),
        theme: parseJSONSafe(issue.theme, { primary: "#2c3e50", secondary: "#f4f4f4", accent: "#f39c12" }),
        headerStyle: parseJSONSafe(issue.headerStyle, { bold: true, italic: false, fontFamily: "Georgia", fontSize: 32, color: "#ffffff" }),
      };

      // Update the issue in state so preview works
      setIssues(prev => prev.map(i => i.id === normalized.id ? normalized : i));
    })
    .catch(err => console.error(err));
}, [selectedIssueId]);
  const updateIssue = (updatedIssue) => setIssues(prev => prev.map(i => i.id === updatedIssue.id ? updatedIssue : i));

  /* ========================= ISSUE ACTIONS ========================= */


  const createIssue = async () => {
    const res = await fetch(`${API_BASE}/api/newsletter/issues`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newIssue)
    });
    const created = await res.json();
    setIssues(prev => [...prev, created]);
    setSelectedIssueId(created.id);
  };

  const saveIssue = async () => {
    if (!selectedIssue) return;
    const payload = {
      month: selectedIssue.month,
      year: selectedIssue.year,
      layout: JSON.stringify(selectedIssue.layout),
      items: JSON.stringify(selectedIssue.items),
      theme: JSON.stringify(selectedIssue.theme),
      headerStyle: JSON.stringify(selectedIssue.headerStyle),
    };
    const res = await fetch(`${API_BASE}/api/newsletter/${selectedIssue.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
    });
    res.ok ? alert("Saved!") : alert("Failed to save");
  };

  const publishIssue = async () => {
    if (!selectedIssue || selectedIssue.published) return alert("Already published");
    const res = await fetch(`${API_BASE}/api/newsletter/${selectedIssue.id}/publish`, { method: "POST" });
    if (!res.ok) return alert("Failed to publish");
    updateIssue({ ...selectedIssue, published: true });
    alert("Issue published!");
  };

  const deleteIssue = async () => {
    if (!selectedIssue || !window.confirm("Delete this issue permanently?")) return;
    setIssues(prev => prev.filter(i => i.id !== selectedIssue.id));
    await fetch(`${API_BASE}/api/newsletter/${selectedIssue.id}`, { method: "DELETE" });
    setSelectedIssueId(null);
  };

  /* ========================= BUILDER LOGIC ========================= */
  const addRow = (colCount) => {
    const newRow = { 
      id: crypto.randomUUID(),
      style: { margin: "20px 0", padding: "10px", border: "2px solid #f39c12", borderRadius: "8px", backgroundColor: "#ffffff" },
      columns: Array.from({ length: colCount }, () => ({ 
        id: crypto.randomUUID(), 
        style: { padding: "10px", margin: "5px", border: "1px solid #ccc", borderRadius: "5px", backgroundColor: "#f4f4f4" },
        items: [] 
      }))
    };
    updateIssue({ ...selectedIssue, layout: [...selectedIssue.layout, newRow] });
  };

  const addItem = (columnId) => {
    if (!selectedIssue.layout.length) return alert("Add a row first");
    const id = `item-${selectedIssue.counter}`;
    const updatedItems = { ...selectedIssue.items, [id]: { id, ...form } };
    const updatedLayout = selectedIssue.layout.map((row) => ({
      ...row,
      columns: row.columns.map((col) => col.id === columnId ? { ...col, items: [...col.items, id] } : col)
    }));
    updateIssue({ ...selectedIssue, items: updatedItems, layout: updatedLayout, counter: selectedIssue.counter + 1 });
    setForm({
      type: "text",
      title: "", content: "", author: "", image: null,
      style: { bold: false, italic: false, fontFamily: "Arial", fontSize: 16, color: "#000000", padding: "5px", margin: "5px 0", border: "none", borderRadius: "0px", backgroundColor: "#ffffff" }
    });
  };

  const deleteItem = (itemId) => {
    if (!window.confirm("Delete this item?")) return;
    const updatedLayout = selectedIssue.layout.map((row) => ({
      ...row,
      columns: row.columns.map((col) => ({ ...col, items: col.items.filter(i => i !== itemId) }))
    }));
    const updatedItems = { ...selectedIssue.items };
    delete updatedItems[itemId];
    updateIssue({ ...selectedIssue, layout: updatedLayout, items: updatedItems });
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const updatedLayout = selectedIssue.layout.map(row => ({
      ...row,
      columns: row.columns.map(col => ({ ...col, items: [...col.items] }))
    }));
    let sourceCol, destCol;
    updatedLayout.forEach(row => row.columns.forEach(col => {
      if (col.id === result.source.droppableId) sourceCol = col;
      if (col.id === result.destination.droppableId) destCol = col;
    }));
    const [moved] = sourceCol.items.splice(result.source.index, 1);
    destCol.items.splice(result.destination.index, 0, moved);
    updateIssue({ ...selectedIssue, layout: updatedLayout });
  };

  /* ========================= ISSUE SELECTION ========================= */
  if (!selectedIssue)
    return (
      <div style={{ padding: 40 }}>
        <h2>Create Issue</h2>
        <input placeholder="Month" value={newIssue.month} onChange={e => setNewIssue({...newIssue, month: e.target.value})} />
        <input placeholder="Year" value={newIssue.year} onChange={e => setNewIssue({...newIssue, year: e.target.value})} />
        <button onClick={createIssue}>Create Issue</button>

        <h3>Existing Issues</h3>
        {issues.map(issue => (
          <div key={issue.id} style={{ marginBottom: 8 }}>
            <button onClick={() => setSelectedIssueId(issue.id)}>
              {issue.month} {issue.year} {issue.published && "(Published)"}
            </button>
            <button onClick={async () => {
              if (!window.confirm("Delete this issue permanently?")) return;
              await fetch(`${API_BASE}/api/newsletter/${issue.id}`, { method: "DELETE" });
              setIssues(prev => prev.filter(i => i.id !== issue.id));
            }}>Delete</button>
          </div>
        ))}
      </div>
    );

  /* ========================= RENDER BUILDER / PREVIEW ========================= */
  return (
    <div style={{ display: "flex", gap: 30 }}>
      {/* LEFT PANEL */}
      <div style={{ width: "30%", maxHeight: "100vh", overflowY: "auto" }}>
<button onClick={() => setSelectedIssueId(null)}>← Back to Issue List</button>
        <h2>Editing: {selectedIssue.month} {selectedIssue.year}</h2>
        <hr />
        <h3>Actions</h3>
        <button onClick={saveIssue}>Save Issue</button>
        <button onClick={publishIssue} disabled={selectedIssue.published}>Publish Issue</button>
        <button onClick={deleteIssue}>Delete Issue</button>

        <h3>Header Style</h3>
        <label><input type="checkbox" checked={selectedIssue.headerStyle.bold} onChange={e => updateIssue({...selectedIssue, headerStyle: {...selectedIssue.headerStyle, bold: e.target.checked}})} /> Bold</label>
        <label><input type="checkbox" checked={selectedIssue.headerStyle.italic} onChange={e => updateIssue({...selectedIssue, headerStyle: {...selectedIssue.headerStyle, italic: e.target.checked}})} /> Italic</label><br/>
        <label>Font Family: </label>
        <select value={selectedIssue.headerStyle.fontFamily} onChange={e => updateIssue({...selectedIssue, headerStyle: {...selectedIssue.headerStyle, fontFamily: e.target.value}})}>
          <option value="Arial">Arial</option><option value="Georgia">Georgia</option><option value="Times New Roman">Times New Roman</option><option value="Verdana">Verdana</option>
        </select>
        <br/>
        <label>Font Size: </label>
        <input type="number" value={selectedIssue.headerStyle.fontSize} onChange={e => updateIssue({...selectedIssue, headerStyle: {...selectedIssue.headerStyle, fontSize: parseInt(e.target.value)}})} />
        <br/>
        <label>Text Color: </label>
        <input type="color" value={selectedIssue.headerStyle.color} onChange={e => updateIssue({...selectedIssue, headerStyle: {...selectedIssue.headerStyle, color: e.target.value}})} />

        <hr/>
        <h3>Theme Colors</h3>
        <label>Primary: <input type="color" value={selectedIssue.theme.primary} onChange={e => updateIssue({...selectedIssue, theme: {...selectedIssue.theme, primary: e.target.value}})} /></label>
        <label>Secondary: <input type="color" value={selectedIssue.theme.secondary} onChange={e => updateIssue({...selectedIssue, theme: {...selectedIssue.theme, secondary: e.target.value}})} /></label>
        <label>Accent: <input type="color" value={selectedIssue.theme.accent} onChange={e => updateIssue({...selectedIssue, theme: {...selectedIssue.theme, accent: e.target.value}})} /></label>

        <h3>Add Row</h3>
        <button onClick={() => addRow(1)}>1 Column</button>
        <button onClick={() => addRow(2)}>2 Columns</button>
        <button onClick={() => addRow(3)}>3 Columns</button>

        <hr/>
        <h3>Add Content</h3>
        <input placeholder="Title" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
        <input placeholder="Author" value={form.author} onChange={e => setForm({...form, author: e.target.value})} />
        <textarea placeholder="Content" rows={4} value={form.content} onChange={e => setForm({...form, content: e.target.value})} />
        <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
          <option value="text">Text Block</option>
          <option value="image">Image Block</option>
        </select>
        {form.type === "image" && (
          <input type="file" accept="image/*" onChange={e => {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => setForm({...form, image: reader.result});
            reader.readAsDataURL(file);
          }} />
        )}

        <h4>Text Style</h4>
        <label><input type="checkbox" checked={form.style.bold} onChange={e => setForm({...form, style:{...form.style, bold:e.target.checked}})} /> Bold</label>
        <label><input type="checkbox" checked={form.style.italic} onChange={e => setForm({...form, style:{...form.style, italic:e.target.checked}})} /> Italic</label><br/>
        <label>Font Family:</label>
        <select value={form.style.fontFamily} onChange={e => setForm({...form, style:{...form.style, fontFamily:e.target.value}})}>
          <option value="Arial">Arial</option><option value="Georgia">Georgia</option><option value="Times New Roman">Times New Roman</option><option value="Verdana">Verdana</option>
        </select>
        <br/>
        <label>Font Size:</label>
        <input type="number" value={form.style.fontSize} onChange={e => setForm({...form, style:{...form.style, fontSize:parseInt(e.target.value)}})} />
        <br/>
        <label>Text Color:</label>
        <input type="color" value={form.style.color} onChange={e => setForm({...form, style:{...form.style, color:e.target.value}})} />
        <h4>Box Style</h4>
        <label>Background:</label>
        <input type="color" value={form.style.backgroundColor} onChange={e => setForm({...form, style:{...form.style, backgroundColor:e.target.value}})} /><br/>
        <label>Border:</label>
        <input type="text" placeholder="2px solid #000" value={form.style.border} onChange={e => setForm({...form, style:{...form.style, border:e.target.value}})} /><br/>
        <label>Border Radius:</label>
        <input type="text" placeholder="8px" value={form.style.borderRadius} onChange={e => setForm({...form, style:{...form.style, borderRadius:e.target.value}})} /><br/>
        <label>Padding:</label>
        <input type="text" placeholder="10px" value={form.style.padding} onChange={e => setForm({...form, style:{...form.style, padding:e.target.value}})} /><br/>
        <label>Margin:</label>
        <input type="text" placeholder="5px 0" value={form.style.margin} onChange={e => setForm({...form, style:{...form.style, margin:e.target.value}})} /><br/>

        <hr/>
        {/* ========================= ROW & COLUMN STYLE EDITORS ========================= */}
        {selectedIssue.layout.map(row => (
          <div key={row.id} style={{ marginBottom: 15 }}>
            <strong>Row {row.id.slice(0,5)}</strong>
            <button onClick={() => setEditingRowId(row.id)}>Edit Row Style</button>
            {editingRowId === row.id && (
              <div style={{ padding:10, border:"1px solid #ccc", marginTop:5 }}>
                <label>Background: <input type="color" value={row.style.backgroundColor} onChange={e => updateIssue({...selectedIssue, layout:selectedIssue.layout.map(r => r.id===row.id?{...r, style:{...r.style, backgroundColor:e.target.value}}:r)})} /></label><br/>
                <label>Padding: <input type="text" value={row.style.padding} onChange={e => updateIssue({...selectedIssue, layout:selectedIssue.layout.map(r => r.id===row.id?{...r, style:{...r.style, padding:e.target.value}}:r)})} /></label><br/>
                <label>Margin: <input type="text" value={row.style.margin} onChange={e => updateIssue({...selectedIssue, layout:selectedIssue.layout.map(r => r.id===row.id?{...r, style:{...r.style, margin:e.target.value}}:r)})} /></label><br/>
                <label>Border: <input type="text" value={row.style.border} onChange={e => updateIssue({...selectedIssue, layout:selectedIssue.layout.map(r => r.id===row.id?{...r, style:{...r.style, border:e.target.value}}:r)})} /></label><br/>
                <label>Border Radius: <input type="text" value={row.style.borderRadius} onChange={e => updateIssue({...selectedIssue, layout:selectedIssue.layout.map(r => r.id===row.id?{...r, style:{...r.style, borderRadius:e.target.value}}:r)})} /></label><br/>
                <button onClick={()=>setEditingRowId(null)}>Close</button>
              </div>
            )}

            {row.columns.map(col => (
              <div key={col.id} style={{ marginTop:10 }}>
                <button onClick={()=>setEditingColId(col.id)}>Edit Column {col.id.slice(0,5)}</button>
                {editingColId===col.id && (
                  <div style={{ padding:10, border:"1px dashed #ccc", marginTop:5 }}>
                    <label>Background: <input type="color" value={col.style.backgroundColor} onChange={e => updateIssue({...selectedIssue, layout:selectedIssue.layout.map(r=>({...r, columns:r.columns.map(c=>c.id===col.id?{...c, style:{...c.style, backgroundColor:e.target.value}}:c)}))})} /></label><br/>
                    <label>Padding: <input type="text" value={col.style.padding} onChange={e => updateIssue({...selectedIssue, layout:selectedIssue.layout.map(r=>({...r, columns:r.columns.map(c=>c.id===col.id?{...c, style:{...c.style, padding:e.target.value}}:c)}))})} /></label><br/>
                    <label>Margin: <input type="text" value={col.style.margin} onChange={e => updateIssue({...selectedIssue, layout:selectedIssue.layout.map(r=>({...r, columns:r.columns.map(c=>c.id===col.id?{...c, style:{...c.style, margin:e.target.value}}:c)}))})} /></label><br/>
                    <label>Border: <input type="text" value={col.style.border} onChange={e => updateIssue({...selectedIssue, layout:selectedIssue.layout.map(r=>({...r, columns:r.columns.map(c=>c.id===col.id?{...c, style:{...c.style, border:e.target.value}}:c)}))})} /></label><br/>
                    <label>Border Radius: <input type="text" value={col.style.borderRadius} onChange={e => updateIssue({...selectedIssue, layout:selectedIssue.layout.map(r=>({...r, columns:r.columns.map(c=>c.id===col.id?{...c, style:{...c.style, borderRadius:e.target.value}}:c)}))})} /></label><br/>
                    <button onClick={()=>setEditingColId(null)}>Close</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* PREVIEW PANEL */}
      <div style={{ width: "70%", padding:30 }}>
        <div style={{
          background: selectedIssue.theme.primary,
          color: selectedIssue.headerStyle.color,
          padding:30,
          textAlign:"center",
          fontSize:`${selectedIssue.headerStyle.fontSize}px`,
          fontWeight:selectedIssue.headerStyle.bold?"bold":"normal",
          fontStyle:selectedIssue.headerStyle.italic?"italic":"normal",
          fontFamily:selectedIssue.headerStyle.fontFamily,
          marginBottom:30,
          borderRadius:8
        }}>
          {selectedIssue.month} {selectedIssue.year} Newsletter
        </div>

        <DragDropContext onDragEnd={onDragEnd}>
          {selectedIssue.layout.map(row => (
            <div key={row.id} style={{
              display:"grid",
              gridTemplateColumns: row.columns.map(()=> "1fr").join(" "),
              gap:20,
              margin: row.style?.margin,
              padding: row.style?.padding,
              border: row.style?.border,
              borderRadius: row.style?.borderRadius,
              backgroundColor: row.style?.backgroundColor || selectedIssue.theme.secondary
            }}>
              {row.columns.map(col => (
                <Droppable key={col.id} droppableId={col.id}>
                  {(provided)=>(
                    <div ref={provided.innerRef} {...provided.droppableProps} style={{
                      minHeight:100,
                      padding: col.style?.padding,
                      margin: col.style?.margin,
                      border: col.style?.border,
                      borderRadius: col.style?.borderRadius,
                      backgroundColor: col.style?.backgroundColor
                    }}>
<button
  onClick={() => addItem(col.id)}
  style={{ backgroundColor: selectedIssue.theme.accent, color: "#fff", border: "none", padding: "5px 10px", borderRadius: "5px" }}
>
  + Add Here
</button>
                      {col.items.map((itemId,index)=>{
                        const item = selectedIssue.items[itemId];
                        return (
                          <Draggable key={itemId} draggableId={itemId} index={index}>
                            {(provided)=>(
                              <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} style={{
                                ...provided.draggableProps.style,
                                fontWeight:item.style.bold?"bold":"normal",
                                fontStyle:item.style.italic?"italic":"normal",
                                fontFamily:item.style.fontFamily,
                                fontSize:`${item.style.fontSize}px`,
                                color:item.style.color,
                                padding:item.style.padding,
                                margin:item.style.margin,
                                border:item.style.border,
                                borderRadius:item.style.borderRadius,
                                backgroundColor:item.style.backgroundColor
                              }}>
                                <button onClick={()=>deleteItem(itemId)} style={{float:"right"}}>Delete</button>
                                {item.type==="text" && <><h3>{item.title}</h3><p>{item.content}</p></>}
                                {item.type==="image" && <img src={item.image} alt={item.title} style={{maxWidth:"100%"}} />}
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              ))}
            </div>
          ))}
        </DragDropContext>
      </div>
    </div>
  );
}
