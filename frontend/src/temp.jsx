import './admin.css';
import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Payments } from './payments.jsx';
import { AdDashboard } from './dashboard2.jsx';




export const ReportCards = () => {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const API_BASE = import.meta.env.VITE_API_BASE;


  

  useEffect(() => {
    fetch(`${API_BASE}/api/classes`)
      .then(res => res.json())
      .then(data => setClasses(data))
      .catch(err => console.error('Error fetching classes:', err));
  }, []);

  const currentClass = classes.find(
    c => c.className === selectedClass && c.year === selectedYear && c.term === selectedTerm
  );

  const handleClassDownload = () => {
    if (!selectedClass || !selectedYear || !selectedTerm) {
      return alert('Please select class, year, and term first');
    }
    if (!currentClass) return;

    const studentMarks = currentClass.marks || {};
    const subjects =
      Object.keys(studentMarks).length > 0
        ? Object.keys(studentMarks[Object.keys(studentMarks)[0]] || {})
        : [];

    const rows = [['Student', ...subjects]];
    Object.entries(studentMarks).forEach(([student, scores]) => {
      rows.push([student, ...subjects.map(sub => scores[sub] || '')]);
    });

    const csvContent = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedClass}_${selectedYear}_Term${selectedTerm}_report_cards.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleMasterDownload = () => {
    if (classes.length === 0) return alert('No class data available');

    const workbook = XLSX.utils.book_new();

    classes.forEach(cls => {
      const { className, year, term, marks } = cls;
      const studentMarks = marks || {};
      const subjectsSet = new Set();
      Object.values(studentMarks).forEach(studentScores => {
        Object.keys(studentScores || {}).forEach(sub => subjectsSet.add(sub));
      });
      const subjects = Array.from(subjectsSet);

      const data = [['Student', ...subjects]];
      Object.entries(studentMarks).forEach(([student, scores]) => {
        data.push([student, ...subjects.map(sub => scores[sub] || '')]);
      });

      const ws = XLSX.utils.aoa_to_sheet(data);
      const sheetName = `${className}_${year}_Term${term}`.slice(0, 31);
      XLSX.utils.book_append_sheet(workbook, ws, sheetName);
    });

    XLSX.writeFile(workbook, 'Master_Report_Cards.xlsx');
  };

  const subjects = currentClass
    ? Object.keys(currentClass.marks?.[Object.keys(currentClass.marks)[0]] || {})
    : [];

  return (
    <div>
      <h1>Access to student report cards</h1>

      <p>
        Select class:{' '}
        <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
          <option value="">-- Select a class --</option>
          {[...classes]
  .sort((a, b) => parseInt(a.className.split('.')[0]) - parseInt(b.className.split('.')[0]))
  .map(cls => (
    <option key={cls.className + cls.year + cls.term} value={cls.className}>
      {cls.className} ({Object.keys(cls.marks || {}).length} students)
    </option>

          ))}
        </select>
      </p>

      <p>
        Select year:{' '}
        <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
          <option value="">-- Select year --</option>
          {[...new Set(classes.map(c => c.year))].map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </p>

      <p>
        Select term:{' '}
        <select value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)}>
          <option value="">-- Select term --</option>
          {[...new Set(classes.map(c => c.term))].map(term => (
            <option key={term} value={term}>{term}</option>
          ))}
        </select>
      </p>

      {currentClass && (
        <div>
          <h2>Preview: {selectedClass} - {selectedYear} Term {selectedTerm} Report Cards</h2>
          {subjects.length === 0 ? (
            <p>No data available for this selection.</p>
          ) : (
            <table border="1">
              <thead>
                <tr>
                  <th>Student</th>
                  {subjects.map(sub => <th key={sub}>{sub}</th>)}
                </tr>
              </thead>
              <tbody>
                {Object.entries(currentClass.marks).map(([student, scores]) => (
                  <tr key={student}>
                    <td>{student}</td>
                    {subjects.map(sub => <td key={sub}>{scores[sub] || ''}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <button onClick={handleClassDownload}>Export class report cards</button>
      <br />
      <button onClick={handleMasterDownload}>Download Master Excel (All Classes)</button>
    </div>
  );
};


export function StudentDetails({ selectedClass, year, term }) {
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [studentData, setStudentData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const API_BASE = import.meta.env.VITE_API_BASE;


  // Fetch students whenever class/year/term changes
  const fetchStudents = async () => {
    if (!selectedClass || !year || !term) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE}/api/students?class=${encodeURIComponent(
          selectedClass
        )}&year=${year}&term=${term}`
      );
      if (!res.ok) throw new Error("Failed to fetch students");
      const data = await res.json();
      setStudents(data);

      // If previously selected student exists, refresh their data
      if (selectedStudentId) {
        const stillExists = data.find((s) => s.id === Number(selectedStudentId));
        if (stillExists) setStudentData(stillExists);
        else setSelectedStudentId(null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [selectedClass, year, term]);

  // Load selected student's details into form
  useEffect(() => {
    const student = students.find((s) => s.id === Number(selectedStudentId));
    if (student) setStudentData(student);
    else setStudentData({});
  }, [selectedStudentId, students]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setStudentData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!selectedStudentId) return;
    try {
      const res = await fetch(`${API_BASE}/api/students/${selectedStudentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: studentData.name,
          roll: studentData.roll,
          contact: studentData.contact,
          address: studentData.address,
          motherName: studentData.mother_name,
          fatherName: studentData.father_name,
          dob: studentData.dob,
          bloodType: studentData.blood_type,
        }),
      });
      if (!res.ok) throw new Error("Failed to update student");

      // After saving, refresh the students list so dropdown updates
      await fetchStudents();

      alert("Student updated successfully!");
    } catch (err) {
      alert("Error updating student: " + err.message);
    }
  };

  if (loading) return <p>Loading students...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div>
      <h2>Students for {selectedClass} ({year}, {term})</h2>

      <select
        value={selectedStudentId || ""}
        onChange={(e) => setSelectedStudentId(e.target.value)}
      >
        <option value="">Select a student</option>
        {students.map((s) => (
          <option key={s.id} value={s.id}>
            {s.roll ? `${s.roll} - ` : ""}{s.name}
          </option>
        ))}
      </select>

      {selectedStudentId && (
        <div style={{ marginTop: "20px" }}>
          <label>
            Name:
            <input
              type="text"
              name="name"
              value={studentData.name || ""}
              onChange={handleChange}
            />
          </label>
          <br />
          <label>
            Roll:
            <input
              type="number"
              name="roll"
              value={studentData.roll || ""}
              onChange={handleChange}
            />
          </label>
          <br />
          <label>
            Contact:
            <input
              type="text"
              name="contact"
              value={studentData.contact || ""}
              onChange={handleChange}
            />
          </label>
          <br />
          <label>
            Address:
            <input
              type="text"
              name="address"
              value={studentData.address || ""}
              onChange={handleChange}
            />
          </label>
          <br />
          <label>
            Mother Name:
            <input
              type="text"
              name="mother_name"
              value={studentData.mother_name || ""}
              onChange={handleChange}
            />
          </label>
          <br />
          <label>
            Father Name:
            <input
              type="text"
              name="father_name"
              value={studentData.father_name || ""}
              onChange={handleChange}
            />
          </label>
          <br />
          <label>
            DOB:
            <input
              type="date"
              name="dob"
              value={studentData.dob || ""}
              onChange={handleChange}
            />
          </label>
          <br />
          <label>
            Blood Type:
            <input
              type="text"
              name="blood_type"
              value={studentData.blood_type || ""}
              onChange={handleChange}
            />
          </label>
          <br />
          <button onClick={handleSave}>Save</button>
        </div>
      )}
    </div>
  );
}


export const Dashboard = () => {
return <AdDashboard />
};





export const PaymentTracker = () => {
return <Payments />;
};



export const ToRoot = () => {
  return (
    <div>
      <button onClick={() => window.location.href = '/login.html'}>
        Back to Main Menu
      </button>
    </div>
  );
};




