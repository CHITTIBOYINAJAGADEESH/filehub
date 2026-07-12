import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { initializeDatabase, query } from "./db.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "filehubsecretkey_12345";

// Middlewares
app.use(cors());
app.use(express.json());

// Ensure uploads folder exists
const UPLOADS_DIR = "./uploads";
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Serve uploads statically
app.use("/uploads", express.static(UPLOADS_DIR));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const storagePath = req.headers["x-storage-path"];
    if (storagePath && storagePath.includes("/")) {
      const parts = storagePath.split("/");
      const dir = path.join(UPLOADS_DIR, parts[0]);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      cb(null, dir);
    } else {
      cb(null, UPLOADS_DIR);
    }
  },
  filename: (req, file, cb) => {
    const storagePath = req.headers["x-storage-path"];
    if (storagePath && storagePath.includes("/")) {
      const parts = storagePath.split("/");
      cb(null, parts[1]);
    } else {
      cb(null, Date.now() + "-" + file.originalname);
    }
  },
});
const upload = multer({ storage });

// Authentication Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token missing" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }
    req.user = user;
    next();
  });
}

// --- API ROUTES ---

// 1. Auth: Register
app.post("/api/auth/signup", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    // Check if user already exists
    const [existing] = await query("SELECT * FROM users WHERE email = ?", [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: "User already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = crypto.randomUUID();
    const profileId = crypto.randomUUID();

    // Insert user
    await query("INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)", [
      userId,
      email,
      passwordHash,
    ]);

    // Create profile
    const displayName = email.split("@")[0];
    await query("INSERT INTO profiles (id, user_id, display_name) VALUES (?, ?, ?)", [
      profileId,
      userId,
      displayName,
    ]);

    // Create JWT
    const token = jwt.sign({ id: userId, email }, JWT_SECRET, { expiresIn: "7d" });

    res.json({
      session: {
        access_token: token,
        user: { id: userId, email },
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 2. Auth: Login
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const [users] = await query("SELECT * FROM users WHERE email = ?", [email]);
    if (users.length === 0) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    const user = users[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    // Create JWT
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });

    res.json({
      session: {
        access_token: token,
        user: { id: user.id, email: user.email },
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 3. Auth: Update Password
app.put("/api/auth/password", authenticateToken, async (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: "Password is required" });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    await query("UPDATE users SET password_hash = ? WHERE id = ?", [passwordHash, req.user.id]);
    res.json({ success: true });
  } catch (error) {
    console.error("Password update error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 4. Profiles: Get
app.get("/api/profiles", authenticateToken, async (req, res) => {
  try {
    const [profiles] = await query("SELECT display_name, avatar_url FROM profiles WHERE user_id = ?", [
      req.user.id,
    ]);
    if (profiles.length === 0) {
      return res.status(404).json({ error: "Profile not found" });
    }
    res.json({ data: profiles[0] });
  } catch (error) {
    console.error("Fetch profile error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 5. Profiles: Update/Create
app.put("/api/profiles", authenticateToken, async (req, res) => {
  const { display_name, avatar_url } = req.body;

  try {
    const [existing] = await query("SELECT * FROM profiles WHERE user_id = ?", [req.user.id]);
    if (existing.length === 0) {
      const profileId = crypto.randomUUID();
      await query("INSERT INTO profiles (id, user_id, display_name, avatar_url) VALUES (?, ?, ?, ?)", [
        profileId,
        req.user.id,
        display_name || "",
        avatar_url || null,
      ]);
    } else {
      if (display_name !== undefined && avatar_url !== undefined) {
        await query("UPDATE profiles SET display_name = ?, avatar_url = ? WHERE user_id = ?", [
          display_name,
          avatar_url,
          req.user.id,
        ]);
      } else if (display_name !== undefined) {
        await query("UPDATE profiles SET display_name = ? WHERE user_id = ?", [display_name, req.user.id]);
      } else if (avatar_url !== undefined) {
        await query("UPDATE profiles SET avatar_url = ? WHERE user_id = ?", [avatar_url, req.user.id]);
      }
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 6. Files: List
app.get("/api/files", authenticateToken, async (req, res) => {
  try {
    const [files] = await query("SELECT * FROM files WHERE user_id = ? ORDER BY created_at DESC", [
      req.user.id,
    ]);
    res.json({ data: files });
  } catch (error) {
    console.error("Fetch files error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 7. Files: Insert Note
app.post("/api/files/note", authenticateToken, async (req, res) => {
  const { file_name, file_type, file_size, is_text_note, text_content, content_type } = req.body;

  try {
    const fileId = crypto.randomUUID();
    await query(
      "INSERT INTO files (id, user_id, file_name, file_type, file_size, is_text_note, text_content, content_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [fileId, req.user.id, file_name, file_type, file_size, is_text_note, text_content, content_type]
    );
    res.json({ success: true });
  } catch (error) {
    console.error("Insert note error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 8. Files: Insert File Metadata
app.post("/api/files", authenticateToken, async (req, res) => {
  const { file_name, file_type, file_size, storage_path, content_type, is_text_note } = req.body;

  try {
    const fileId = crypto.randomUUID();
    await query(
      "INSERT INTO files (id, user_id, file_name, file_type, file_size, storage_path, content_type, is_text_note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [fileId, req.user.id, file_name, file_type, file_size, storage_path, content_type, is_text_note]
    );
    res.json({ success: true });
  } catch (error) {
    console.error("Insert file error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 9. Files: Delete
app.delete("/api/files", authenticateToken, async (req, res) => {
  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: "File ID is required" });
  }

  try {
    const [files] = await query("SELECT * FROM files WHERE id = ? AND user_id = ?", [id, req.user.id]);
    if (files.length === 0) {
      return res.status(404).json({ error: "File not found" });
    }

    const file = files[0];
    if (file.storage_path) {
      const filePath = path.join(UPLOADS_DIR, file.storage_path);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await query("DELETE FROM files WHERE id = ?", [id]);
    res.json({ success: true });
  } catch (error) {
    console.error("Delete file error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 10. Storage: Upload
app.post("/api/storage/upload/:bucket", authenticateToken, upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  const storagePath = req.headers["x-storage-path"] || req.file.filename;
  res.json({ data: { path: storagePath } });
});

// 11. Storage: Delete
app.delete("/api/storage/remove/:bucket", authenticateToken, (req, res) => {
  const { paths } = req.body; // Array of paths
  if (!paths || !Array.isArray(paths)) {
    return res.status(400).json({ error: "Paths must be an array" });
  }

  try {
    paths.forEach((fileName) => {
      const filePath = path.join(UPLOADS_DIR, fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
    res.json({ success: true });
  } catch (error) {
    console.error("Storage delete error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Start Server after initializing database
async function startServer() {
  try {
    await initializeDatabase();
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Database connection / initialization failed:", error);
    process.exit(1);
  }
}

startServer();
