import './admin.css';
import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Payments } from './payments2.jsx';
import { AdDashboard } from './dashboard.jsx';
import { Link } from "react-router-dom";
import { EventSubmission } from "./Events.jsx";
import { NewsletterAdmin } from "./newsletters.jsx";



export const ReportCards = () => {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');

  useEffect(() => {
    fetch('/api/classes')
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
                {Object.entries(currentClass.marks)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([student, scores]) => (
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


export function StudentDetails() {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState([]);
  const [activeStudent, setActiveStudent] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    motherName: '',
    fatherName: '',
    contact: '',
    address: '',
    dob: '',
    bloodType: ''
  });

  const currentYear = "2025";
  const currentTerm = "2";

  // Fetch all classes
  useEffect(() => {
    fetch('/api/classes')
      .then(res => res.json())
      .then(data => setClasses(data))
      .catch(err => console.error('Error fetching classes:', err));
  }, []);

  // Update students list when class changes
  useEffect(() => {
    if (!selectedClass) {
      setStudents([]);
      setActiveStudent(null);
      setFormData({ name: '', motherName: '', fatherName: '', contact: '', address: '', dob: '', bloodType: '' });
      return;
    }

    fetch(`/api/students/${encodeURIComponent(selectedClass)}?year=${currentYear}&term=${currentTerm}`)
      .then(res => res.json())
      .then(data => {
        const formatted = data.map(s => ({
          id: s.id,
          name: s.name,
          motherName: s.mother_name || '',
          fatherName: s.father_name || '',
          contact: s.contact || '',
          address: s.address || '',
          dob: s.dob ? s.dob.split("T")[0] : '', // ✅ Only YYYY-MM-DD
          bloodType: s.blood_type || ''
        }));
        setStudents(formatted);
        setActiveStudent(null);
        setFormData({ name: '', motherName: '', fatherName: '', contact: '', address: '', dob: '', bloodType: '' });
      })
      .catch(err => console.error('Error fetching students:', err));
  }, [selectedClass]);

  const updateForm = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const selectStudent = (student) => {
    setActiveStudent(student || null);
    setFormData({
      name: student?.name || '',
      motherName: student?.motherName || '',
      fatherName: student?.fatherName || '',
      contact: student?.contact || '',
      address: student?.address || '',
      dob: student?.dob ? student.dob.split("T")[0] : '', // ✅ Only YYYY-MM-DD
      bloodType: student?.bloodType || ''
    });
  };

  const clearForm = () => selectStudent(null);

  const saveStudent = async () => {
    if (!selectedClass || !formData.name || !formData.motherName || !formData.contact) {
      return alert("Please fill in Name, Mother's Name, Contact, and select a Class.");
    }

    try {
      const bodyData = {
        ...formData,
        className: selectedClass,
        year: currentYear,
        term: currentTerm
      };

      let res;
      if (activeStudent?.id) {
        res = await fetch(`/api/students/${activeStudent.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bodyData)
        });
      } else {
        res = await fetch(`/api/students`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bodyData)
        });
      }

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(`HTTP ${res.status}: ${JSON.stringify(errorData)}`);
      }

      const savedStudent = await res.json();
      alert(activeStudent ? "Student updated!" : "Student added!");

      // Update students array immediately with DOB formatted for table/input
      setStudents(prev => {
        const existing = prev.find(s => s.id === savedStudent.id);
        const formattedStudent = {
          id: savedStudent.id,
          name: savedStudent.name,
          motherName: savedStudent.mother_name || existing?.motherName || '',
          fatherName: savedStudent.father_name || existing?.fatherName || '',
          contact: savedStudent.contact || existing?.contact || '',
          address: savedStudent.address || existing?.address || '',
          dob: savedStudent.dob
        ? new Date(savedStudent.dob).toISOString().split('T')[0]  // YYYY-MM-DD
        : existing?.dob ?? '', // ✅ YYYY-MM-DD
          bloodType: savedStudent.blood_type ?? existing?.bloodType ?? ''
        };

        if (activeStudent?.id) {
          return prev.map(s => s.id === activeStudent.id ? formattedStudent : s);
        } else {
          return [...prev, formattedStudent];
        }
      });

      clearForm();
    } catch (err) {
      console.error("Save error:", err);
      alert(`Failed to save student: ${err.message}`);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '20px', padding: '20px' }}>
      {/* LEFT PANEL: FORM */}
      <div style={{ width: '40%', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h2>{activeStudent ? 'Edit Student' : 'Add New Student'}</h2>

        <label>Name:</label>
        <input name="name" value={formData.name} onChange={updateForm} style={{ width: '100%', marginBottom: '10px' }} />

        <label>Mother's Name:</label>
        <input name="motherName" value={formData.motherName} onChange={updateForm} style={{ width: '100%', marginBottom: '10px' }} />

        <label>Father's Name:</label>
        <input name="fatherName" value={formData.fatherName} onChange={updateForm} style={{ width: '100%', marginBottom: '10px' }} />

        <label>Contact:</label>
        <input name="contact" value={formData.contact} onChange={updateForm} style={{ width: '100%', marginBottom: '10px' }} />

        <label>Address:</label>
        <input name="address" value={formData.address} onChange={updateForm} style={{ width: '100%', marginBottom: '10px' }} />

        <label>Date of Birth:</label>
        <input type="date" name="dob" value={formData.dob} onChange={updateForm} style={{ width: '100%', marginBottom: '10px' }} />

        <label>Blood Type:</label>
        <input name="bloodType" value={formData.bloodType} onChange={updateForm} placeholder="A+, O-, B+, etc." style={{ width: '100%', marginBottom: '10px' }} />

        <div style={{ marginTop: '15px' }}>
          <button onClick={saveStudent} style={{ padding: '10px 15px', background: '#007bff', color: 'white', border: 'none', cursor: 'pointer' }}>
            {activeStudent ? 'Save Changes' : 'Add Student'}
          </button>
          <button onClick={clearForm} style={{ marginLeft: '10px', padding: '10px 15px', cursor: 'pointer' }}>
            Clear
          </button>
        </div>
      </div>

      {/* RIGHT PANEL: STUDENT LIST */}
      <div style={{ width: '60%' }}>
        <h2>Student List</h2>

        <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} style={{ marginBottom: '15px' }}>
          <option value="">-- Select Class --</option>
          {classes.map(c => (
            <option key={`${c.className}-${c.year}-${c.term}`} value={c.className}>{c.className}</option>
          ))}
        </select>

        <table border="1" cellPadding="8" width="100%">
          <thead>
            <tr>
              <th>Name</th>
              <th>Mother's Name</th>
              <th>Father's Name</th>
              <th>Contact</th>
              <th>Address</th>
              <th>DOB</th>
              <th>Blood Type</th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 ? (
              <tr><td colSpan="7" style={{ textAlign: 'center' }}>No students found</td></tr>
            ) : (
              students.map((s) => (
                <tr key={s.id} onClick={() => selectStudent(s)} style={{ cursor: 'pointer' }}>
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



export const Dashboard = () => {
return <AdDashboard />
};





export const PaymentTracker = () => {
return <Payments />;
};



export const ToRoot = () => {
  return (
    <div>
      <button onClick={() => window.location.href = `https://tlsweb.onrender.com`}>
        Back to Main Menu
      </button>
    </div>
  );
};



export const CertificatesHome = () => {
  return (
    <div className="page">
      <h2>Certificates</h2>

      <Link to="/certificates/transfer">
        <button>Transfer Certificate</button>
      </Link>

      {/* future */}
      {/* <Link to="/certificates/contest">
        <button>Contest Certificate</button>
      </Link> */}
    </div>
  );
};



export const TransferCertificate = () => {
  const [form, setForm] = useState({
    studentName: "",
    PENNo: "",
    No: "",
    motherName: "",
    className: "",
    admissionNo: "",
    dob: "",
    startingDate: "",
    leavingDate: "",
    feesDate: "",
    conduct: "",
  });

  const update = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const printTC = () => {
    // Fill hidden template
    document.getElementById("tc-student-name").innerText = form.studentName;
    document.getElementById("tc-no").innerText = form.No;
    document.getElementById("tc-pen-no").innerText = form.PENNo;
    document.getElementById("tc-mother-name").innerText = form.motherName;
    document.getElementById("tc-class").innerText = form.className;
    document.getElementById("tc-admission").innerText = form.admissionNo;
    document.getElementById("tc-dob").innerText = form.dob;
    document.getElementById("tc-starting").innerText = form.startingDate;
    document.getElementById("tc-leaving").innerText = form.leavingDate;
    document.getElementById("tc-fees-date").innerText = form.feesDate;    
    document.getElementById("tc-conduct").innerText = form.conduct;

    window.print();
  };

  return (
    <div className="page">
      <h2>Transfer Certificate</h2>

      Student's name: <input name="studentName" placeholder="Student Name" onChange={update} /> <br />
      Mother's name: <input name="motherName" placeholder="Mother's Name" onChange={update} /> <br />
      Class: <input name="className" placeholder="Class" onChange={update} /> <br />
      Admission no: <input name="admissionNo" placeholder="Admission No" onChange={update} /> <br />
      Date of Birth: <input name="dob" type="date" onChange={update} />  <br />
      Leaving date: <input name="leavingDate" type="date" onChange={update} />  <br />
      Reason for leaving: <textarea name="reason" placeholder="Reason for Leaving" onChange={update} /> <br />

      <button onClick={printTC}>Print TC</button>
    </div>
  );
};

export const Events = () => {
    return <EventSubmission />;
};

export const Newsletter = () => {
    return <NewsletterAdmin />;
};




