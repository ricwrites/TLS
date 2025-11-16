import React, { useState, useEffect } from "react";
import './admin.css';


export const ReportCards = () => {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');

  useEffect(() => {
    fetch('http://localhost:4040/api/classes')
      .then(res => res.json())
      .then(data => setClasses(data))
      .catch(err => console.error('Error fetching classes:', err));
  }, []);

  // Find the current class object
  const currentClass = classes.find(c => c.className === selectedClass);

  // Unwrap nested marks: server sends marks -> marks -> student -> subjects
  const studentMarks = currentClass?.marks?.marks || {};

  // Get subject list from the first student
  const subjects =
    studentMarks && Object.keys(studentMarks).length > 0
      ? Object.keys(studentMarks[Object.keys(studentMarks)[0]] || {})
      : [];

 const handleClassDownload = () => {
  if (!selectedClass || !selectedYear || !selectedTerm) {
    return alert('Please select class, year, and term first');
  }

  if (!currentClass) return;

  const studentMarks = currentClass.marks?.marks || {};
  const subjects =
    Object.keys(studentMarks).length > 0
      ? Object.keys(studentMarks[Object.keys(studentMarks)[0]] || {})
      : [];

  // Build CSV rows
  const rows = [];

  // Header row: Student + subjects
  rows.push(['Student', ...subjects]);

  // Data rows
  Object.entries(studentMarks).forEach(([student, scores]) => {
    const row = [student, ...subjects.map(sub => scores[sub] || '')];
    rows.push(row);
  });

  // Convert to CSV string
  const csvContent = rows.map(r => r.join(',')).join('\n');

  // Trigger download
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


  return (
    <div>
      <h1>Access to student report cards</h1>

      <p>
        Select class:{' '}
        <select
          value={selectedClass}
          onChange={e => setSelectedClass(e.target.value)}
        >
          <option value="">-- Select a class --</option>
          {classes.map(cls => (
            <option key={cls.className} value={cls.className}>
              {cls.className} ({Object.keys(cls.marks?.marks || {}).length} students)
            </option>
          ))}
        </select>
      </p>

      <p>
        Select year:{' '}
        <select
          value={selectedYear}
          onChange={e => setSelectedYear(e.target.value)}
        >
          <option value="">-- Select year --</option>
          <option value="2025">2025</option>
          <option value="2026">2026</option>
          <option value="2027">2027</option>
        </select>
      </p>

      <p>
        Select term:{' '}
        <select
          value={selectedTerm}
          onChange={e => setSelectedTerm(e.target.value)}
        >
          <option value="">-- Select term --</option>
          <option value="1">Term 1</option>
          <option value="2">Term 2</option>
        </select>
      </p>

      {selectedClass && selectedYear && selectedTerm && (
        <div>
          <h2>
            Preview: {selectedClass} - {selectedYear} Term {selectedTerm} Report
            Cards
          </h2>

          {Object.keys(studentMarks).length === 0 ? (
            <p>No data available for this selection.</p>
          ) : (
            <table border="1">
              <thead>
                <tr>
                  <th>Student</th>
                  {subjects.map(sub => (
                    <th key={sub}>{sub}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(studentMarks).map(([student, scores]) => (
                  <tr key={student}>
                    <td>{student}</td>
                    {subjects.map(sub => (
                      <td key={sub}>{scores[sub] || ''}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <button onClick={handleClassDownload}>Export class report cards</button>
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

export const StudentDetails = () => {
return <h1> A place to modify student details </h1>;
};

export const PaymentTracker = () => {
return <h1> A place to keep track of fees payments of various kinds coming into the school </h1>;
};

export const ToRoot = () => {
  return (
    <div>
      <a href="file:///home/sheila/Documents/Ric/Website/TLS/frontend/home.html">
        <button>
          Back to Main Menu
        </button>
      </a>
    </div>
  );
};



