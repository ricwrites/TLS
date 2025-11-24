import React, { useState, useEffect } from 'react';

export function StudentDeets() {
  const API = "https://tls-server.com";  // ✅ your backend root (Render)

  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState([]);
  const [activeStudent, setActiveStudent] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    motherName: "",
    fatherName: "",
    contact: "",
    address: "",
    dob: "",
    bloodType: ""
  });

  const currentYear = "2025";
  const currentTerm = "2";

  /* -------------------------------
     LOAD CLASSES (works as-is)
  --------------------------------*/
  useEffect(() => {
    fetch(`${API}/api/classes`)
      .then(res => res.json())
      .then(data => setClasses(data))
      .catch(err => console.error("Error fetching classes:", err));
  }, []);

  /* -------------------------------
     LOAD STUDENTS FOR SELECTED CLASS
  --------------------------------*/
  useEffect(() => {
    if (!selectedClass) {
      setStudents([]);
      setActiveStudent(null);
      return;
    }

    const url = `${API}/api/students?class=${encodeURIComponent(
      selectedClass
    )}&year=${currentYear}&term=${currentTerm}`;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        const formatted = data.map(s => ({
          id: s.id,
          name: s.name,
          motherName: s.mother_name || "",
          fatherName: s.father_name || "",
          contact: s.contact || "",
          address: s.address || "",
          dob: s.dob ? s.dob.split("T")[0] : "",
          bloodType: s.blood_type || ""
        }));

        setStudents(formatted);
        setActiveStudent(null);
      })
      .catch(err => console.error("Error fetching students:", err));
  }, [selectedClass]);

  /* -------------------------------
     FORM UPDATES
  --------------------------------*/
  const updateForm = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const selectStudent = (s) => {
    setActiveStudent(s);
    setFormData({
      name: s?.name || "",
      motherName: s?.motherName || "",
      fatherName: s?.fatherName || "",
      contact: s?.contact || "",
      address: s?.address || "",
      dob: s?.dob || "",
      bloodType: s?.bloodType || ""
    });
  };

  const clearForm = () => selectStudent(null);

  /* -------------------------------
     SAVE STUDENT (POST or PATCH)
  --------------------------------*/
  const saveStudent = async () => {
    if (!selectedClass || !formData.name || !formData.motherName || !formData.contact) {
      return alert("Please fill in required fields.");
    }

    const bodyData = {
      ...formData,
      className: selectedClass,
      year: currentYear,
      term: currentTerm
    };

    try {
      let res;

      if (activeStudent?.id) {
        res = await fetch(`${API}/api/students/${activeStudent.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bodyData)
        });
      } else {
        res = await fetch(`${API}/api/students`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bodyData)
        });
      }

      const saved = await res.json();

      if (!res.ok) throw new Error(JSON.stringify(saved));

      // Normalize into our frontend format
      const normalized = {
        id: saved.id,
        name: saved.name,
        motherName: saved.mother_name || "",
        fatherName: saved.father_name || "",
        contact: saved.contact || "",
        address: saved.address || "",
        dob: saved.dob ? saved.dob.split("T")[0] : "",
        bloodType: saved.blood_type || ""
      };

      setStudents(prev =>
        activeStudent?.id
          ? prev.map(s => (s.id === activeStudent.id ? normalized : s))
          : [...prev, normalized]
      );

      clearForm();
      alert(activeStudent ? "Student updated!" : "Student added!");
    } catch (err) {
      alert("Failed: " + err.message);
      console.error(err);
    }
  };

  /* -------------------------------
     RENDER
  --------------------------------*/
  return (
    <div style={{ display: "flex", gap: "20px", padding: "20px" }}>
      
      {/* -----------------
          LEFT: FORM
      ------------------ */}
      <div style={{ width: "40%", padding: "20px", border: "1px solid #ccc", borderRadius: "8px" }}>
        <h2>{activeStudent ? "Edit Student" : "Add New Student"}</h2>

        <label>Name:</label>
        <input name="name" value={formData.name} onChange={updateForm} />

        <label>Mother's Name:</label>
        <input name="motherName" value={formData.motherName} onChange={updateForm} />

        <label>Father's Name:</label>
        <input name="fatherName" value={formData.fatherName} onChange={updateForm} />

        <label>Contact:</label>
        <input name="contact" value={formData.contact} onChange={updateForm} />

        <label>Address:</label>
        <input name="address" value={formData.address} onChange={updateForm} />

        <label>Date of Birth:</label>
        <input type="date" name="dob" value={formData.dob} onChange={updateForm} />

        <label>Blood Type:</label>
        <input name="bloodType" value={formData.bloodType} onChange={updateForm} />

        <button onClick={saveStudent}>
          {activeStudent ? "Save Changes" : "Add Student"}
        </button>
        <button onClick={clearForm}>Clear</button>
      </div>

      {/* -----------------
          RIGHT: TABLE
      ------------------ */}
      <div style={{ width: "60%" }}>
        <h2>Student List</h2>

        <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
          <option value="">-- Select Class --</option>
          {classes.map(c => (
            <option key={`${c.className}-${c.year}-${c.term}`} value={c.className}>
              {c.className}
            </option>
          ))}
        </select>

        <table border="1" cellPadding="8" width="100%">
          <thead>
            <tr>
              <th>Name</th>
              <th>Mother</th>
              <th>Father</th>
              <th>Contact</th>
              <th>Address</th>
              <th>DOB</th>
              <th>Blood</th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 ? (
              <tr><td colSpan="7">No students</td></tr>
            ) : (
              students.map(s => (
                <tr key={s.id} onClick={() => selectStudent(s)} style={{ cursor: "pointer" }}>
                  <td>{s.name}</td>
                  <td>{s.motherName}</td>
                  <td>{s.fatherName}</td>
                  <td>{s.contact}</td>
                  <td>{s.address}</td>
                  <td>{s.dob}</td>
                  <td>{s.bloodType}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

