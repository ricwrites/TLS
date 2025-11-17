import './admin.css';
import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import {PaymentTracks} from './paymenttrackes.jsx';

export const ReportCards = () => {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');

  useEffect(() => {
    fetch('https://tls-server.onrender.com/api/classes')
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




export const StudentDetails = () => {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [students, setStudents] = useState([]);

  // Fetch classes on mount
  useEffect(() => {
    fetch("https://tls-server.onrender.com/api/classes")
      .then(res => res.json())
      .then(data => setClasses(data))
      .catch(err => console.error("Error fetching classes:", err));
  }, []);

  // Fetch students when a class is selected
  useEffect(() => {
    if (!selectedClass) return;

    fetch(`https://tls-server.onrender.com/api/students/${selectedClass}`)
      .then(res => res.json())
      .then(data => setStudents(data))
      .catch(err => console.error("Error fetching students:", err));
  }, [selectedClass]);

  return (
    <div>
      <h1>Student Details</h1>

      <p>
        Select Class:{" "}
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
        >
          <option value="">-- Choose Class --</option>
          {[...classes]
  .sort((a, b) => parseInt(a.className.split('.')[0]) - parseInt(b.className.split('.')[0]))
  .map(cls => (
    <option key={cls.className + cls.year + cls.term} value={cls.className}>
      {cls.className} ({Object.keys(cls.marks || {}).length} students)
    </option>
          ))}
        </select>
      </p>

      {students.length > 0 ? (
        <table border="1" style={{ marginTop: "20px" }}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Roll</th>
              <th>Contact</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>{s.roll}</td>
                <td>{s.contact}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : selectedClass ? (
        <p>No students found for this class.</p>
      ) : null}
    </div>
  );
};





export const Dashboard = () => {
return (
<div>
<h1> Egad! The Dashboard will show up here in all its glory....</h1>
<p>... Or at least some of it </p>
</div>
);
};





export const PaymentTracker = () => <PaymentTracks />;



export const ToRoot = () => {
  return (
    <div>
      <button onClick={() => window.location.href = '/login.html'}>
        Back to Main Menu
      </button>
    </div>
  );
};




