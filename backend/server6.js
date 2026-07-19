import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import pg from "pg";
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from "multer";
import cloudinary from "./cloudinary.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const upload = multer({ dest: "uploads/" });

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
    "https://tls-server.com",
    "http://localhost:5173",
    "http://localhost:5174",
    "https://tlsweb.onrender.com",
    "https://thelearningsanctuary.quest",
    "https://admin.thelearningsanctuary.quest",
    "https://teacher.thelearningsanctuary.quest",
    "https://tlsmarks.onrender.com",
  ],
  methods: ["GET", "POST","PATCH","PUT", "DELETE"],
  credentials: true
}));

app.use(bodyParser.json());
app.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.url}`);
  next();
});

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
// Events table

await pool.query(`
  CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    title TEXT,
    description TEXT,
    date DATE,
    images TEXT[]
  );
`);

await pool.query(`
  CREATE TABLE IF NOT EXISTS event_notes (
    id SERIAL PRIMARY KEY,
    event_id INT REFERENCES events(id) ON DELETE CASCADE,
    text TEXT
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

//Newsletter table
// NEWSLETTER ISSUES
await pool.query(`
  CREATE TABLE IF NOT EXISTS newsletter_issues (
    id SERIAL PRIMARY KEY,
    month TEXT NOT NULL,
    year TEXT NOT NULL,
    published BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
  );
`);

// NEWSLETTER ITEMS
await pool.query(`
  CREATE TABLE IF NOT EXISTS newsletter_items (
    id SERIAL PRIMARY KEY,
    issue_id INT REFERENCES newsletter_issues(id) ON DELETE CASCADE,
    type TEXT,
    title TEXT,
    content TEXT,
    author TEXT NOT NULL,
    role TEXT NOT NULL,
    images TEXT[],
    created_at TIMESTAMP DEFAULT NOW()
  );
`);

await pool.query(`
  ALTER TABLE newsletter_items
  ADD COLUMN IF NOT EXISTS images TEXT[];
`);

await pool.query(`
ALTER TABLE newsletter_items
ADD COLUMN IF NOT EXISTS order_index INT DEFAULT 0;
`);

await pool.query(`
  ALTER TABLE newsletter_issues
  ADD COLUMN IF NOT EXISTS order_index INT DEFAULT 0;
`);

await pool.query(`
  ALTER TABLE events
  ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'event';
`);

await pool.query(`
  ALTER TABLE events
  ADD COLUMN IF NOT EXISTS published BOOLEAN DEFAULT false;
`);

await pool.query(`
ALTER TABLE events
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'event';
`)

await pool.query(`
ALTER TABLE newsletter_issues
ADD COLUMN IF NOT EXISTS content JSONB;
`)

await pool.query(`
ALTER TABLE newsletter_issues
ADD COLUMN IF NOT EXISTS uuid UUID;
`)



await pool.query(`ALTER TABLE newsletter_issues ADD COLUMN IF NOT EXISTS layout JSONB DEFAULT '[]';`);
await pool.query(`ALTER TABLE newsletter_issues ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '{}'::JSONB;`);
await pool.query(`ALTER TABLE newsletter_issues ADD COLUMN IF NOT EXISTS theme JSONB DEFAULT '{"primary":"#2c3e50","secondary":"#f4f4f4","accent":"#f39c12"}'::JSONB;`);
await pool.query(`ALTER TABLE newsletter_issues ADD COLUMN IF NOT EXISTS headerStyle JSONB DEFAULT '{"bold":true,"italic":false,"fontFamily":"Georgia","fontSize":32,"color":"#ffffff"}'::JSONB;`);


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
app.get("/api/students/:className", async (req, res) => {
  const className = decodeURIComponent(req.params.className);
  const { year, term } = req.query;

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

    let students = studentResult.rows;

    const markResult = await pool.query(
      `SELECT DISTINCT student_name
       FROM marks
       WHERE class_name = $1 AND year = $2 AND term = $3`,
      [className, year, term]
    );

    const markNames = markResult.rows.map(r => r.student_name);
    const studentNames = students.map(s => s.name);

    const missing = markNames.filter(n => !studentNames.includes(n));

    for (const name of missing) {
      const insert = await pool.query(
        `INSERT INTO students (name, roll_number, contact, address, class_name, year, term)
         VALUES ($1, NULL, NULL, NULL, $2, $3, $4)
         RETURNING id, name, roll_number AS roll, contact, address,
                   dob, blood_type, mother_name, father_name`,
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


// Route for multiple images
app.post("/api/events", upload.array("images"), async (req, res) => {
  const { title, description, date } = req.body;

  try {
    // Upload ALL images to Cloudinary
    const files = req.files || [];

const uploadPromises = files.map(file =>
  cloudinary.uploader.upload(file.path, {
    folder: "events"
  })
);
const results = await Promise.all(uploadPromises);

// cleanup temp files
files.forEach(file => fs.unlinkSync(file.path));

    // Extract URLs
    const imageUrls = results.map(r => r.secure_url);

    await pool.query(
      `INSERT INTO events (title, description, date, images, type, published)
       VALUES ($1,$2,$3,$4,'event',true)`,
      [title, description, date, imageUrls]
    );

    // Return updated events (same as your existing logic)
    const eventsResult = await pool.query(`
      SELECT * FROM events ORDER BY date DESC
    `);

    const notesResult = await pool.query(`
      SELECT * FROM event_notes
    `);

    const events = eventsResult.rows.map(event => ({
      ...event,
      notes: notesResult.rows
        .filter(n => n.event_id === event.id)
        .map(n => ({ id: n.id, text: n.text }))
    }));

    res.json(events);

  } catch (err) {
    console.error("Event insert error:", err);
    res.status(500).json({ error: "Event creation failed" });
  }
});

app.post("/api/events/:id/notes", async (req, res) => {
  const { id } = req.params;
  const { text } = req.body;

  try {
    await pool.query(
      `INSERT INTO event_notes (event_id, text)
       VALUES ($1,$2)`,
      [id, text]
    );

    const eventResult = await pool.query(
      `SELECT * FROM events WHERE id=$1`,
      [id]
    );

    const notesResult = await pool.query(
      `SELECT * FROM event_notes WHERE event_id=$1`,
      [id]
    );

    const event = {
      ...eventResult.rows[0],
      notes: notesResult.rows.map(n => ({
        id: n.id,
        text: n.text
      }))
    };

    res.json(event);

  } catch (err) {
    console.error("Insert note error:", err);
    res.status(500).json({ error: "Note creation failed" });
  }
});

app.use("/api/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/api/events", async (req, res) => {
  try {
    const eventsResult = await pool.query(`
      SELECT * FROM events
WHERE type = 'event'
AND published = true
ORDER BY date DESC
    `);

    const notesResult = await pool.query(`
      SELECT * FROM event_notes
    `);

    const events = eventsResult.rows.map(event => ({
      ...event,
      notes: notesResult.rows
        .filter(n => n.event_id === event.id)
        .map(n => ({ id: n.id, text: n.text }))
    }));

    res.json(events);
  } catch (err) {
    console.error("Fetch events error:", err);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

app.delete("/api/events/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query(
      `DELETE FROM events WHERE id=$1`,
      [id]
    );

    // Return updated event list
    const eventsResult = await pool.query(`
      SELECT * FROM events ORDER BY date DESC
    `);

    const notesResult = await pool.query(`
      SELECT * FROM event_notes
    `);

    const events = eventsResult.rows.map(event => ({
      ...event,
      notes: notesResult.rows
        .filter(n => n.event_id === event.id)
        .map(n => ({ id: n.id, text: n.text }))
    }));

    res.json(events);

  } catch (err) {
    console.error("Delete event error:", err);
    res.status(500).json({ error: "Event deletion failed" });
  }
});


/* ---------------------------------------------------
   ACCOUNTS
----------------------------------------------------*/

app.get("/api/student-payments/all", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM student_payments ORDER BY date ASC
    `);

    res.json(result.rows.map(p => ({
      id: p.id,
      date: p.date ? p.date.toISOString().split("T")[0] : null,
      paymentType: p.payment_type,
      amount: Number(p.amount)
    })));

  } catch (err) {
    console.error("Fetch all student payments error:", err);
    res.status(500).json({ error: "Database fetch failed" });
  }
});


app.get("/api/salary/all", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM salary_payments ORDER BY date ASC
    `);

    res.json(result.rows.map(p => ({
      id: p.id,
      staff_name: p.staff_name,
      date: p.date ? p.date.toISOString().split("T")[0] : null,
      month: p.month,
      amount: Number(p.amount)
    })));

  } catch (err) {
    console.error("Fetch all salary payments error:", err);
    res.status(500).json({ error: "Database fetch failed" });
  }
});



/* ---------------------------------------------------
   STUDENT PAYMENTS
----------------------------------------------------*/
app.get("/api/student-payments/:studentId", async (req, res) => {
  const { studentId } = req.params;

  try {
    const result = await pool.query(
      `SELECT * FROM student_payments WHERE student_id=$1 ORDER BY date DESC`,
      [studentId]
    );

    res.json(result.rows.map(p => ({
      id: p.id,
      studentId: p.student_id,
      date: p.date ? p.date.toISOString().split("T")[0] : null,
      paymentMethod: p.payment_method,
      paymentType: p.payment_type,
      amount: Number(p.amount),
      year: p.year,
      term: p.term
    })));
  } catch (err) {
    console.error("Fetch student payments error:", err);
    res.status(500).json({ error: "Database fetch failed", message: err.message });
  }
});

// POST /api/student-payments
app.post("/api/student-payments", async (req, res) => {
  const { studentId, date, paymentMethod, paymentType, amount, year, term } = req.body;

  try {
    await pool.query(
      `INSERT INTO student_payments
       (student_id, date, payment_method, payment_type, amount, year, term)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [studentId, date, paymentMethod, paymentType, amount, year, term]
    );

    // Fetch all payments for the student to display immediately
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

    res.json({ studentId, payments }); // send back full payments for immediate table update
  } catch (err) {
    console.error("Insert student payment error:", err);
    res.status(500).json({ error: "Database insert failed", message: err.message });
  }
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

app.get("/api/newsletter/issues", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM newsletter_issues ORDER BY order_index ASC`
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Fetch newsletter issues error:", err);
    res.status(500).json({ error: "Database fetch failed" });
  }
});

app.get("/api/newsletter/published", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM newsletter_issues
       WHERE published = true
       ORDER BY year DESC, month DESC`
    );

    // Helper to safely parse JSON or fallback
    function safeParse(json, fallback) {
      if (!json) return fallback;
      try {
        return JSON.parse(json);
      } catch (err) {
        console.warn("Failed to parse JSON, using fallback:", json);
        return fallback;
      }
    }

    const normalized = result.rows.map(issue => {
      const layout = safeParse(issue.layout, []);
      const items = safeParse(issue.items, {});
      const theme = safeParse(issue.theme, { primary: "#2c3e50", secondary: "#f4f4f4", accent: "#f39c12" });
      const headerStyle = safeParse(issue.headerStyle, { bold: true, italic: false, fontFamily: "Georgia", fontSize: 32, color: "#ffffff" });

      return {
        id: issue.id,
        month: issue.month,
        year: issue.year,
        theme,
        headerStyle,
        layout: layout.map(row => ({
          ...row,
          style: safeParse(row.style, { margin: "0", padding: "0", border: "none", borderRadius: "0px", backgroundColor: "#ffffff" }),
          columns: (row.columns || []).map(col => ({
            ...col,
            style: safeParse(col.style, { margin: "0", padding: "0", border: "none", borderRadius: "0px", backgroundColor: "#ffffff" })
          }))
        })),
        items: Object.fromEntries(
          Object.entries(items).map(([id, item]) => [
            id,
            {
              ...item,
              style: safeParse(item.style, { margin: "0", padding: "0", border: "none", borderRadius: "0px", backgroundColor: "#ffffff", fontFamily: "Arial", fontSize: 16, color: "#000", bold: false, italic: false })
            }
          ])
        )
      };
    });

    // ✅ Send the response
    res.json(normalized);

  } catch (err) {
    console.error("Fetch published issues error:", err);
    res.status(500).json({ error: "Database fetch failed" });
  }
});

app.post("/api/newsletter/issues", async (req, res) => {
  const { month, year } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO newsletter_issues (month, year)
       VALUES ($1,$2)
       RETURNING *`,
      [month, year]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Create issue error:", err);
    res.status(500).json({ error: "Insert failed" });
  }
});

function safeParse(json, fallback) {
  if (!json) return fallback;
  try {
    return JSON.parse(json);
  } catch (err) {
    console.warn("Failed to parse JSON, using fallback:", json);
    return fallback;
  }
}


app.get("/api/newsletter/:issueId", async (req, res) => {
  const { issueId } = req.params;

  try {
    const issueResult = await pool.query(
      `SELECT * FROM newsletter_issues WHERE id = $1`,
      [issueId]
    );

    if (issueResult.rows.length === 0) {
      return res.status(404).json({ error: "Issue not found" });
    }

    const issue = issueResult.rows[0];

    // ✅ THIS IS THE KEY FIX
    const content = issue.content || {};

    res.json({
      id: issue.id,
      month: issue.month,
      year: issue.year,
      published: issue.published,

      layout: content.layout || [],
      items: content.items || {},
      theme: content.theme || {},
      headerStyle: content.headerStyle || {}
    });

  } catch (err) {
    console.error("Fetch issue error:", err);
    res.status(500).json({ error: "Server error" });
  }
});
//display author



// Express.js example
app.delete("/api/newsletter/:issueId/items/:itemId", async (req, res) => {
  const { issueId, itemId } = req.params;

  try {
    const result = await pool.query(
      `DELETE FROM newsletter_items
       WHERE id = $1 AND issue_id = $2
       RETURNING *`,
      [itemId, issueId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Item not found" });
    }

    res.json({ success: true });

  } catch (err) {
    console.error("Delete newsletter item error:", err);
    res.status(500).json({ error: "Delete failed" });
  }
});


// backend/routes/newsletter.js
app.patch("/api/newsletter/:issueId/items/reorder", async (req, res) => {
  const { issueId } = req.params;
  const { itemOrder } = req.body;

  if (!Array.isArray(itemOrder)) {
    return res.status(400).json({ error: "itemOrder must be an array" });
  }

  try {
    await Promise.all(
      itemOrder.map((itemId, index) =>
        pool.query(
          `UPDATE newsletter_items
           SET order_index = $1
           WHERE id = $2 AND issue_id = $3`,
          [index, itemId, issueId]
        )
      )
    );

    res.json({ success: true });

  } catch (err) {
    console.error("Reorder error:", err);
    res.status(500).json({ error: "Failed to reorder items" });
  }
});

app.delete("/api/newsletter/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "DELETE FROM newsletter_issues WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Issue not found" });
    }

    res.json({ success: true });

  } catch (err) {
    console.error("Delete newsletter error:", err);
    res.status(500).json({ error: "Server error" });
  }
});


/* =========================
   GET ALL ISSUES
========================= */



async function publishIssueHandler(req, res) {
  const { issueId } = req.params;

  try {
    const result = await pool.query(
      `UPDATE newsletter_issues
       SET published = true
       WHERE id = $1
       RETURNING *`,
      [issueId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Issue not found" });
    }

    res.json(result.rows[0]);

  } catch (err) {
    console.error("Publish issue error:", err);
    res.status(500).json({ error: "Publish failed" });
  }
}

app.post(
  "/api/newsletter/:issueId/items",
  upload.array("images"),
  async (req, res) => {
    const { issueId } = req.params;
    const { type, title, content, author, role } = req.body;

    try {
      let imageUrls = [];

      if (req.files && req.files.length > 0) {
        const uploads = await Promise.all(
          req.files.map(file =>
            cloudinary.uploader.upload(file.path, {
              folder: "newsletter"
            })
          )
        );

        imageUrls = uploads.map(r => r.secure_url);

        // cleanup
        req.files.forEach(file => fs.unlinkSync(file.path));
      }

      const result = await pool.query(
        `INSERT INTO newsletter_items
         (issue_id, type, title, content, author, role, images)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         RETURNING *`,
        [issueId, type, title, content, author, role, imageUrls]
      );

      res.status(201).json(result.rows[0]);

    } catch (err) {
      console.error("Insert newsletter item error:", err);
      res.status(500).json({ error: "Insert failed" });
    }
  }
);


// 👇 PUT + POST (place directly under the function)
app.put("/api/newsletter/:issueId/publish", publishIssueHandler);
app.post("/api/newsletter/:issueId/publish", publishIssueHandler);

app.get("/api/newsletter/author/:name", async (req, res) => {
  const { name } = req.params;

  try {
    const result = await pool.query(
      `SELECT ni.*, ni2.month, ni2.year
       FROM newsletter_items ni
       JOIN newsletter_issues ni2
         ON ni.issue_id = ni2.id
       WHERE ni.author = $1
       AND ni2.published = true
       ORDER BY ni2.year DESC`,
      [name]
    );

    res.json(result.rows);

  } catch (err) {
    console.error("Author fetch error:", err);
    res.status(500).json({ error: "Database fetch failed" });
  }
});

app.patch("/api/newsletter/:issueId", async (req, res) => {
  const { issueId } = req.params;

  const fullIssue = req.body; // entire builder object

  try {
    const result = await pool.query(
      `UPDATE newsletter_issues
       SET content = $1
       WHERE id = $2
       RETURNING *`,
      [fullIssue, issueId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Save newsletter error:", err);
    res.status(500).json({ error: "Save failed" });
  }
});

// GET all events for a year
app.get("/api/admin/calendar/:year", async (req, res) => {
  const { year } = req.params;
  try {
    const result = await pool.query(
      `SELECT id, title, description, date, type, published
       FROM events
       WHERE EXTRACT(YEAR FROM date) = $1
       ORDER BY date ASC`,
      [year]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Fetch calendar events error:", err);
    res.status(500).json({ error: "Database fetch failed" });
  }
});

app.get("/api/calendar/years", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT EXTRACT(YEAR FROM date) AS year
      FROM events
      WHERE type = 'calendar-entry'
      ORDER BY EXTRACT(YEAR FROM date) DESC
    `);

    const years = result.rows.map(row => Number(row.year));
    res.json(years);

  } catch (err) {
    console.error("Fetch years error:", err);
    res.status(500).json({ error: "Database fetch failed" });
  }
});

// POST a new event (no images required)
app.post("/api/calendar", async (req, res) => {
  const { title, description, date, type, published, category } = req.body;

  if (!title || !date) {
    return res.status(400).json({ error: "Title and date are required" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO events (title, description, date, type, published, category)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [
        title,
        description || "",
        date,
        type || "event",
        published ?? false,
        category || "event"
      ]
    );

    res.status(201).json(result.rows[0]);

  } catch (err) {
    console.error("Insert calendar event error:", err);
    res.status(500).json({ error: "Database insert failed" });
  }
});

// Optional: DELETE an event
app.delete("/api/calendar/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(`DELETE FROM events WHERE id=$1`, [id]);
    res.json({ success: true });
  } catch (err) {
    console.error("Delete calendar event error:", err);
    res.status(500).json({ error: "Database delete failed" });
  }
});


//Calendar entries

app.get("/api/calendar/:year", async (req, res) => {
  const { year } = req.params;

  try {
    const result = await pool.query(
      `SELECT id, title, description, date, type, published, category
       FROM events
       WHERE EXTRACT(YEAR FROM date) = $1
       AND (type = 'calendar-entry' OR published = true)
       ORDER BY date ASC`,
      [year]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database fetch failed" });
  }
});

app.put("/api/admin/calendar/:id/publish", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `UPDATE events
       SET published = NOT published
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Publish toggle error:", err);
    res.status(500).json({ error: "Publish toggle failed" });
  }
});

/* ---------------------------------------------------
   START SERVER
----------------------------------------------------*/
const PORT = process.env.PORT || 4040;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

