import express from "express";
import path from "path";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import cors from "cors";
import mongoose from "mongoose";
import fs from "fs";
import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";

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

// Ensure local uploads directory exists for fallback
const localUploadsDir = path.join(process.cwd(), "uploads");
if (!process.env.VERCEL && !fs.existsSync(localUploadsDir)) {
  fs.mkdirSync(localUploadsDir, { recursive: true });
}
app.use("/uploads", express.static(localUploadsDir));
if (process.env.VERCEL) {
  app.use("/uploads", express.static("/tmp/uploads"));
}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB limit

const uploadBuffer = async (buffer: Buffer, mimetype: string): Promise<string> => {
  if (process.env.CLOUDINARY_URL) {
    const resourceType = mimetype.startsWith("video/") ? "video" : "image";
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { resource_type: resourceType, folder: "gallery" },
        (error, result) => {
          if (error) reject(error);
          else resolve(result!.secure_url);
        }
      );
      Readable.from(buffer).pipe(uploadStream);
    });
  } else {
    if (process.env.VERCEL) {
      throw new Error("CLOUDINARY_URL secret is required for file uploads on Vercel.");
    }
    // Local fallback
    const ext = mimetype.split('/')[1] || 'bin';
    const filename = `${uuidv4()}.${ext.replace('+', '')}`;
    const uploadsDir = localUploadsDir;
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, buffer);
    return `/uploads/${filename}`;
  }
};

let cached = (global as any).mongoose;
if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.warn("MONGO_URI not set.");
    return;
  }
  
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise || mongoose.connection.readyState !== 1) {
    mongoose.set('bufferCommands', false);
    cached.promise = mongoose.connect(uri, { serverSelectionTimeoutMS: 5000, socketTimeoutMS: 45000 }).then((mongooseInstance) => {
      console.log("Connected to MongoDB successfully");
      return mongooseInstance;
    }).catch(err => {
      cached.promise = null;
      throw err;
    });
  }
  
  try {
    cached.conn = await cached.promise;
    
    // Initialize default settings if none exist
    try {
      const settingsCount = await SettingsModel.countDocuments();
      if (settingsCount === 0) {
        await SettingsModel.create({
          donationEmail: "yasanjithmalindu@gmail.com",
          categories: ["Spicy", "Spicy Unlimited"]
        });
      }
    } catch (err) {
      console.error("Error seeding default settings:", err);
    }
    
  } catch (e) {
    cached.promise = null;
    console.error("MongoDB connection error:", e);
    throw e;
  }
  return cached.conn;
}

// Connect DB on every request in serverless
app.use(async (req, res, next) => {
  try {
    if (process.env.MONGO_URI) {
      await connectDB();
    }
    next();
  } catch (error) {
    res.status(503).json({ error: "Database Connection Error. The server is currently unavailable." });
  }
});

const checkDB = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (mongoose.connection.readyState !== 1 && mongoose.connection.readyState !== 2) {
    return res.status(503).json({ error: "MongoDB not connected. Please set MONGO_URI in Secrets." });
  }
  next();
};

const router = express.Router();

// Get all data
router.get("/data", checkDB, async (req, res) => {
  try {
    const albums = await AlbumModel.find({} as any, { _id: 0, __v: 0 }).lean();
    let settingsDoc = await SettingsModel.findOne({} as any).lean();
    
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
router.put("/settings", checkDB, async (req, res) => {
  try {
    let settingsDoc = await SettingsModel.findOne({} as any);
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
router.post("/albums", checkDB, async (req, res) => {
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
    
    const savedAlbum = await AlbumModel.findOne({ id: newAlbum.id } as any, { _id: 0, __v: 0 }).lean();
    res.json(savedAlbum);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Database error" });
  }
});

// Update Album
router.put("/albums/:id", checkDB, async (req, res) => {
  try {
    const updatedAlbum = await AlbumModel.findOneAndUpdate(
      { id: req.params.id } as any,
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
router.delete("/albums/:id", checkDB, async (req, res) => {
  try {
    const result = await AlbumModel.deleteOne({ id: req.params.id } as any);
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
router.post("/albums/:id/photos", upload.single("file"), checkDB, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  
  try {
    const fileUrl = await uploadBuffer(req.file.buffer, req.file.mimetype);
    
    const newPhoto = {
      id: uuidv4(),
      url: fileUrl,
      type: req.file.mimetype.startsWith('video/') ? 'video' : 'image'
    };
    
    const updatedAlbum = await AlbumModel.findOneAndUpdate(
      { id: req.params.id } as any,
      { $push: { photos: newPhoto } },
      { new: true }
    );
    
    if (updatedAlbum) {
      res.json(newPhoto);
    } else {
      res.status(404).json({ error: "Album not found" });
    }
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || "Database error" });
  }
});

// Delete Photo
router.delete("/albums/:id/photos/:photoId", checkDB, async (req, res) => {
  try {
    const updatedAlbum = await AlbumModel.findOneAndUpdate(
      { id: req.params.id } as any,
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
router.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  try {
    const fileUrl = await uploadBuffer(req.file.buffer, req.file.mimetype);
    res.json({ url: fileUrl });
  } catch (error: any) {
    console.error("Upload error:", error);
    res.status(500).json({ error: error.message || "Failed to upload file" });
  }
});

app.use("/api", router);
// Also mount at root in case Vercel strips /api
app.use("/", router);

export default app;
