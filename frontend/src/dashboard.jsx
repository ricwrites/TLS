import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export const AdDashboard = ({ currentUser }) => {
  const [history, setHistory] = useState([]);

  // -------------------------
  // Load history from localStorage on mount
  // -------------------------
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("exportHistory") || "[]");
    setHistory(stored);
  }, []);

  // -------------------------
  // Utility for CSV export
  // -------------------------
  const exportCSV = (filename, data, headers) => {
    const csvContent = [
      headers.join(","),
      ...data.map((row) => headers.map((h) => row[h]).join(",")),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, filename);
    addHistory(filename, "CSV");
  };

  // -------------------------
  // Utility for XLSX export
  // -------------------------
  const exportXLSX = (filename, sheetsData) => {
    const wb = XLSX.utils.book_new();
    sheetsData.forEach(({ name, data }) => {
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, name);
    });
    XLSX.writeFile(wb, filename);
    addHistory(filename, "XLSX");
  };

  // -------------------------
  // Add to history (state + localStorage)
  // -------------------------
  const addHistory = (filename, type) => {
    const record = {
      id: Date.now(),
      filename,
      type,
      user: currentUser,
      date: new Date().toLocaleString(),
    };

    // Update state
    setHistory((prev) => [record, ...prev]);

    // Update localStorage
    const stored = JSON.parse(localStorage.getItem("exportHistory") || "[]");
    stored.unshift(record);
    localStorage.setItem("exportHistory", JSON.stringify(stored));
  };

  // -------------------------
  // Existing export functions (Student details, payments, etc.)
  // -------------------------
  const exportReportCards = async () => {
    try {
      const res = await fetch("/api/classes");
      const classes = await res.json();

      if (!classes.length) return alert("No class data available");

      const workbook = XLSX.utils.book_new();

      classes.forEach((cls) => {
        const { className, year, term, marks } = cls;
        const studentMarks = marks || {};
        const subjectsSet = new Set();
        Object.values(studentMarks).forEach((studentScores) => {
          Object.keys(studentScores || {}).forEach((sub) => subjectsSet.add(sub));
        });
        const subjects = Array.from(subjectsSet);

        const data = [["Student", ...subjects]];
        Object.entries(studentMarks).forEach(([student, scores]) => {
          data.push([student, ...subjects.map((sub) => scores[sub] || "")]);
        });

        const ws = XLSX.utils.aoa_to_sheet(data);
        const sheetName = `${className}_${year}_Term${term}`.slice(0, 31);
        XLSX.utils.book_append_sheet(workbook, ws, sheetName);
      });

      const filename = `Master_Report_Cards_${Date.now()}.xlsx`;
      XLSX.writeFile(workbook, filename);
      addHistory(filename, "Master Report Cards");
    } catch (err) {
      console.error("Error exporting master report cards:", err);
    }
  };

  // -------------------------
  // Other exports can remain as they were
  // -------------------------
  const exportStudentPayments = async () => {
    try {
      const res = await fetch("/api/classes");
      const classes = await res.json();

      let allPayments = [];

      for (const cls of classes) {
        const studentRes = await fetch(
          `/api/students/${cls.className}?year=${cls.year}&term=${cls.term}`
        );
        const students = await studentRes.json();

        for (const s of students) {
          try {
            const paymentRes = await fetch(`/api/student-payments/${s.id}`);
            const payments = await paymentRes.json();

            if (Array.isArray(payments) && payments.length) {
              allPayments.push(
                ...payments.map((p) => ({
                  Student: s.name,
                  Date: p.date,
                  Type: p.paymentType,
                  Method: p.paymentMethod,
                  Amount: p.amount,
                  Class: cls.className,
                  Year: p.year,
                  Term: p.term,
                }))
              );
            }
          } catch (err) {
            console.error(`Failed to fetch payments for student ${s.id}`, err);
          }
        }
      }

      if (!allPayments.length) return alert("No student payments found!");

      exportCSV(`student_payments_${Date.now()}.csv`, allPayments, [
        "Student",
        "Date",
        "Type",
        "Method",
        "Amount",
        "Class",
        "Year",
        "Term",
      ]);
    } catch (err) {
      console.error("Error exporting student payments:", err);
    }
  };


  const exportMiscExpenses = async () => {
    try {
      const res = await fetch("/api/misc-expenses");
      const expenses = await res.json();

      if (!Array.isArray(expenses) || !expenses.length) {
        return alert("No misc expenses found!");
      }

      exportCSV(`misc_expenses_${Date.now()}.csv`, expenses, [
        "date",
        "category",
        "description",
        "amount",
      ]);
    } catch (err) {
      console.error("Error exporting misc expenses:", err);
    }
  };

  const exportSalaryPayments = async () => {
    try {
      const staffList = ["Principal", "Teacher A", "Teacher B", "Accountant", "Driver", "Helper"];
      const sheets = [];

      for (const staff of staffList) {
        const res = await fetch(`/api/salary/${encodeURIComponent(staff)}`);
        const payments = await res.json();

        if (Array.isArray(payments) && payments.length) {
          sheets.push({
            name: staff,
            data: payments.map((p) => ({
              Date: p.date,
              Month: p.month,
              Amount: p.amount,
              Mode: p.mode,
            })),
          });
        }
      }

      if (!sheets.length) return alert("No salary payments found!");

      exportXLSX(`salary_payments_${Date.now()}.xlsx`, sheets);
    } catch (err) {
      console.error("Error exporting salary payments:", err);
    }
  };

  // -------------------------
  // Render
  // -------------------------
  return (
    <div style={{ display: "flex", gap: "20px", padding: "20px" }}>
      {/* LEFT: Buttons */}
      <div style={{ width: "250px", display: "flex", flexDirection: "column", gap: "10px" }}>
        <h2>Export Reports</h2>
        <button onClick={exportReportCards}>Master Report Cards (XLSX)</button>
        <button onClick={exportStudentPayments}>Student Payments (CSV)</button>
        <button onClick={exportMiscExpenses}>Misc Expenses (CSV)</button>
        <button onClick={exportSalaryPayments}>Salary Payments (XLSX)</button>
      </div>

      {/* RIGHT: History */}
      <div style={{ flex: 1 }}>
        <h2>Export History</h2>
        <table border="1" cellPadding="8" width="100%">
          <thead>
            <tr>
              <th>Filename</th>
              <th>Type</th>
              <th>User</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {history.length > 0 ? (
              history.map((h) => (
                <tr key={h.id}>
                  <td>{h.filename}</td>
                  <td>{h.type}</td>
                  <td>{h.user}</td>
                  <td>{h.date}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" style={{ textAlign: "center" }}>
                  No exports yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

