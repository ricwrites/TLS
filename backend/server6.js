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
  ssl: { rejectUnauthorized: false }
});

/* ---------------------------------------------------
   MIDDLEWARE
----------------------------------------------------*/
app.use(cors({
  origin: [
    "https://learningsanctuarytura.onrender.com",
    "https://tls-server.com"
  ],
  methods: ["GET", "POST"]
}));

app.use(bodyParser.json());

/* ---------------------------------------------------
   REACT ADMIN SPA
----------------------------------------------------*/
const adminPath = path.join(__dirname, "../frontend/dis");
app.use("/admin", express.static(adminPath, { index: "index.html" }));



/* ---------------------------------------------------
   TEACHER PAGES + LOGIN
----------------------------------------------------*/
const publicPath = path.join(__dirname, "../frontend/public");
app.use(express.static(publicPath));

app.get("/", (req, res) => {
  res.sendFile(path.join(publicPath, "login.html"));
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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS students (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      roll_number INT,
      contact TEXT,
      class TEXT NOT NULL,
      year TEXT,
      term TEXT
    );
  `);
}

initDB();


app.post("/api/payments", async (req, res) => {
  try {
    const { type, amount, category, comment } = req.body;
    const created_by = "admin"; // or get from session / auth
    const result = await pool.query(
      `INSERT INTO payments (type, amount, category, comment, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [type, amount, category, comment, created_by]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

/* ---------------------------------------------------
   MARKS SUBMIT
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
   GET CLASSES
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
   STUDENTS ENDPOINTS
----------------------------------------------------*/
app.get("/api/students/:className", async (req, res) => {
  const className = req.params.className;
  const { year, term } = req.query;

  try {
    const studentResult = await pool.query(
      `SELECT id, name, roll_number AS roll, contact
       FROM students
       WHERE class = $1 AND year = $2 AND term = $3
       ORDER BY roll_number`,
      [className, year, term]
    );

    let students = studentResult.rows;

    const markResult = await pool.query(
      `SELECT DISTINCT student_name
       FROM marks
       WHERE class_name = $1 AND year = $2 AND term = $3`,
      [className, year, term]
    );

    const markNames = markResult.rows.map((r) => r.student_name);
    const studentNames = students.map((s) => s.name);
    const missing = markNames.filter((n) => !studentNames.includes(n));

    for (const name of missing) {
      const insert = await pool.query(
        `INSERT INTO students (name, roll_number, contact, class, year, term)
         VALUES ($1, NULL, NULL, $2, $3, $4)
         RETURNING id, name, roll_number AS roll, contact`,
        [name, className, year, term]
      );

      students.push(insert.rows[0]);
    }

    students.sort((a, b) => (a.roll ?? 9999) - (b.roll ?? 9999));
    res.json(students);

  } catch (err) {
    console.error("STUDENT ERROR:", err);
    res.status(500).json({ error: "Database fetch failed" });
  }
});

app.post("/api/students", async (req, res) => {
  const { name, roll, contact, className, year, term } = req.body;

  if (!name || !className || !year || !term) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO students (name, roll_number, contact, class, year, term)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, roll_number AS roll, contact`,
      [name, roll ?? null, contact ?? null, className, year, term]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Insert student error:", err);
    res.status(500).json({ error: "Database insert failed" });
  }
});

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
  ssl: { rejectUnauthorized: false }
});

/* ---------------------------------------------------
   MIDDLEWARE
----------------------------------------------------*/
app.use(cors({
  origin: [
    "https://learningsanctuarytura.onrender.com",
    "https://tls-server.com"
  ],
  methods: ["GET", "POST"]
}));

app.use(bodyParser.json());

/* ---------------------------------------------------
   REACT ADMIN SPA
----------------------------------------------------*/
const adminPath = path.join(__dirname, "../frontend/dis");
app.use("/admin", express.static(adminPath, { index: "index.html" }));



/* ---------------------------------------------------
   TEACHER PAGES + LOGIN
----------------------------------------------------*/
const publicPath = path.join(__dirname, "../frontend/public");
app.use(express.static(publicPath));

app.get("/", (req, res) => {
  res.sendFile(path.join(publicPath, "login.html"));
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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS students (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      roll_number INT,
      contact TEXT,
      class TEXT NOT NULL,
      year TEXT,
      term TEXT
    );
  `);
}

initDB();

/* ---------------------------------------------------
   MARKS SUBMIT
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
   GET CLASSES
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
   STUDENTS ENDPOINTS
----------------------------------------------------*/
app.get("/api/students/:className", async (req, res) => {
  const className = req.params.className;
  const { year, term } = req.query;

  try {
    const studentResult = await pool.query(
      `SELECT id, name, roll_number AS roll, contact
       FROM students
       WHERE class = $1 AND year = $2 AND term = $3
       ORDER BY roll_number`,
      [className, year, term]
    );

    let students = studentResult.rows;

    const markResult = await pool.query(
      `SELECT DISTINCT student_name
       FROM marks
       WHERE class_name = $1 AND year = $2 AND term = $3`,
      [className, year, term]
    );

    const markNames = markResult.rows.map((r) => r.student_name);
    const studentNames = students.map((s) => s.name);
    const missing = markNames.filter((n) => !studentNames.includes(n));

    for (const name of missing) {
      const insert = await pool.query(
        `INSERT INTO students (name, roll_number, contact, class, year, term)
         VALUES ($1, NULL, NULL, $2, $3, $4)
         RETURNING id, name, roll_number AS roll, contact`,
        [name, className, year, term]
      );

      students.push(insert.rows[0]);
    }

    students.sort((a, b) => (a.roll ?? 9999) - (b.roll ?? 9999));
    res.json(students);

  } catch (err) {
    console.error("STUDENT ERROR:", err);
    res.status(500).json({ error: "Database fetch failed" });
  }
});

app.post("/api/students", async (req, res) => {
  const { name, roll, contact, className, year, term } = req.body;

  if (!name || !className || !year || !term) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO students (name, roll_number, contact, class, year, term)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, roll_number AS roll, contact`,
      [name, roll ?? null, contact ?? null, className, year, term]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Insert student error:", err);
    res.status(500).json({ error: "Database insert failed" });
  }
});

// --- GET: fetch all payments ---
app.get("/api/payments", async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM payments ORDER BY date DESC`);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

/* ---------------------------------------------------
   START SERVER
----------------------------------------------------*/
const PORT = process.env.PORT || 4040;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

/* ---------------------------------------------------
   START SERVER
----------------------------------------------------*/
const PORT = process.env.PORT || 4040;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
