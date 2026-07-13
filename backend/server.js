import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { initializeDatabase, query } from "./db.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "filehubsecretkey_12345";

// Configure SMTP transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Send OTP Email helper function
async function sendOTPEmail(email, otp, purpose) {
  const isSignup = purpose === "registration";
  const subject = isSignup ? "Verify your FileHub Registration" : "Reset your FileHub Password";
  const title = isSignup ? "Registration OTP Verification" : "Password Reset OTP Verification";
  const desc = isSignup 
    ? "Thank you for joining FileHub! Please use the following 6-digit OTP code to complete your registration. This code is valid for 5 minutes." 
    : "We received a request to reset your password. Please use the following 6-digit OTP code to reset your password. This code is valid for 5 minutes.";

  const mailOptions = {
    from: process.env.EMAIL_FROM || `"FileHub" <${process.env.SMTP_USER}>`,
    to: email,
    subject: subject,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
        <h2 style="color: #10b981; text-align: center;">${title}</h2>
        <p style="color: #4b5563; font-size: 14px; line-height: 1.5;">${desc}</p>
        <div style="text-align: center; margin: 30px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1f2937; background-color: #f3f4f6; padding: 10px 20px; border-radius: 8px; border: 1px solid #e5e7eb; display: inline-block;">
            ${otp}
          </span>
        </div>
        <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-top: 20px;">
          If you did not request this, please ignore this email.
        </p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

// Middlewares
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`, req.body);
  next();
});

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

// OTP-based Register Flow: Send OTP
app.post("/api/auth/signup-otp", async (req, res) => {
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

    // Generate 6 digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const passwordHash = await bcrypt.hash(password, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Delete any existing registration OTP for this email
    await query("DELETE FROM otps WHERE email = ? AND purpose = 'registration'", [email]);

    // Insert OTP
    await query(
      "INSERT INTO otps (email, otp, purpose, password_hash, expires_at) VALUES (?, ?, 'registration', ?, ?)",
      [email, otp, passwordHash, expiresAt]
    );

    // Send OTP Email
    await sendOTPEmail(email, otp, "registration");

    res.json({ success: true, message: "OTP sent to your email" });
  } catch (error) {
    console.error("Signup OTP error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// OTP-based Register Flow: Verify OTP and Register
app.post("/api/auth/verify-signup-otp", async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: "Email and OTP are required" });
  }

  try {
    // Find valid OTP
    const [records] = await query(
      "SELECT * FROM otps WHERE email = ? AND otp = ? AND purpose = 'registration' AND expires_at > NOW()",
      [email, otp]
    );

    if (records.length === 0) {
      return res.status(400).json({ error: "Invalid or expired verification code" });
    }

    const record = records[0];

    // Create user and profile
    const userId = crypto.randomUUID();
    const profileId = crypto.randomUUID();

    await query("INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)", [
      userId,
      email,
      record.password_hash,
    ]);

    const displayName = email.split("@")[0];
    await query("INSERT INTO profiles (id, user_id, display_name) VALUES (?, ?, ?)", [
      profileId,
      userId,
      displayName,
    ]);

    // Clean up OTP
    await query("DELETE FROM otps WHERE email = ? AND purpose = 'registration'", [email]);

    res.json({ success: true, message: "Verification successful! You can now log in." });
  } catch (error) {
    console.error("Verify signup OTP error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// OTP-based Forgot Password Flow: Send OTP
app.post("/api/auth/forgot-password-otp", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    // Check if user exists
    const [users] = await query("SELECT * FROM users WHERE email = ?", [email]);
    if (users.length === 0) {
      return res.status(400).json({ error: "No user found with this email" });
    }

    // Generate 6 digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Delete any existing recovery OTP for this email
    await query("DELETE FROM otps WHERE email = ? AND purpose = 'recovery'", [email]);

    // Insert OTP
    await query(
      "INSERT INTO otps (email, otp, purpose, expires_at) VALUES (?, ?, 'recovery', ?)",
      [email, otp, expiresAt]
    );

    // Send OTP Email
    await sendOTPEmail(email, otp, "recovery");

    res.json({ success: true, message: "Verification code sent to your email" });
  } catch (error) {
    console.error("Forgot password OTP error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// OTP-based Forgot Password Flow: Verify OTP
app.post("/api/auth/verify-recovery-otp", async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: "Email and OTP are required" });
  }

  try {
    // Find valid OTP
    const [records] = await query(
      "SELECT * FROM otps WHERE email = ? AND otp = ? AND purpose = 'recovery' AND expires_at > NOW()",
      [email, otp]
    );

    if (records.length === 0) {
      return res.status(400).json({ error: "Invalid or expired verification code" });
    }

    // Find user ID to sign in
    const [users] = await query("SELECT id FROM users WHERE email = ?", [email]);
    if (users.length === 0) {
      return res.status(400).json({ error: "User not found" });
    }
    const userId = users[0].id;

    // Create temporary recovery token (valid for 10 minutes)
    const tempToken = jwt.sign({ id: userId, email }, JWT_SECRET, { expiresIn: "10m" });

    // Clean up OTP
    await query("DELETE FROM otps WHERE email = ? AND purpose = 'recovery'", [email]);

    res.json({
      session: {
        access_token: tempToken,
        user: { id: userId, email },
      },
    });
  } catch (error) {
    console.error("Verify recovery OTP error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

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
    const [rows] = await query("SELECT SUM(file_size) as total_size FROM files WHERE user_id = ?", [req.user.id]);
    const currentTotalSize = parseInt(rows[0]?.total_size || 0);
    const MAX_TOTAL_STORAGE = 500 * 1024 * 1024; // 500MB

    if (currentTotalSize + parseInt(file_size || 0) > MAX_TOTAL_STORAGE) {
      return res.status(400).json({ error: "Storage limit of 500MB exceeded" });
    }

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
    const [rows] = await query("SELECT SUM(file_size) as total_size FROM files WHERE user_id = ?", [req.user.id]);
    const currentTotalSize = parseInt(rows[0]?.total_size || 0);
    const MAX_TOTAL_STORAGE = 500 * 1024 * 1024; // 500MB

    if (currentTotalSize + parseInt(file_size || 0) > MAX_TOTAL_STORAGE) {
      return res.status(400).json({ error: "Storage limit of 500MB exceeded" });
    }

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
app.post("/api/storage/upload/:bucket", authenticateToken, upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    const [rows] = await query("SELECT SUM(file_size) as total_size FROM files WHERE user_id = ?", [req.user.id]);
    const currentTotalSize = parseInt(rows[0]?.total_size || 0);
    const MAX_TOTAL_STORAGE = 500 * 1024 * 1024; // 500MB

    if (currentTotalSize + req.file.size > MAX_TOTAL_STORAGE) {
      if (req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ error: "Storage limit of 500MB exceeded" });
    }

    const storagePath = req.headers["x-storage-path"] || req.file.filename;
    res.json({ data: { path: storagePath } });
  } catch (err) {
    console.error("Upload error:", err);
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: "Internal server error" });
  }
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
