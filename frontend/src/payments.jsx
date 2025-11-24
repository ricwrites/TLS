import React, { useState, useEffect } from "react";

export const Payments = () => {
  const [mode, setMode] = useState("");

  return (
    <div style={{ padding: "20px" }}>
      <h1>Payment Tracker</h1>

      <div style={{ marginBottom: "20px" }}>
        <button onClick={() => setMode("student")}>Student Payments</button>
        <button onClick={() => setMode("misc")} style={{ marginLeft: 10 }}>
          Misc School Expenses
        </button>
        <button onClick={() => setMode("salary")} style={{ marginLeft: 10 }}>
          Salary Payments
        </button>
      </div>

      {mode === "" && <h3>Select a section above</h3>}
      {mode === "student" && <StudentPaymentUI />}
      {mode === "misc" && <MiscPaymentUI />}
      {mode === "salary" && <SalaryPaymentUI />}
    </div>
  );
};

/* ============================================================
   STUDENT PAYMENTS — SIMPLIFIED VERSION
   - No class dropdown
   - No student dropdown
   - Manual student name input
============================================================ */
function StudentPaymentUI() {
  const API_BASE = import.meta.env.VITE_API_BASE;

  const [studentName, setStudentName] = useState("");
  const [payments, setPayments] = useState([]);

  const [form, setForm] = useState({
    date: "",
    payment_method: "",
    payment_type: "",
    amount: ""
  });

  const year = "2025";
  const term = "2";

  /* ============================================================
     LOAD ALL PAYMENTS FOR THIS STUDENT
  ============================================================ */
  useEffect(() => {
    if (!studentName.trim()) {
      setPayments([]);
      return;
    }

    fetch(`${API_BASE}/api/student-payments/by-name/${encodeURIComponent(studentName.trim())}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setPayments(data);
      })
      .catch(err => console.error("Error fetching payments:", err));
  }, [studentName]);

  /* ============================================================
     SUBMIT PAYMENT
  ============================================================ */
  const submitPayment = async () => {
    if (!studentName.trim() || !form.amount || !form.payment_type) {
      return alert("Enter the student name, amount, and type.");
    }

    const body = {
      studentName: studentName.trim(),
      date: form.date || new Date().toISOString().slice(0, 10),
      paymentMethod: form.payment_method,
      paymentType: form.payment_type,
      amount: Number(form.amount),
      year,
      term
    };

    try {
      const res = await fetch(`${API_BASE}/api/student-payments/by-name`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const saved = await res.json();

      if (Array.isArray(saved.payments)) setPayments(saved.payments);

      setForm({
        date: "",
        payment_method: "",
        payment_type: "",
        amount: ""
      });

    } catch (err) {
      console.error("Error submitting payment:", err);
      alert("Failed to submit payment.");
    }
  };

  /* ============================================================
     RENDER
  ============================================================ */
  return (
    <div style={{ display: "flex", gap: 20 }}>
      
      {/* LEFT PANEL */}
      <div style={{ width: "40%", border: "1px solid #ccc", padding: 20 }}>
        <h2>New Student Payment</h2>

        <label>Student Name:</label>
        <input
          type="text"
          value={studentName}
          onChange={(e) => setStudentName(e.target.value)}
          placeholder="Enter student name"
        />

        <label>Date:</label>
        <input
          type="date"
          value={form.date}
          onChange={e => setForm({ ...form, date: e.target.value })}
        />

        <label>Payment Method:</label>
        <input
          value={form.payment_method}
          onChange={e => setForm({ ...form, payment_method: e.target.value })}
        />

        <label>Type of Payment:</label>
        <select
          value={form.payment_type}
          onChange={e => setForm({ ...form, payment_type: e.target.value })}
        >
          <option value="">-- Select --</option>
          <option>School Fees</option>
          <option>Registration</option>
          <option>Re-registration</option>
          <option>Bus Fees</option>
          <option>Stationery Fees</option>
          <option>Uniform Fees</option>
          <option>Other/Misc</option>
        </select>

        <label>Amount:</label>
        <input
          type="number"
          value={form.amount}
          onChange={e => setForm({ ...form, amount: e.target.value })}
        />

        <button onClick={submitPayment} style={{ marginTop: 10 }}>
          Submit Payment
        </button>
      </div>

      {/* RIGHT PANEL */}
      <div style={{ width: "60%" }}>
        <h2>Payment History</h2>

        <table border="1" cellPadding="8" width="100%">
          <thead>
            <tr>
              <th>Date</th>
              <th>Method</th>
              <th>Type</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: "center" }}>
                  No payments found
                </td>
              </tr>
            ) : (
              payments.map((p, idx) => (
                <tr key={idx}>
                  <td>{p.date}</td>
                  <td>{p.paymentMethod}</td>
                  <td>{p.paymentType}</td>
                  <td>{p.amount}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


/* ============================================================
   MISC EXPENSES
============================================================ */
function MiscPaymentUI() {
  const [expenses, setExpenses] = useState([]);
  const API_BASE = import.meta.env.VITE_API_BASE;

  const [form, setForm] = useState({
    date: "",
    category: "",
    description: "",
    amount: ""
  });

  useEffect(() => {
    fetch(`${API_BASE}/api/misc-expenses`)
      .then(r => r.json())
      .then(data => setExpenses(Array.isArray(data) ? data : []))
      .catch(err => console.error("Error fetching misc expenses:", err));
  }, []);

  const submit = async () => {
    if (!form.category || !form.amount) return alert("Enter category and amount.");

    try {
      const res = await fetch(`${API_BASE}/api/misc-expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, amount: Number(form.amount) })
      });
      const saved = await res.json();
      setExpenses(Array.isArray(saved) ? saved : []);

      setForm({ date: "", category: "", description: "", amount: "" });
    } catch (err) {
      console.error("Error adding expense:", err);
      alert("Failed to add expense.");
    }
  };

  return (
    <div style={{ display: "flex", gap: 20 }}>
      <div style={{ width: "40%", border: "1px solid #ccc", padding: 20 }}>
        <h2>New Expense Entry</h2>

        <label>Date:</label> 
        <input
          type="date"
          value={form.date}
          onChange={e => setForm({ ...form, date: e.target.value })}
        /><br />

        <label>Category:</label>
        <select
          value={form.category}
          onChange={e => setForm({ ...form, category: e.target.value })}
        >
          <option value="">-- Select --</option>
          <option>Labour Payment</option>
          <option>Material Payment</option>
          <option>Water</option>
          <option>Books</option>
          <option>Canteen Maintenance</option>
          <option>Bus Fuel</option>
          <option>Bus Maintenance</option>
          <option>Other/Misc</option>
        </select> <br />

        <label>Description:</label>
        <input
          value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })}
        /><br />

        <label>Amount:</label>
        <input
          type="number"
          value={form.amount}
          onChange={e => setForm({ ...form, amount: e.target.value })}
        /> <br /> 

        <button onClick={submit} style={{ marginTop: 10 }}>
          Add Expense
        </button>
      </div>

      <div style={{ width: "60%" }}>
        <h2>All Expenses</h2>
        <table border="1" cellPadding="8" width="100%">
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Description</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((e, idx) => (
              <tr key={e.id || idx}>
                <td>{e.date}</td>
                <td>{e.category}</td>
                <td>{e.description}</td>
                <td>{e.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============================================================
   SALARY PAYMENTS
============================================================ */
function SalaryPaymentUI() {
  const staffList = ["Principal", "Teacher A", "Teacher B", "Accountant", "Driver", "Helper"];
  const [selected, setSelected] = useState("");
  const [payments, setPayments] = useState([]);
  const API_BASE = import.meta.env.VITE_API_BASE;
  const [form, setForm] = useState({ date: "", month: "", amount: "", mode: "" });

  useEffect(() => {
    if (!selected) return;

    fetch(`${API_BASE}/api/salary/${encodeURIComponent(selected)}`)
      .then(r => r.json())
      .then(data => setPayments(Array.isArray(data) ? data : []))
      .catch(err => console.error("Error fetching salary payments:", err));
  }, [selected]);

  const submit = async () => {
    if (!selected || !form.amount) return alert("Select staff and enter amount.");

    try {
      const body = { staff_name: selected, ...form, amount: Number(form.amount) };
      const res = await fetch(`${API_BASE}/api/salary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const saved = await res.json();
      setPayments(Array.isArray(saved) ? saved : []);

      setForm({ date: "", month: "", amount: "", mode: "" });
    } catch (err) {
      console.error("Error submitting salary:", err);
      alert("Failed to submit salary payment.");
    }
  };

  return (
    <div style={{ display: "flex", gap: 20 }}>
      <div style={{ width: "40%", border: "1px solid #ccc", padding: 20 }}>
        <h2>New Salary Payment</h2>

        <label>Staff:</label>
        <select value={selected} onChange={e => setSelected(e.target.value)}>
          <option value="">-- Select Staff --</option>
          {staffList.map((s, i) => (
            <option key={i}>{s}</option>
          ))}
        </select>

        <label>Date:</label>
        <input
          type="date"
          value={form.date}
          onChange={e => setForm({ ...form, date: e.target.value })}
        />

        <label>Month:</label>
        <input
          value={form.month}
          onChange={e => setForm({ ...form, month: e.target.value })}
        />

        <label>Amount:</label>
        <input
          type="number"
          value={form.amount}
          onChange={e => setForm({ ...form, amount: e.target.value })}
        />

        <label>Mode:</label>
        <select value={form.mode} onChange={e => setForm({ ...form, mode: e.target.value })}>
          <option value="">-- Select --</option>
          <option>Cash</option>
          <option>UPI</option>
          <option>Bank Transfer</option>
        </select>

        <button onClick={submit} style={{ marginTop: 10 }}>
          Submit Salary
        </button>
      </div>

      <div style={{ width: "60%" }}>
        <h2>Salary Payment History</h2>
        <table border="1" cellPadding="8" width="100%">
          <thead>
            <tr>
              <th>Date</th>
              <th>Month</th>
              <th>Amount</th>
              <th>Mode</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p, idx) => (
              <tr key={p.id || idx}>
                <td>{p.date}</td>
                <td>{p.month}</td>
                <td>{p.amount}</td>
                <td>{p.mode}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

