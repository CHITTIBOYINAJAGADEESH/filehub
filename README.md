# FileHub – Secure Fullstack File & Note Storage

FileHub is a secure fullstack web application for storing files and writing text notes. It features a React-based frontend and a Node.js Express backend connected to a MySQL database.

## Features
- **User Authentication:** Registration, login, password updates, and secure profile management.
- **File Management:** Upload, preview, download, and delete files (documents, images, video, audio, ZIPs, code, sheets).
- **Text Notes:** Write and save rich text notes directly to the database.
- **Structured Storage:** Dynamically separates user uploads into dedicated subfolders under `backend/uploads/<user_id>/`.

---

## Repository Structure
```text
filehub/
├── frontend/          # React + Vite client application
├── backend/           # Express server & MySQL database controller
├── package.json       # Root monorepo scripts coordinator
└── README.md          # Project documentation
```

---

## Local Setup & Installation

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher recommended)
- [MySQL Server](https://dev.mysql.com/downloads/installer/) running locally

### 1. Database Setup
Ensure your MySQL server is running and configure a database with the credentials:
- **Database Name:** `Your_dbname`
- **Database Password:** `Db_password`

*(The backend will automatically initialize the database schema and tables upon startup).*

### 2. Install Dependencies
Run the installation command from the **root** folder:
```bash
npm install
```
*(This will automatically install dependencies for the root, frontend, and backend environments).*

### 3. Run the Project
Start both frontend and backend development servers concurrently:
```bash
npm run dev
```
- **Frontend URL:** [http://localhost:8080](http://localhost:8080)
- **Backend URL:** [http://localhost:5000](http://localhost:5000)

---

## Build for Production
To build the frontend production bundle:
```bash
npm run build
```
The output assets will be generated in `frontend/dist/`.
