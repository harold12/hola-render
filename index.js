// index.js
const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");

const app = express();
const UPLOAD_DIR = path.join(__dirname, "uploads");

// Asegurar carpeta uploads
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Config multer: nombre de archivo único y validación
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeBase = uuidv4(); // evita problemas con nombres
    cb(null, `${safeBase}${ext}`);
  },
});

// Validaciones: tipos permitidos y límite de tamaño (ej: 8MB)
const ALLOWED_MIMES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
];

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Tipo de archivo no permitido"));
  },
});

// Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use("/uploads", express.static(UPLOAD_DIR)); // servir archivos subidos

// RUTA: formulario (puedes servir un archivo estático o renderizar)
app.get("/", (req, res) => {
  // puedes guardar este HTML en un archivo y usar res.sendFile
  res.sendFile(path.join(__dirname, "form.html"));
});

// RUTA: recibir 1 archivo con campo 'documento'. Para múltiples: .array('documento', N)
app.post("/upload", upload.single("documento"), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ ok: false, error: "No se envió archivo" });

    // Metadata que quieras guardar
    const metadata = {
      originalName: req.file.originalname,
      storedName: req.file.filename,
      sizeBytes: req.file.size,
      mimeType: req.file.mimetype,
      url: `/uploads/${req.file.filename}`,
      uploadedAt: new Date().toISOString(),
      requesterName: req.body.name || null, // ejemplo de campos extra
      requesterEmail: req.body.email || null,
    };

    // Opcional: persistir metadata en un JSON (append)
    const metaPath = path.join(__dirname, "uploads", "metadata.json");
    let arr = [];
    if (fs.existsSync(metaPath)) {
      try { arr = JSON.parse(fs.readFileSync(metaPath, "utf8") || "[]"); } catch(e){}
    }
    arr.push(metadata);
    fs.writeFileSync(metaPath, JSON.stringify(arr, null, 2));

    return res.status(201).json({ ok: true, metadata });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: err.message || "Error interno" });
  }
});

// Manejo de errores de multer
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // errores de multer (limite tamaño, etc.)
    return res.status(400).json({ ok: false, error: err.message });
  } else if (err) {
    return res.status(400).json({ ok: false, error: err.message });
  }
  next();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));
