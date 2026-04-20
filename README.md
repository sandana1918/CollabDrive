# CollabDrive

CollabDrive is a cloud-based file storage and real-time collaborative document editing platform inspired by Google Drive and Google Docs. It combines secure authentication, nested file organization, rich document editing, role-based sharing, live collaboration, cloud storage, and a production-style deployment architecture.

## Live Deployment

- Frontend: [https://collabdrive-client-production.up.railway.app](https://collabdrive-client-production.up.railway.app)
- Backend: [https://collabdrive-server-production.up.railway.app](https://collabdrive-server-production.up.railway.app)
- Health check: [https://collabdrive-server-production.up.railway.app/api/health](https://collabdrive-server-production.up.railway.app/api/health)

## What The Project Does

CollabDrive allows users to:

- create accounts and sign in securely
- upload, preview, organize, rename, move, trash, restore, and download files
- create folders and build nested drive hierarchies
- create collaborative documents and edit them in real time
- share files and documents with role-based permissions
- use private, public, and link-based sharing models
- view activity logs, notifications, version history, and metadata
- store uploaded assets in AWS S3 and metadata/content in MongoDB Atlas

## Core Features

### Authentication and Security

- JWT-based authentication
- bcrypt password hashing
- protected backend routes and middleware
- role-based access control for files and documents
- roles: `owner`, `editor`, `commenter`, `viewer`
- environment-based secret and deployment configuration

### Drive and File Management

- Google Drive-like dashboard and file browser
- nested folders and breadcrumb navigation
- list and grid views
- search, filters, sorting, starring, pinning, and trash
- file preview panel and activity panel
- drag-and-drop upload support
- file metadata and ownership tracking

### Real-Time Collaborative Editor

- Tiptap-based editor
- Socket.io powered live collaboration
- autosave and save on disconnect
- presence indicators and live collaboration awareness
- version history and restore support
- commenter mode and access-aware editing states

### Sharing and Access Control

- share by username or email
- owner, editor, commenter, and viewer roles
- revoke access
- visibility controls: private, public, and link
- copyable share links

### Cloud and Deployment Readiness

- Railway native Node deployment for the frontend and Railway backend deployment
- MongoDB Atlas for managed cloud database
- AWS S3 for file storage
- Docker and Docker Compose support for local development
- GitHub Actions CI + Railway CD

## Architecture

### Final Cloud Architecture

- Frontend hosted on Railway using the native Node/Railpack builder
- Backend hosted on Railway
- Database hosted on MongoDB Atlas
- File storage hosted on AWS S3
- Real-time collaboration handled with Socket.io over the deployed Node.js backend

### Application Flow

1. User interacts with the React frontend.
2. Frontend calls the Express REST API for auth, file, sharing, and metadata actions.
3. Backend stores structured data in MongoDB Atlas.
4. Uploaded files are stored in AWS S3.
5. Real-time document updates are synchronized through Socket.io rooms.

## Tech Stack

### Frontend

- React
- Vite
- Tailwind CSS
- Framer Motion
- Socket.io Client
- Tiptap

### Backend

- Node.js
- Express
- MongoDB + Mongoose
- Socket.io
- Multer
- AWS SDK for JavaScript v3

### DevOps / Cloud

- Railway
- MongoDB Atlas
- AWS S3
- GitHub Actions
- Docker for backend image validation and local Compose
- Docker Compose
- Nginx

## Project Structure

```text
/client
/server
  /config
  /controllers
  /middleware
  /models
  /routes
  /services
  /sockets
  /utils
/.github/workflows
docker-compose.yml
```

## Environment Variables

### Backend (`server/.env`)

```env
PORT=5000
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb://127.0.0.1:27017/collabdrive
JWT_SECRET=change-me
JWT_EXPIRES_IN=7d
STORAGE_PROVIDER=local
LOCAL_UPLOAD_DIR=uploads
AWS_REGION=ap-south-1
AWS_S3_BUCKET=your-bucket-name
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

### Frontend (`client/.env`)

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

## Local Development Setup

### 1. Install dependencies

```bash
npm install
npm --prefix server install
npm --prefix client install
```

### 2. Create env files

Create:

- `server/.env`
- `client/.env`

using the example values above or the included example files.

### 3. Run locally

Backend:

```bash
npm --prefix server run dev
```

Frontend:

```bash
npm --prefix client run dev
```

Local URLs:

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:5000/api/health`

## Docker Setup

Docker support is included for containerized local development. The production frontend deployment is intentionally not Docker-based; Railway should build the `client` service with its native Node/Railpack builder.

### Run with Docker Compose

```bash
docker compose up --build
```

Docker local URLs:

- Frontend: `http://localhost:4173`
- Backend health: `http://localhost:5000/api/health`
- MongoDB: `mongodb://localhost:27017`

The Docker setup uses:

- MongoDB container for local development
- local upload storage inside the backend container
- a local-only frontend Dockerfile at `client/Dockerfile.local`

## CI/CD

### Continuous Integration

GitHub Actions is configured in:

- `.github/workflows/ci.yml`

The CI workflow runs on every push and pull request to `main` and performs:

- dependency installation
- backend entrypoint syntax validation
- frontend production build
- backend Docker image build

### Continuous Deployment

Deployment is handled by Railway from the connected GitHub repository.

Recommended production setup:

- enable `Wait for CI` on Railway services
- deploy only after GitHub Actions passes
- frontend service root directory: `/client`
- frontend builder: Railway native Node/Railpack, not Docker
- frontend build command: `npm ci && npm run build`
- frontend start command: `npm run preview -- --host 0.0.0.0 --port $PORT`

## Key API Areas

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Files

- file upload, download, rename, move, delete
- folder create and nested browsing
- trash and restore
- metadata lookup and search
- content load and save

### Sharing

- share with user
- revoke user access
- manage visibility and links
- role-aware file access

## Collaboration Events

- `join-document`
- `send-changes`
- `receive-changes`
- `save-document`
- `presence-update`
- `document-loaded`
- `document-saved`

## Deployment Summary

Final deployed stack:

- Railway native Node/Railpack for frontend hosting
- Railway for backend hosting
- MongoDB Atlas for database
- AWS S3 for file storage
- GitHub Actions + Railway for CI/CD

## Current Status

Implemented:

- authentication and authorization
- cloud file upload and metadata management
- nested folders and drive UI
- role-based sharing and access control
- real-time collaborative editor
- autosave and version history
- cloud deployment
- CI/CD
- Docker support for backend validation and local development

Future improvements possible:

- deeper automated test coverage
- stronger production monitoring and logging
- stricter security hardening such as rate limiting and helmet
- more advanced collaborative conflict resolution (CRDT/OT)
- richer comments, suggestions, and review workflows

## Notes

- Local development can use local storage or S3 depending on `STORAGE_PROVIDER`
- Production deployment uses MongoDB Atlas and AWS S3
- Real-time collaboration currently uses a simpler last-write-wins model
- For production security, rotate secrets if they were ever exposed during setup or screenshots
