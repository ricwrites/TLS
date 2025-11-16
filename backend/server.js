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

  const payload = {
    className: req.body.className || "Nursery",  // or read from hidden input
    year: req.body.year || "2025",
    term: req.body.term || "2",
    marks: req.body  // all the student marks
  };

  const safeClassName = payload.className.replace(/\s+/g, "_");
  const fileName = `marks-${safeClassName}-${Date.now()}.json`;
  const filePath = path.join(dataDir, fileName);

  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
  console.log("✅ Data saved:", filePath);

  res.json({ message: "Data saved successfully" });
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
