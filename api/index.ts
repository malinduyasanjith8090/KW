import express from "express";
import path from "path";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import cors from "cors";
import mongoose from "mongoose";
import fs from "fs";

// --- MongoDB Models ---
const settingsSchema = new mongoose.Schema({
  donationEmail: { type: String, default: "" },
  categories: { type: [String], default: [] }
});
// Avoid OverwriteModelError in serverless environments
const SettingsModel = mongoose.models.Settings || mongoose.model<any>("Settings", settingsSchema);

const photoSchema = new mongoose.Schema({
  id: { type: String, required: true },
  url: { type: String, required: true },
  type: { type: String, required: true }
});

const albumSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, default: "New Album" },
  category: { type: String, default: "" },
  price: { type: Number, default: 0 },
  coverImage: { type: String, default: "" },
  code: { type: String, default: "0000" },
  photos: [photoSchema]
});
const AlbumModel = mongoose.models.Album || mongoose.model<any>("Album", albumSchema);

const app = express();
app.use(cors());
app.use(express.json());

// For Vercel Serverless, use /tmp for uploads. Note: files are not persistent across serverless invocations.
const uploadsDir = process.env.VERCEL ? "/tmp/uploads" : path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use("/uploads", express.static(uploadsDir));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});
const upload = multer({ storage: storage });

let isConnected = false;
async function connectDB() {
  if (isConnected) return;
  mongoose.set('bufferCommands', false);
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.warn("MONGO_URI not set.");
    return;
  }
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    isConnected = true;
    console.log("Connected to MongoDB successfully");
    
    const settingsCount = await SettingsModel.countDocuments();
    if (settingsCount === 0) {
      await SettingsModel.create({
        donationEmail: "yasanjithmalindu@gmail.com",
        categories: ["Spicy", "Spicy Unlimited"]
      });
    }
  } catch (error) {
    console.error("MongoDB connection error:", error);
  }
}

// Connect DB on every request in serverless
app.use(async (req, res, next) => {
  await connectDB();
  next();
});

const checkDB = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: "MongoDB not connected. Please set MONGO_URI in Secrets." });
  }
  next();
};

// Get all data
app.get("/api/data", checkDB, async (req, res) => {
  try {
    const albums = await AlbumModel.find({}, { _id: 0, __v: 0 }).lean();
    let settingsDoc = await SettingsModel.findOne().lean();
    
    const donationEmail = settingsDoc?.donationEmail || "";
    const categories = settingsDoc?.categories || [];
    
    res.json({
      albums: albums || [],
      settings: { donationEmail },
      categories: categories
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Database error" });
  }
});

// Update settings and categories
app.put("/api/settings", checkDB, async (req, res) => {
  try {
    let settingsDoc = await SettingsModel.findOne();
    if (!settingsDoc) {
      settingsDoc = new SettingsModel();
    }
    if (req.body.settings?.donationEmail !== undefined) {
      settingsDoc.donationEmail = req.body.settings.donationEmail;
    }
    if (req.body.categories !== undefined) {
      settingsDoc.categories = req.body.categories;
    }
    await settingsDoc.save();
    
    res.json({
      settings: { donationEmail: settingsDoc.donationEmail },
      categories: settingsDoc.categories
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Database error" });
  }
});

// Create Album
app.post("/api/albums", checkDB, async (req, res) => {
  try {
    const newAlbum = new AlbumModel({
      id: uuidv4(),
      title: req.body.title || "New Album",
      category: req.body.category || "Spicy",
      price: req.body.price || 30,
      coverImage: req.body.coverImage || "",
      code: req.body.code || "0000",
      photos: []
    });
    await newAlbum.save();
    
    const savedAlbum = await AlbumModel.findOne({ id: newAlbum.id }, { _id: 0, __v: 0 }).lean();
    res.json(savedAlbum);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Database error" });
  }
});

// Update Album
app.put("/api/albums/:id", checkDB, async (req, res) => {
  try {
    const updatedAlbum = await AlbumModel.findOneAndUpdate(
      { id: req.params.id },
      { $set: req.body },
      { new: true, projection: { _id: 0, __v: 0 } }
    ).lean();
    
    if (updatedAlbum) {
      res.json(updatedAlbum);
    } else {
      res.status(404).json({ error: "Album not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Database error" });
  }
});

// Delete Album
app.delete("/api/albums/:id", checkDB, async (req, res) => {
  try {
    const result = await AlbumModel.deleteOne({ id: req.params.id });
    if (result.deletedCount > 0) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Album not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Database error" });
  }
});

// Add Photo to Album
app.post("/api/albums/:id/photos", upload.single("file"), checkDB, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  
  try {
    const newPhoto = {
      id: uuidv4(),
      url: `/uploads/${req.file.filename}`,
      type: req.file.mimetype.startsWith('video/') ? 'video' : 'image'
    };
    
    const updatedAlbum = await AlbumModel.findOneAndUpdate(
      { id: req.params.id },
      { $push: { photos: newPhoto } },
      { new: true }
    );
    
    if (updatedAlbum) {
      res.json(newPhoto);
    } else {
      res.status(404).json({ error: "Album not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Database error" });
  }
});

// Delete Photo
app.delete("/api/albums/:id/photos/:photoId", checkDB, async (req, res) => {
  try {
    const updatedAlbum = await AlbumModel.findOneAndUpdate(
      { id: req.params.id },
      { $pull: { photos: { id: req.params.photoId } } },
      { new: true }
    );
    
    if (updatedAlbum) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Album not found" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Database error" });
  }
});

// General File Upload (for cover image etc)
app.post("/api/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  res.json({ url: `/uploads/${req.file.filename}` });
});

export default app;
