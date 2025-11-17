import { useState, useEffect } from "react";

export const PaymentTracks = () => {
  const [form, setForm] = useState({
    type: "IN",
    amount: "",
    category: "",
    comment: ""
  });
  const [payments, setPayments] = useState([]);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    if (res.ok) {
      alert("Payment recorded!");
      fetchPayments();
      setForm({ type: "IN", amount: "", category: "", comment: "" });
    } else alert("Error saving payment");
  };

  const fetchPayments = async () => {
    const res = await fetch("/api/payments");
    const data = await res.json();
    setPayments(data);
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const exportCSV = () => {
    const header = ["id","type","amount","category","comment","created_by","date"];
    const rows = payments.map(p => [p.id,p.type,p.amount,p.category,p.comment,p.created_by,p.date]);
    const csvContent = [header, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "payments.csv";
    link.click();
  };

  return (
    <div>
      <h1>Payment Tracker</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Type:
          <select name="type" value={form.type} onChange={handleChange}>
            <option value="IN">Payment IN</option>
            <option value="OUT">Payment OUT</option>
          </select>
        </label>
        <label>
          Amount:
          <input name="amount" type="number" step="0.01" onChange={handleChange} value={form.amount} required />
        </label>
        <label>
          Category:
          <input name="category" onChange={handleChange} value={form.category} required />
        </label>
        <label>
          Comment:
          <input name="comment" onChange={handleChange} value={form.comment} />
        </label>
        <button type="submit">Submit</button>
      </form>

      <h2>All Payments</h2>
      <button onClick={exportCSV}>Export as CSV</button>
      <table border="1" cellPadding="5">
        <thead>
          <tr>
            <th>ID</th>
            <th>Type</th>
            <th>Amount</th>
            <th>Category</th>
            <th>Comment</th>
            <th>Created By</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {payments.map(p => (
            <tr key={p.id}>
              <td>{p.id}</td>
              <td>{p.type}</td>
              <td>{p.amount}</td>
              <td>{p.category}</td>
              <td>{p.comment}</td>
              <td>{p.created_by}</td>
              <td>{new Date(p.date).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

