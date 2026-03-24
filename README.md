# CollabDrive

CollabDrive is a full-stack cloud file storage and real-time collaborative editing platform inspired by Google Drive and Google Docs. It combines secure authentication, File management, collaborative plain text or markdown editing, sharing controls, and an editorial, production-grade UI.

## Features

- JWT authentication with bcrypt password hashing
- MongoDB + Mongoose data layer
- File upload, download, delete, and metadata management
- Cloud-ready storage abstraction with local fallback and AWS S3 integration points
- Drive-inspired dashboard with responsive cards, search, upload modal, and sharing modal
- Real-time document collaboration with Socket.io rooms
- Autosave every 5 seconds and on disconnect
- Role-based sharing: owner, editor, viewer
- Basic version history and activity tracking
- Ready for deployment on Render or Railway

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
```

## Tech Stack

Frontend:
- React
- Vite
- Tailwind CSS
- Framer Motion
- Socket.io Client

Backend:
- Node.js
- Express
- MongoDB + Mongoose
- Socket.io
- Multer
- AWS SDK

## Setup

### 1. Install dependencies

```bash
npm install
npm --prefix server install
npm --prefix client install
```

### 2. Configure environment files

Create these files from the provided examples:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Set values for:
- `MONGODB_URI`
- `JWT_SECRET`
- `CLIENT_URL`
- `VITE_API_URL`
- `VITE_SOCKET_URL`
- Optional S3 credentials if you want cloud storage

### 3. Run locally

Backend:

```bash
npm --prefix server run dev
```

Frontend:

```bash
npm --prefix client run dev
```

## API Summary

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Files
- `GET /api/files`
- `POST /api/files/upload`
- `POST /api/files/documents`
- `GET /api/files/:id/content`
- `PATCH /api/files/:id/content`
- `GET /api/files/:id/download`
- `DELETE /api/files/:id`

### Sharing
- `POST /api/sharing/:id`
- `DELETE /api/sharing/:id/:userId`

## Collaboration Events

- `join-document`
- `send-changes`
- `receive-changes`
- `save-document`
- `presence-update`
- `document-loaded`
- `document-saved`

## Deployment Notes

### Render or Railway

- Deploy the server as a Node service using `server/server.js`
- Deploy the client as a static site from the `client` directory
- Add environment variables from the example files
- Set `CLIENT_URL` on the server to the deployed frontend URL
- Set `VITE_API_URL` and `VITE_SOCKET_URL` on the client to the deployed backend URL
- If using S3, set `STORAGE_PROVIDER=s3` and add AWS credentials

## Notes

- Local uploads are stored in `server/uploads`
- Document editing uses last-write-wins sync, per your requirement
- Rich text is intentionally not included; the editor is plain text / markdown focused
- The current implementation is scaffolded for production structure, but dependency installation and end-to-end runtime validation still need to be run in the target environment.
## CI/CD

- GitHub Actions runs continuous integration on every push and pull request to `main`
- The workflow installs workspace dependencies, validates the backend entry file, and builds the frontend
- Continuous deployment is handled by Railway through the connected GitHub repository
- In Railway, enable `Wait for CI` on each service if you want deployments to wait for successful GitHub Actions checks
## Docker

You can run the full stack locally with Docker Compose.

### Build and start

```bash
docker compose up --build
```

Services:
- Frontend: `http://localhost:4173`
- Backend: `http://localhost:5000/api/health`
- MongoDB: `mongodb://localhost:27017`

The Docker Compose setup uses:
- MongoDB container for local development
- local file storage for uploads
- Nginx to serve the built frontend SPA

If you want Docker in a cloud environment, you can reuse the same Dockerfiles and switch environment variables to MongoDB Atlas and AWS S3.

