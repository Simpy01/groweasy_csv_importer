# GrowEasy CSV Importer

GrowEasy CSV Importer is a full-stack web application that lets users upload messy CSV files, preview the data, and use AI to extract CRM-ready lead records. The backend processes rows in batches, validates the extracted values, and returns both imported and skipped results.

## Features

- Upload CSV files through a responsive drag-and-drop interface
- Preview uploaded rows before confirming import
- Send rows to Gemini in batched requests for better efficiency and lower rate-limit risk
- Extract structured lead fields such as name, email, phone, company, location, source, and CRM status
- Validate and normalize contact data before returning results
- Display imported and skipped records with clear reasons for skipped rows
- Support local development and deployment to Render/Vercel-style environments

## Tech Stack

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- PapaParse
- React Dropzone

### Backend

- Node.js
- Express
- TypeScript
- Gemini AI
- Multer
- dotenv

## Project Structure

- frontend/ - Next.js client application
- backend/ - Express API server and AI processing logic
- backend/src/services/ - CSV parsing and AI extraction services
- backend/src/utils/ - normalization and validation helpers
- backend/tests/ - basic regression tests for normalization logic

## Local Setup

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

The backend will start on the port defined in your environment file, typically 5000.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at http://localhost:3000.

## Environment Variables

Create a backend environment file with:

```env
PORT=5000
GEMINI_API_KEY=your_gemini_api_key
```

### Notes

- The backend fails fast if GEMINI_API_KEY is missing.
- The example file is available at backend/.env.example.

## API Flow

1. The frontend uploads a CSV file to the backend.
2. The backend parses the CSV rows.
3. Records are grouped into small batches and sent to the Gemini model.
4. Extracted lead data is validated and normalized.
5. The API returns imported records and skipped records with skip reasons.

## Import Rules

The backend validates contact information before importing rows. A row is skipped if it does not contain a usable email or phone number after normalization. Date-like values are not treated as phone numbers, which helps prevent misclassification.

## Deployment

### Backend (Render)

- Build Command: npm install && npm run build
- Start Command: npm run start
- Set the GEMINI_API_KEY environment variable in the Render dashboard.

### Frontend (Vercel or similar)

- Connect the frontend folder to your host.
- Ensure the frontend points to the deployed backend API URL.

## Testing

Basic regression tests are included for normalization logic:

```bash
cd backend
npm run build
node --test tests/normalize.test.mjs
```

## Summary

This project demonstrates an AI-assisted CSV import workflow with a modern frontend, a robust backend API, and validation logic designed to reduce common data quality issues.
