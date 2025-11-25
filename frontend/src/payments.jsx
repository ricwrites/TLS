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
   STUDENT PAYMENTS — SIMPLE MANUAL ENTRY VERSION
============================================================ */

function StudentPaymentUI() {
  const API_BASE = import.meta.env.VITE_API_BASE;

  const [students, setStudents] = useState([]);
  const [payments, setPayments] = useState([]);

  const [form, setForm] = useState({
    studentId: "",
    studentName: "",
    className: "",
    year: "",
    term: "",
    date: "",
    paymentMethod: "",
    paymentType: "",
    amount: ""
  });

  /* =============================
     FETCH ALL STUDENTS ON MOUNT
  ============================== */
  useEffect(() => {
    fetch(`${API_BASE}/api/students/all`)
      .then(res => res.json())
      .then(data => setStudents(data))
      .catch(err => console.error("Error fetching students:", err));
  }, []);

  /* =============================
     WHEN STUDENT SELECTED → LOAD PAYMENTS
  ============================== */
  useEffect(() => {
    if (!form.studentId) return;

    fetch(`${API_BASE}/api/student-payments/${form.studentId}`)
      .then(res => res.json())
      .then(data => setPayments(data || []))
      .catch(err => {
        console.error("Error fetching payments:", err);
        setPayments([]);
      });
  }, [form.studentId]);

  /* =============================
     SUBMIT PAYMENT
  ============================== */
  const submitPayment = async () => {
    if (!form.studentId || !form.amount || !form.paymentType) {
      return alert("Please fill student, amount, and type.");
    }

    const body = {
      studentId: form.studentId,
      studentName: form.studentName,
      className: form.className,
      year: form.year,
      term: form.term,
      date: form.date || new Date().toISOString().split("T")[0],
      paymentMethod: form.paymentMethod,
      paymentType: form.paymentType,
      amount: Number(form.amount)
    };

    try {
      const res = await fetch(`${API_BASE}/api/student-payments/from-manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      setPayments(data.payments || []);

      // Reset fields but keep selected student
      setForm({
        ...form,
        date: "",
        paymentMethod: "",
        paymentType: "",
        amount: ""
      });

    } catch (err) {
      console.error("Error submitting payment:", err);
      alert("Failed to submit payment.");
    }
  };

  /* =============================
   HANDLE STUDENT INPUT
============================= */
const handleStudentNameChange = (e) => {
  setForm({ ...form, studentName: e.target.value });
};

const handleClassNameChange = (e) => {
  setForm({ ...form, className: e.target.value });
};

return (
  <div style={{ display: "flex", gap: 20 }}>
    
    {/* LEFT PANEL */}
    <div style={{ width: "40%", border: "1px solid #ccc", padding: 20 }}>
      <h2>New Student Payment</h2>

      <label>Student Name:</label>
      <input
        type="text"
        value={form.studentName}
        onChange={handleStudentNameChange}
        placeholder="Enter student name"
      /><br />

      <label>Class:</label>
      <input
        type="text"
        value={form.className}
        onChange={handleClassNameChange}
        placeholder="Enter class"
      /><br />

      <label>Year:</label>
      <input
        type="number"
        value={form.year}
        onChange={e => setForm({ ...form, year: e.target.value })}
        placeholder="Enter year"
      /><br />

      <label>Term:</label>
      <input
        type="number"
        value={form.term}
        onChange={e => setForm({ ...form, term: e.target.value })}
        placeholder="Enter term"
      /><br />

      <label>Date:</label>
      <input
        type="date"
        value={form.date}
        onChange={e => setForm({ ...form, date: e.target.value })}
      /><br />

      <label>Payment Method:</label>
      <select
        value={form.paymentMethod}
        onChange={e => setForm({ ...form, paymentMethod: e.target.value })}
      >
        <option value="">-- Select --</option>
        <option>Cash</option>
        <option>UPI</option>
        <option>Bank</option>
      </select><br />

      <label>Payment Type:</label>
      <select
        value={form.paymentType}
        onChange={e => setForm({ ...form, paymentType: e.target.value })}
      >
        <option value="">-- Select --</option>
        <option>School Fees</option>
        <option>Registration</option>
        <option>Re-registration</option>
        <option>Bus Fees</option>
        <option>Stationery Fees</option>
        <option>Uniform Fees</option>
        <option>Other/Misc</option>
      </select><br />

      <label>Amount:</label>
      <input
        type="number"
        value={form.amount}
        onChange={e => setForm({ ...form, amount: e.target.value })}
      /><br />

      <button onClick={submitPayment} style={{ marginTop: 10 }}>
        Submit Payment
      </button>
    </div>

    {/* RIGHT PANEL */}
    <div style={{ width: "60%" }}>
      <h2>Payments for {form.studentName || "—"}</h2>

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
                No payments yet
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
  const staffList = ["Almorah S. Marak", "Anmol Lohar", "Aparna Baidhya", "Balsime N. Sangma", "Barbie", "Bhogte Thapa", "Bhrainsthone  R. Marak", "Bornali Saha", "Cheasa G. Momin", "Chekamangku A. Sangma", "Dilsa A. Sangma", "Jyoti Prabha Hajong", "Kamal Nath Sahoo", "Kanka Saha", "Mayukha", "Moumita Biswas", "Naina Harlalka", "Nisha Rai", "Padma Koch", "Pomme Das", "Poonam Rai", "Richard Awuku", "Richard Roy", "Rima Chowdhury Saha", "Ritah N. Sangma", "Sandera N. Sangma", "Selthindro M. Marak ", "Sengchila M.  Sangma", "Shivani Singh", "Silingchi M. Sangma", "Sonal Gupta", "Sonika ", "Stephanie K. Sangma", "Suman Mazumdar", "Tenghchi M. Marak", "Teacher A"];
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
        </select><br />

        <label>Date:</label>
        <input
          type="date"
          value={form.date}
          onChange={e => setForm({ ...form, date: e.target.value })}
        /><br />

        <label>Month:</label>
        <input
          value={form.month}
          onChange={e => setForm({ ...form, month: e.target.value })}
        /><br />

        <label>Amount:</label>
        <input
          type="number"
          value={form.amount}
          onChange={e => setForm({ ...form, amount: e.target.value })}
        /><br />

        <label>Mode:</label>
        <select value={form.mode} onChange={e => setForm({ ...form, mode: e.target.value })}>
          <option value="">-- Select --</option>
          <option>Cash</option>
          <option>UPI</option>
          <option>Bank Transfer</option>
        </select><br />

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
};
}
