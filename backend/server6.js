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

const usersPath = path.join(__dirname, 'users.json');
const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));

const { Pool } = pg;

// Render will inject DATABASE_URL as an environment variable
const pool = new Pool({
  connectionString: process.env.DB_URL,
  ssl: { rejectUnauthorized: false }
});


const PORT = process.env.PORT || 4040;

app.use(cors());
app.use(bodyParser.json());

/* ---------------------------------------------
   Create tables if they don't exist
------------------------------------------------*/
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


app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/login.html'));
});
//For static HTML pages
app.use(express.static(path.join(__dirname, '../frontend/public')));



app.post('/login', (req, res) => {
  const { username, password } = req.body;

  const user = users.find(u => u.username === username && u.password === password);

  if (user) {
    res.json({ role: user.role });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});


/* ---------------------------------------------
   POST /submit  (MERGE like your JSON version)
------------------------------------------------*/
app.post("/submit", async (req, res) => {
  console.log("POST /submit hit");
  const { className, year, term, marks } = req.body;

  try {
    // For each student + each subject
    for (const [student, subjects] of Object.entries(marks)) {
      for (const [subject, score] of Object.entries(subjects)) {
        if (!score) continue;

        // Check if exists
        const result = await pool.query(
          `SELECT id FROM marks
           WHERE class_name=$1 AND year=$2 AND term=$3
           AND student_name=$4 AND subject=$5`,
          [className, year, term, student, subject]
        );

        if (result.rows.length > 0) {
          // Update
          await pool.query(
            `UPDATE marks
             SET score=$1, updated_at=NOW()
             WHERE id=$2`,
            [score, result.rows[0].id]
          );
        } else {
          // Insert
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



/* ---------------------------------------------
   GET /api/classes  (returns JSON identical to before)
------------------------------------------------*/
app.get("/api/classes", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM marks");

    const grouped = {};

    result.rows.forEach(row => {
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

app.use((req, res, next) => {
  console.log('Requested URL:', req.url);
  next();
});


app.use('/admin', express.static(path.join(__dirname, '../frontend/dis')));

app.get('/admin/:path(*)', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dis/index.html'));
});



// Example using Express + PostgreSQL
app.get('/api/students/:className', async (req, res) => {
  const className = req.params.className;
  const { year, term } = req.query;

  try {
    // 1️⃣ Fetch student records from students table
    const studentResult = await pool.query(
      `SELECT id, name, roll_number AS roll, contact
       FROM students
       WHERE class = $1 AND year = $2 AND term = $3
       ORDER BY roll_number`,
      [className, year, term]
    );

    let students = studentResult.rows;

    // 2️⃣ Fetch student names from marks table (unique)
    const markResult = await pool.query(
      `SELECT DISTINCT student_name
       FROM marks
       WHERE class_name = $1 AND year = $2 AND term = $3`,
      [className, year, term]
    );

    const markNames = markResult.rows.map(r => r.student_name);

    // 3️⃣ Find names missing in students table
    const studentNames = students.map(s => s.name);
    const missingNames = markNames.filter(n => !studentNames.includes(n));

    // 4️⃣ Auto-insert missing names into students table
    for (const name of missingNames) {
      const insert = await pool.query(
        `INSERT INTO students (name, roll_number, contact, class, year, term)
         VALUES ($1, NULL, NULL, $2, $3, $4)
         RETURNING id, name, roll_number AS roll, contact`,
        [name, className, year, term]
      );

      students.push(insert.rows[0]);
    }

    // 5️⃣ Return merged + sorted list
    students.sort((a, b) => (a.roll ?? 9999) - (b.roll ?? 9999));

    res.json(students);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database fetch failed' });
  }
});

app.post('/api/students', async (req, res) => {
  const { name, roll, contact, className, year, term } = req.body;

  if (!name || !className || !year || !term) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO students (name, roll_number, contact, class, year, term)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, roll_number AS roll, contact`,
      [name, roll || null, contact || null, className, year, term]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Insert student error:", err);
    res.status(500).json({ error: "Database insert failed" });
  }
});



/* --------------------------------------------- */

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

