import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import pg from "pg";
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

/* ---------------------------------------------------
   LOAD USERS.JSON
----------------------------------------------------*/
const usersPath = path.join(__dirname, "users.json");
const users = JSON.parse(fs.readFileSync(usersPath, "utf8"));

/* ---------------------------------------------------
   POSTGRES
----------------------------------------------------*/
const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DB_URL,
  //ssl: { rejectUnauthorized: false }
});

/* ---------------------------------------------------
   MIDDLEWARE
----------------------------------------------------*/
app.use(cors({
  origin: [
    "https://learningsanctuarytura.onrender.com",
    "https://tls-server.com",
    "https://learningsanctuaryt.onrender.com",
    "http://localhost:5173"
  ],
  methods: ["GET", "POST","PATCH","PUT", "DELETE"]
}));

app.use(bodyParser.json());

/* ---------------------------------------------------
   TEACHER PAGES + LOGIN
----------------------------------------------------*/
const publicPath = path.join(__dirname, "../frontend/public");
app.use(express.static(publicPath));

app.get("/", (req, res) => {
  res.sendFile(path.join(publicPath, "login.html"));
});

/* ---------------------------------------------------
   REACT ADMIN SPA
----------------------------------------------------*/
const adminPath = path.join(__dirname, "../frontend/dis");
// Serve only the assets folder from React build
app.use("/admin/assets", express.static(path.join(adminPath, "assets")));

// React SPA entry
app.get("/admin", (req, res) => {
  res.sendFile(path.join(adminPath, "index.html"));
});



/* ---------------------------------------------------
   LOGIN ROUTE
----------------------------------------------------*/
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  const user = users.find(
    (u) => u.username === username && u.password === password
  );

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  res.json({ role: user.role });
});

/* ---------------------------------------------------
   DB INIT
----------------------------------------------------*/
async function initDB() {
  // MARKS TABLE (report cards)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS marks (
      id SERIAL PRIMARY KEY,
      class_name TEXT,
      year TEXT,
      term TEXT,
      student_name TEXT,
      subject TEXT,
      score TEXT,
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // STUDENTS TABLE
  await pool.query(`
    CREATE TABLE IF NOT EXISTS students (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      roll_number INT,
      contact TEXT,
      address TEXT,
      class_name TEXT,
      year TEXT,
      term TEXT,
      mother_name TEXT,
      father_name TEXT,
      dob DATE,
      blood_type TEXT
    );
  `);

  // STUDENT PAYMENTS TABLE
  await pool.query(`
    CREATE TABLE IF NOT EXISTS student_payments (
      id SERIAL PRIMARY KEY,
      student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      date DATE,
      payment_method TEXT,
      payment_type TEXT,
      amount NUMERIC,
      year TEXT,
      term TEXT
    );
  `);

await pool.query(`
CREATE TABLE student_payments_manual (
    id SERIAL PRIMARY KEY,
    class_name VARCHAR(100) NOT NULL,
    student_name VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    payment_method VARCHAR(50),
    payment_type VARCHAR(50) NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    year VARCHAR(10) NOT NULL,
    term VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
`);

  // MISC EXPENSES TABLE
  await pool.query(`
    CREATE TABLE IF NOT EXISTS misc_expenses (
      id SERIAL PRIMARY KEY,
      date DATE,
      category TEXT,
      description TEXT,
      amount NUMERIC
    );
  `);

  // SALARY PAYMENTS TABLE
  await pool.query(`
    CREATE TABLE IF NOT EXISTS salary_payments (
      id SERIAL PRIMARY KEY,
      staff_name TEXT,
      date DATE,
      month TEXT,
      amount NUMERIC,
      mode TEXT
    );
  `);
}

initDB();

/* ---------------------------------------------------
   MARKS SUBMIT (report cards, untouched)
----------------------------------------------------*/
app.post("/submit", async (req, res) => {
  const { className, year, term, marks } = req.body;

  try {
    for (const [student, subjects] of Object.entries(marks)) {
      for (const [subject, score] of Object.entries(subjects)) {
        if (!score) continue;

        const result = await pool.query(
          `SELECT id FROM marks
           WHERE class_name=$1 AND year=$2 AND term=$3
           AND student_name=$4 AND subject=$5`,
          [className, year, term, student, subject]
        );

        if (result.rows.length > 0) {
          await pool.query(
            `UPDATE marks SET score=$1, updated_at=NOW() WHERE id=$2`,
            [score, result.rows[0].id]
          );
        } else {
          await pool.query(
            `INSERT INTO marks
             (class_name, year, term, student_name, subject, score)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [className, year, term, student, subject, score]
          );
        }
      }
    }

    res.json({ message: "Data merged + saved to Postgres!" });
  } catch (err) {
    console.error("DB ERROR:", err);
    res.status(500).json({ error: "Database error" });
  }
});

/* ---------------------------------------------------
   GET CLASSES (report cards, untouched)
----------------------------------------------------*/
app.get("/api/classes", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM marks");

    const grouped = {};

    result.rows.forEach((row) => {
      const key = `${row.class_name}-${row.year}-${row.term}`;

      if (!grouped[key]) {
        grouped[key] = {
          className: row.class_name,
          year: row.year,
          term: row.term,
          marks: {}
        };
      }

      if (!grouped[key].marks[row.student_name]) {
        grouped[key].marks[row.student_name] = {};
      }

      grouped[key].marks[row.student_name][row.subject] = row.score;
    });

    res.json(Object.values(grouped));
  } catch (err) {
    console.error("DB ERROR:", err);
    res.status(500).json({ error: "Database error" });
  }
});

/* ---------------------------------------------------
   STUDENTS ENDPOINTS (report card related)
----------------------------------------------------*/
// OLD (using :className in the path) - you can comment this out or remove
// app.get("/api/students/:className", ...);

// NEW: safe query-based version
app.get("/api/students", async (req, res) => {
  const { class: className, year, term } = req.query;

  if (!className || !year || !term) {
    return res.status(400).json({ error: "Missing class, year, or term" });
  }

  try {
    const studentResult = await pool.query(
      `SELECT id, name, roll_number AS roll, contact, address, mother_name, father_name,
              dob, blood_type
       FROM students
       WHERE class_name = $1 AND year = $2 AND term = $3
       ORDER BY roll_number`,
      [className, year, term]
    );

    res.json(studentResult.rows);
  } catch (err) {
    console.error("STUDENT ERROR:", err);
    res.status(500).json({ error: "Database fetch failed" });
  }
});


app.post("/api/students", async (req, res) => {
  const body = req.body;

  if (!body.name || !body.className || !body.year || !body.term) {
    return res.status(400).json({ error: "Missing required fields" });
  }

const student = {
  name: body.name,
  roll_number: body.roll ?? null,
  contact: body.contact ?? null,
  address: body.address ?? null,
  class_name: body.className,
  year: body.year,
  term: body.term,
  mother_name: body.motherName ?? null,
  father_name: body.fatherName ?? null,
  dob: body.dob ?? null,
  blood_type: body.bloodType ?? null
};


  try {
    const result = await pool.query(
  `INSERT INTO students 
    (name, roll_number, contact, address, class_name, year, term,
     mother_name, father_name, dob, blood_type)
   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
   RETURNING id, name, roll_number AS roll, contact, address,
             mother_name, father_name, dob, blood_type`,
  [
    student.name,
    student.roll_number,
    student.contact,
    student.address,
    student.class_name,
    student.year,
    student.term,
    student.mother_name,
    student.father_name,
    student.dob,
    student.blood_type
  ]
);


    res.json(result.rows[0]);

  } catch (err) {
    console.error("Insert student error:", err.message, err.detail, err.stack);
    return res.status(500).json({
      error: "Database insert failed",
      message: err.message,
      detail: err.detail,
    });
  }
});

app.patch("/api/students/:id", async (req, res) => {
  const { id } = req.params;
  const { name, motherName, fatherName, contact, address, dob, bloodType } = req.body;

  try {
    const result = await pool.query(
      `UPDATE students
       SET name=$1,
           mother_name=$2,
           father_name=$3,
           contact=$4,
           address=$5,
           dob=$6,
           blood_type=$7
       WHERE id=$8
       RETURNING id, name, roll_number AS roll, contact, address, mother_name, father_name, dob, blood_type`,
      [name, motherName, fatherName, contact, address, dob, bloodType, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update student error:", err);
    res.status(500).json({ error: "Database update failed", message: err.message });
  }
});


/* ---------------------------------------------------
   STUDENT PAYMENTS
----------------------------------------------------*/
app.get("/api/student-payments/:studentId", async (req, res) => {
  const { studentId } = req.params;

  try {
    const result = await pool.query(
      `SELECT sp.*, s.name AS student_name, s.class_name
       FROM student_payments sp
       JOIN students s ON sp.student_id = s.id
       WHERE sp.student_id = $1
       ORDER BY sp.date DESC`,
      [studentId]
    );

    const payments = result.rows.map(p => ({
      id: p.id,
      studentId: p.student_id,
      studentName: p.student_name,
      className: p.class_name,
      date: p.date ? p.date.toISOString().split("T")[0] : null,
      paymentMethod: p.payment_method,
      paymentType: p.payment_type,
      amount: Number(p.amount),
      year: p.year,
      term: p.term
    }));

    res.json(payments);
  } catch (err) {
    console.error("Fetch student payments error:", err);
    res.status(500).json({ error: "Database fetch failed", message: err.message });
  }
});







// Express.js example
app.post("/api/student-payments/from-manual", async (req, res) => {
  try {
    const {
      className,
      studentName,
      date,
      paymentMethod,
      paymentType,
      amount,
      year,
      term
    } = req.body;

    // Insert into manual payments table
    await pool.query(
      `INSERT INTO student_payments_manual 
       (class_name, student_name, date, payment_method, payment_type, amount, year, term)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [className, studentName, date, paymentMethod, paymentType, amount, year, term]
    );

    // Return recent payments for this class/year/term
    const payments = await pool.query(
      `SELECT 
         class_name AS "className", 
         student_name AS "studentName", 
         date, 
         payment_method AS "paymentMethod", 
         payment_type AS "paymentType", 
         amount
       FROM student_payments_manual
       WHERE class_name=$1 AND year=$2 AND term=$3
       ORDER BY date DESC`,
      [className, year, term]
    );

    res.json({ payments: payments.rows });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save payment." });
  }
});

app.get("/api/student-payments/recent", async (req, res) => {
  const { class: className, year, term } = req.query;
  const result = await pool.query(
    `SELECT class_name AS "className", student_name AS "studentName",
            date, payment_method AS "paymentMethod",
            payment_type AS "paymentType", amount
     FROM student_payments_manual
     WHERE class_name=$1 AND year=$2 AND term=$3
     ORDER BY date DESC`,
    [className, year, term]
  );
  res.json({ payments: result.rows });
});




/* ---------------------------------------------------
   MISC PAYMENTS
----------------------------------------------------*/
app.get("/api/misc-expenses", async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM misc_expenses ORDER BY date DESC`);
    res.json(result.rows.map(p => ({
      id: p.id,
      date: p.date ? p.date.toISOString().split("T")[0] : null,
      category: p.category,
      description: p.description,
      amount: Number(p.amount)
    })));
  } catch (err) {
    console.error("Fetch misc expenses error:", err);
    res.status(500).json({ error: "Database fetch failed", message: err.message });
  }
});

app.post("/api/misc-expenses", async (req, res) => {
  const { date, category, description, amount } = req.body;

  try {
    await pool.query(
      `INSERT INTO misc_expenses (date, category, description, amount)
       VALUES ($1,$2,$3,$4)`,
      [date, category, description, amount]
    );

    // Return full list for immediate table update
    const result = await pool.query(`SELECT * FROM misc_expenses ORDER BY date DESC`);
    const expenses = result.rows.map(p => ({
      id: p.id,
      date: p.date ? p.date.toISOString().split("T")[0] : null,
      category: p.category,
      description: p.description,
      amount: Number(p.amount)
    }));

    res.json(expenses);
  } catch (err) {
    console.error("Insert misc expense error:", err);
    res.status(500).json({ error: "Database insert failed", message: err.message });
  }
});


/* ---------------------------------------------------
   SALARY PAYMENTS
----------------------------------------------------*/
app.get("/api/salary/:staffName", async (req, res) => {
  const { staffName } = req.params;
  try {
    const result = await pool.query(
      `SELECT * FROM salary_payments WHERE staff_name=$1 ORDER BY date DESC`,
      [staffName]
    );
    res.json(result.rows.map(p => ({
      id: p.id,
      staffName: p.staff_name,
      date: p.date ? p.date.toISOString().split("T")[0] : null,
      month: p.month,
      amount: Number(p.amount),
      mode: p.mode
    })));
  } catch (err) {
    console.error("Fetch salary payments error:", err);
    res.status(500).json({ error: "Database fetch failed", message: err.message });
  }
});

app.post("/api/salary", async (req, res) => {
  const { staff_name, date, month, amount, mode } = req.body;

  try {
    await pool.query(
      `INSERT INTO salary_payments (staff_name, date, month, amount, mode)
       VALUES ($1,$2,$3,$4,$5)`,
      [staff_name, date, month, amount, mode]
    );

    // Return all salary payments for this staff member
    const result = await pool.query(
      `SELECT * FROM salary_payments WHERE staff_name=$1 ORDER BY date DESC`,
      [staff_name]
    );

    const salaries = result.rows.map(p => ({
      id: p.id,
      staffName: p.staff_name,
      date: p.date ? p.date.toISOString().split("T")[0] : null,
      month: p.month,
      amount: Number(p.amount),
      mode: p.mode
    }));

    res.json(salaries);
  } catch (err) {
    console.error("Insert salary payment error:", err);
    res.status(500).json({ error: "Database insert failed", message: err.message });
  }
});


// PATCH /api/student-payments/:id
// PATCH /api/student-payments/:id
app.patch("/api/student-payments/:id", async (req, res) => {
  const { id } = req.params;
  const { date, paymentMethod, paymentType, amount, year, term } = req.body;

  try {
    const updateResult = await pool.query(
      `UPDATE student_payments
       SET date=$1, payment_method=$2, payment_type=$3, amount=$4, year=$5, term=$6
       WHERE id=$7 RETURNING student_id`,
      [date, paymentMethod, paymentType, amount, year, term, id]
    );

    if (updateResult.rows.length === 0)
      return res.status(404).json({ error: "Payment not found" });

    const studentId = updateResult.rows[0].student_id;

    const paymentsResult = await pool.query(
      `SELECT * FROM student_payments WHERE student_id=$1 ORDER BY date DESC`,
      [studentId]
    );

    const payments = paymentsResult.rows.map(p => ({
      id: p.id,
      studentId: p.student_id,
      date: p.date ? p.date.toISOString().split("T")[0] : null,
      paymentMethod: p.payment_method,
      paymentType: p.payment_type,
      amount: Number(p.amount),
      year: p.year,
      term: p.term
    }));

    res.json({ studentId, payments });
  } catch (err) {
    console.error("Update student payment error:", err);
    res.status(500).json({ error: "Database update failed", message: err.message });
  }
});

// DELETE /api/student-payments/:id
app.delete("/api/student-payments/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const deleteResult = await pool.query(
      `DELETE FROM student_payments WHERE id=$1 RETURNING student_id`,
      [id]
    );

    if (deleteResult.rows.length === 0)
      return res.status(404).json({ error: "Payment not found" });

    const studentId = deleteResult.rows[0].student_id;

    const paymentsResult = await pool.query(
      `SELECT * FROM student_payments WHERE student_id=$1 ORDER BY date DESC`,
      [studentId]
    );

    const payments = paymentsResult.rows.map(p => ({
      id: p.id,
      studentId: p.student_id,
      date: p.date ? p.date.toISOString().split("T")[0] : null,
      paymentMethod: p.payment_method,
      paymentType: p.payment_type,
      amount: Number(p.amount),
      year: p.year,
      term: p.term
    }));

    res.json({ studentId, payments });
  } catch (err) {
    console.error("Delete student payment error:", err);
    res.status(500).json({ error: "Database delete failed", message: err.message });
  }
});


// Returns distinct class/year/term from students table
app.get("/api/classes-from-students", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT class_name, year, term
       FROM students
       ORDER BY class_name, year, term`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching classes-from-students:", err);
    res.status(500).json({ error: "Failed to fetch classes" });
  }
});




/* ---------------------------------------------------
   START SERVER
----------------------------------------------------*/
const PORT = process.env.PORT || 4040;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

