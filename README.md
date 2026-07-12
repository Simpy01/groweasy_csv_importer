# GrowEasy CSV Importer

An AI-powered CSV importer for extracting CRM-ready lead information from messy CSV exports.

## Features

- Upload CSV files through a responsive web interface
- Preview uploaded rows before import
- Send CSV rows to a Gemini-powered extraction flow
- Map records into structured CRM-style fields
- View imported and skipped records in a table UI

## Tech Stack

### Frontend

- Next.js
- React
- Tailwind CSS
- PapaParse
- React Dropzone

### Backend

- Node.js
- Express
- TypeScript
- Gemini AI
- Multer

## Project Structure

- frontend/ - Next.js client application
- backend/ - Express API server

## Setup

### Backend

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

Create a backend environment file with:

```env
PORT=5000
GEMINI_API_KEY=your_gemini_api_key
```

## Usage

1. Start the backend server
2. Start the frontend server
3. Open http://localhost:3000
4. Upload a CSV file and confirm the import

## Notes

The backend validates required contact information and skips rows that do not contain an email or mobile number.
