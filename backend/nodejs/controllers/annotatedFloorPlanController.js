const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDir = path.join(__dirname, "../../uploads/annotated-floor-plans");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const floor = req.params.floor || "unknown";
    const match = file.originalname.match(
      /^annotated_floor\d+_(.+?)_\d+\.png$/,
    );
    const wing = match ? match[1] : "unknown";
    cb(null, `annotated_floor${floor}_${wing}.png`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = ["image/png", "image/jpeg", "image/jpg"];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only PNG and JPEG images are allowed"));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter,
}).single("annotated_image");

const saveAnnotatedFloorPlan = (req, res) => {
  upload(req, res, (err) => {
    if (err) {
      console.error("Annotated floor plan upload error:", err);
      return res.status(400).json({
        success: false,
        message: err.message || "Upload failed",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image file provided",
      });
    }

    const isProduction = process.env.NODE_ENV === "production";
    const baseUrl = isProduction
      ? "https://api.lockr.fit"
      : `http://localhost:5000`;

    const relativePath = `annotated-floor-plans/${req.file.filename}`;
    const imageUrl = `${baseUrl}/uploads/${relativePath}`;

    return res.json({
      success: true,
      message: "Annotated floor plan saved successfully",
      data: {
        filePath: relativePath,
        imageUrl,
        filename: req.file.filename,
      },
    });
  });
};

module.exports = { saveAnnotatedFloorPlan };
