import React, { StrictMode , useState,useEffect } from "react";
import {BrowserRouter, Routes, Route, Link, useLocation,useNavigate} from "react-router-dom";
import './admin.css';


export const ReportCards = () => {
  const [classes, setClasses] = useState([]); // will store [{className, students: []}]
  const [selectedClass, setSelectedClass] = useState('');

  // Fetch data when component loads
  useEffect(() => {
    fetch('/api/classes') // this should return your JSON data
      .then(res => res.json())
      .then(data => {
      console.log("Fetched classes:", data); // <-- see what comes back
      setClasses(data);
    })
      .catch(err => console.error('Error fetching class data:', err));
  }, []);

  // Handle CSV download
  const handleClassDownload = async () => {
    if (!selectedClass) {
      alert('Please select a class first');
      return;
    }

    try {
      const response = await fetch(`/api/export/${selectedClass}`);
      if (!response.ok) throw new Error('Failed to download CSV');

      // Create a temporary link for downloading
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedClass}_report_cards.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Failed to download class report.');
    }
  };

  return (
    <div>
      <h1>Access to student report cards</h1>

      <p>
        Select class:{' '}
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
        >
          <option value="">-- Select a class --</option>
          {classes.map((cls) => (
            <option key={cls.className} value={cls.className}>
              {cls.className} ({cls.students.length} students)
            </option>
          ))}
        </select>
      </p>

      

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



