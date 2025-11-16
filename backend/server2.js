import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parse as json2csv } from "json2csv"; // for CSV export

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 4040;

app.use(cors());
app.use(bodyParser.json());

// Serve static teacher pages
app.use(express.static(path.join(__dirname, "../frontend/public")));

// Directory for saved JSON files
const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

/**
 * POST /submit
 * Saves submitted marks to a timestamped JSON file.
 */

app.post("/submit", (req, res) => {
  console.log("POST /submit hit");
  console.log("Payload received:", req.body);

  const { className, year, term, marks } = req.body;

  // Ensure safe filenames
  const safeClass = className.replace(/\s+/g, "_");

  // ---- STEP 1: Load the latest existing file for this class ----
  const classFiles = fs.readdirSync(dataDir)
    .filter(f => f.startsWith(`marks-${safeClass}`))
    .sort();  // sorted oldest → newest

  let previousMarks = {};

  if (classFiles.length > 0) {
    const latestFile = classFiles[classFiles.length - 1];
    console.log("Merging with:", latestFile);

    const oldData = JSON.parse(
      fs.readFileSync(path.join(dataDir, latestFile), "utf-8")
    );

    previousMarks = oldData.marks || {};
  }

  // ---- STEP 2: Merge new marks into old marks ----
  const mergedMarks = { ...previousMarks };

  Object.entries(marks).forEach(([student, subjects]) => {
    if (!mergedMarks[student]) mergedMarks[student] = {};

    Object.entries(subjects).forEach(([subject, value]) => {
      if (value !== null && value !== "") {
        mergedMarks[student][subject] = value;  // overwrite only submitted fields
      }
    });
  });

  // ---- STEP 3: Save as a NEW timestamped file (your original behaviour) ----
  const fileName = `marks-${safeClass}-${Date.now()}.json`;
  const filePath = path.join(dataDir, fileName);

  const finalPayload = {
    className,
    year,
    term,
    marks: mergedMarks
  };

  fs.writeFileSync(filePath, JSON.stringify(finalPayload, null, 2));

  console.log("✅ Data merged and saved:", filePath);

  res.json({ message: "Data merged + saved successfully" });
});



app.get("/api/classes", (req, res) => {
  const files = fs.readdirSync(dataDir).filter(f => f.endsWith(".json"));

  const allClasses = files.map(f => {
    const content = fs.readFileSync(path.join(dataDir, f));
    return JSON.parse(content);
  });

  // Only keep latest entry per class (optional)
  const latestByClass = {};
  allClasses.forEach(cls => {
    latestByClass[cls.className] = cls;
  });

  res.json(Object.values(latestByClass));
});


app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
