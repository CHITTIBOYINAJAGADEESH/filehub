# FileHub – Secure File Storage

FileHub is a modern, secure file storage and note-sharing web application. Upload, manage, and access your files securely from anywhere.

## Features

- **Secure File Upload**: Upload images, PDFs, documents, text files, code, and zip archives up to 15MB.
- **Text Notes**: Write and save text notes with word count limits.
- **User Authentication**: Secure register, login, and password reset flows.
- **Modern Responsive Dashboard**: Fully responsive user interface designed with a premium, sleek dark mode theme.

## Tech Stack

- **Frontend**: React, Vite, Tailwind CSS, lucide-react
- **Backend/Database**: Supabase (Database, Auth, and Storage)
- **Tooling**: ESLint, Vitest, JavaScript (ESM)

## Getting Started

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) installed.

### Installation

1. Clone the repository and navigate to the project directory:
   ```sh
   git clone <repository-url>
   cd filehub-main
   ```

2. Install the necessary dependencies:
   ```sh
   npm install
   ```

3. Copy the `.env.example` file to `.env` and fill in your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
   ```

4. Start the development server:
   ```sh
   npm run dev
   ```

## Development and Scripts

- `npm run dev`: Start development server.
- `npm run build`: Build production-ready application bundle.
- `npm run lint`: Lint code with ESLint.
- `npm run test`: Run tests with Vitest.
