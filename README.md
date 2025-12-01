# Recruitify Backend

Node.js / Express backend for the Recruitify platform – powering authentication, candidate and recruiter workflows, AI‑assisted resume analysis, AI interviews, real‑time chat, and admin analytics.

- Runtime: Node.js (CommonJS)
- API: Express 5, REST, OpenAPI (Swagger UI)
- Data: MongoDB (Mongoose 8)
- Queues: Redis + Bull
- Realtime: Socket.IO
- Cloud: AWS S3
- AI: Google Gemini API

---

## Overview

The Recruitify backend is a production‑ready REST API that supports:

- Candidate and recruiter onboarding and profile management
- Job posting, applications, and ATS‑style scoring
- Real‑time candidate–recruiter chat
- AI‑powered resume analysis and interview assistance
- Admin‑level reports and analytics

The service is designed to be deployed independently (e.g. on Render), with a separate React/Vite frontend consuming this API.

Default local base URL: `http://localhost:5050`.

---

## Key Features

### Authentication

- Email/password signup and login with bcrypt‑hashed passwords.
- Google OAuth 2.0 login via Passport.
- JWT access tokens (short‑lived) and refresh tokens (stored in HTTP‑only cookies).
- Password reset flow:
  - `/api/auth/forgot-password` generates secure reset tokens.
  - Reset link sent via email with token and user ID.
  - `/api/auth/reset-password/:userId/:token` updates the password.

### Candidate Experience

- Candidate profile:
  - View and update profile data (name, location, bio, phone, experience, skills).
- Resume management (AWS S3):
  - Upload up to 3 resumes per candidate.
  - Delete resumes from S3 and from candidate profile.
  - Generate presigned URLs for secure resume download.
- Job discovery:
  - Skill‑based job feed using candidate skills and open jobs.
  - Detailed job view with recruiter info and structured salary/requirement fields.
  - Application status endpoint per job (`hasApplied`, `status`, `atsScore`, timestamps).

### Recruiter Experience

- Job management:
  - Create, update, delete job postings with rich metadata:
    - Title, company, location, type, salary range/period, experience level, education, skills, requirements, benefits.
  - Fetch all jobs created by the recruiter with application counts.
- Application management:
  - Fetch applications per job, sorted by ATS score and created time.
  - Fetch all applications across recruiter’s jobs with filters:
    - By ATS score band (`high`, `medium`, `low`, `very-low`, `pending`, `scored`).
    - By application `status`.
    - By `jobId`.
- Integrated with ATS scoring queue (see below).

### Admin & Analytics

- Admin reports:
  - Review and manage candidate reports against recruiters.
- Admin analytics:
  - High‑level endpoints for usage, actions, and trends (backed by analytics logs).
- Admin users configured via a seed script.

### AI Capabilities

- Resume analyzer:
  - `/api/candidate/resume/analyze`
  - Accepts either:
    - An existing uploaded resume key (from S3), or
    - A newly uploaded resume file.
  - Extracts text from PDF/DOCX and sends it to Gemini.
  - Returns structured analysis (ATS score, strengths, weaknesses, missing skills, suggestions, layout issues, etc.).
- AI interview:
  - `/api/interview/*` for starting and managing interview sessions.
  - Start interview with job title; Gemini generates a question set.
  - Per‑question answer analysis with per‑answer scores and feedback.
  - Final overall evaluation across:
    - Overall score, technical fit, communication, confidence, recommendation.
- Chat assistants:
  - Recruiter‑side question suggestions for a candidate based on resume/job.
  - Candidate smart replies to recruiter messages (with ethical safeguards).

### Real‑Time Chat

- Socket.IO‑backed candidate–recruiter chat for each job:
  - Create chat rooms tied to a specific recruiter, candidate, and job.
  - Persistent message history with `ChatRoom` and `ChatMessage` models.
- Chat features:
  - Send/receive messages in real time.
  - Seen status tracking.
  - Typing indicators.
  - Closing chats and cleanup of history.

---

## Architecture & Folder Structure

High‑level backend structure:

```text
Recruitify-Backend/
├─ server.js                 # Express app + HTTP server + Socket.IO + routes + Swagger
├─ openapi.yaml              # OpenAPI 3 specification
├─ package.json
│
├─ config/
│  ├─ passport.js            # Google OAuth 2.0 strategy
│  └─ redis.js               # Redis client and configuration
│
├─ controllers/              # Route handlers (business logic)
│  ├─ authController.js
│  ├─ candidateController.js
│  ├─ recruiterController.js
│  ├─ recruiterJobController.js
│  ├─ applicationCandidateController.js
│  ├─ applicationRecruiterController.js
│  ├─ resumeAnalyzerController.js
│  ├─ interviewController.js
│  ├─ chatController.js
│  ├─ chatAssistantController.js
│  ├─ chatSmartReplyController.js
│  ├─ reportController.js
│  ├─ adminReportController.js
│  └─ adminAnalyticsController.js
│
├─ models/                   # Mongoose models
│  ├─ User.js                # Base user (discriminator key: role)
│  ├─ candidate.js           # Candidate extends User
│  ├─ recruiter.js           # Recruiter extends User
│  ├─ admin.js               # Admin extends User
│  ├─ job.js
│  ├─ jobApplication.js
│  ├─ ChatRoom.js
│  ├─ chatMessage.js
│  ├─ report.js
│  ├─ analyticsLog.js
│  ├─ interviewSession.js
│  └─ PasswordResetToken.js
│
├─ routes/                   # Express route definitions
│  ├─ authRoutes.js
│  ├─ candidateRoutes.js
│  ├─ recruiterRoutes.js
│  ├─ recruiterJobRoutes.js
│  ├─ recruiterApplicationRoutes.js
│  ├─ reportRoutes.js
│  ├─ adminReportRoutes.js
│  ├─ adminAnalyticsRoutes.js
│  ├─ chatRoutes.js
│  ├─ chatAssistantRoutes.js
│  ├─ chatSmartReplyRoutes.js
│  ├─ resumeAnalyzerRoutes.js
│  ├─ interviewRoutes.js
│  └─ testRoutes.js          # Health/internal testing routes
│
├─ middlewares/
│  ├─ auth.js                # Legacy JWT auth middleware
│  ├─ authMiddleware.js      # Current JWT auth (protect)
│  ├─ roleMiddleware.js      # Role-based access control
│  ├─ socketAuth.js          # JWT auth for Socket.IO
│  ├─ upload.js              # Upload handling (Multer)
│  └─ errorHandler.js        # Centralized error handler
│
├─ jobs/
│  └─ atsQueue.js            # Bull queue processor for ATS scoring
│
├─ queues/
│  └─ resumeQueue.js         # Bull queue instance for resume processing
│
├─ sockets/
│  └─ chatSocket.js          # Socket.IO event handlers
│
├─ utils/
│  ├─ s3Helper.js            # AWS S3 upload, delete, presigned URL
│  ├─ resumeParser.js        # Extract text from resume files
│  ├─ atsScorerV2.js         # ATS score computation
│  ├─ jwt.js                 # Access/refresh token helpers
│  ├─ sendEmail.js           # Nodemailer wrapper for password reset
│  ├─ geminiHelper.js        # General Gemini helpers (resume, chat)
│  └─ geminiInterviewHelper.js   # Gemini helpers for interviews
│
├─ tests/
│  └─ ...                    # Jest + supertest setup and API tests
│
└─ seedAdmin.js              # Script to seed an initial admin user
```

---

## Tech Stack

### Core

- **Node.js** (CommonJS modules)
- **Express 5** for HTTP API
- **MongoDB + Mongoose 8** for data persistence
- **Redis** + **Bull** queues for background processing
- **Socket.IO** for real‑time messaging
- **Swagger UI** + **YAML** (OpenAPI 3 spec)

### Integrations

- **AWS S3** via `@aws-sdk/client-s3` for resume storage.
- **Google OAuth 2.0** via `passport-google-oauth20`.
- **Google Gemini API** via `node-fetch` for:
  - Resume analysis
  - Interview questions and evaluation
  - Recruiter question suggestions
  - Candidate smart replies
- **Nodemailer** (Gmail service) for password reset email delivery.

### Testing

- **Jest**
- **supertest**

---

## Getting Started

### Prerequisites

- Node.js **18+** (recommended for current dependency versions)
- npm
- Running MongoDB instance (local or cloud)
- Running Redis instance (local or cloud)
- AWS S3 bucket (for resume storage)
- Google Cloud project with Gemini API enabled
- Google OAuth 2.0 credentials (Client ID/Secret) for sign‑in
- Gmail account (or similar) for password reset emails

### Installation

From the `Recruitify-Backend` directory:

```bash
npm install
```

### Environment Variables

Create a `.env` file in `Recruitify-Backend/` with at least the following variables:

```bash
# Server
PORT=5050
MONGO_URI=mongodb+srv://...

# Client / CORS / Redirects
CLIENT_ORIGINS=http://localhost:5173
CLIENT_URL=http://localhost:5173          # Used for Google OAuth success redirect
CLIENT_URI=http://localhost:5173          # Used for password reset links

# JWT
JWT_SECRET=your_access_token_secret
JWT_REFRESH_SECRET=your_refresh_token_secret
NODE_ENV=development                       # "production" in production

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Email (password reset via Gmail/Nodemailer)
EMAILJS_USER=your_gmail_address@example.com
EMAILJS_PASSWORD=your_gmail_app_password

# AWS S3
AWS_REGION=your_region
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET=your_bucket_name
S3_PUBLIC_URL=https://your-bucket.s3.amazonaws.com   # optional override

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_USERNAME=default                              # if your Redis requires it
REDIS_PASSWORD=                                     # if needed

# Gemini / AI
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=models/gemini-2.5-flash                # or a compatible model

# Admin seeding (used by seedAdmin.js)
ADMIN_NAME=Platform Admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=strong-password
```

Do **not** commit real secrets to version control.

### Running Locally

From `Recruitify-Backend/`:

```bash
# Development (auto‑reload with nodemon)
npm start

# Production style (plain Node)
npm run production
```

By default the server listens on `http://localhost:5050`.

Swagger UI will be available at:

- `http://localhost:5050/api-docs`

### Seeding an Admin User

To create an initial admin account (using the env vars above):

```bash
npm run seed:admin
```

This connects to `MONGO_URI`, checks if `ADMIN_EMAIL` already exists, and if not, creates an admin with the provided credentials.

### Running Tests

```bash
npm test
```

Tests use Jest + supertest to hit HTTP endpoints. Ensure your test database configuration (if separate from production) is correctly set up.

---

## API & Routing

The main routes are wired in [server.js](cci:7://file:///Users/aanshutanwar/Developer/Recruitify-Final-Year/Recruitify-Backend/server.js:0:0-0:0):

- **Auth**
  - `POST /api/auth/signup`
  - `POST /api/auth/login`
  - `POST /api/auth/refresh`
  - `POST /api/auth/logout`
  - `POST /api/auth/forgot-password`
  - `POST /api/auth/reset-password/:userId/:token`
  - `GET  /api/auth/google` (Passport Google OAuth entry)
  - `GET  /api/auth/google/callback`

- **Candidate**
  - `/api/candidate/profile` (GET/PUT)
  - `/api/candidate/resumes` (upload/delete, presigned URL)
  - `/api/candidate/jobs` (job feed and details)
  - `/api/candidate/jobs/:jobId/status`
  - `/api/candidate` + `/api/candidate/resume/*` for reports and resume analyzer

- **Recruiter**
  - `/api/recruiter` (profile and related)
  - `/api/recruiter/jobs` (CRUD + listing)
  - `/api/recruiter/jobs/:id/applications`
  - `/api/recruiter/jobs/applications` (aggregated applications with filters)
  - `/api/recruiter/*` for additional application flows

- **Admin**
  - `/api/admin/reports/*`
  - `/api/admin/analytics/*`

- **Chat & AI**
  - `/api/chat/*` (rooms, messages, seen state, close)
  - `/api/chat/:applicationId/suggest-questions` (AI recruiter assistant)
  - `/api/chat/:messageId/smart-reply` (AI candidate smart replies)

- **Resume Analyzer**
  - `/api/candidate/resume/analyze`

- **Interview**
  - `/api/interview/start`
  - `/api/interview/answer`
  - `/api/interview/end`
  - `/api/interview/my`
  - `/api/interview/:sessionId`

- **Internal/Test**
  - `/api/*` via [testRoutes.js](cci:7://file:///Users/aanshutanwar/Developer/Recruitify-Final-Year/Recruitify-Backend/Users/aanshutanwar/Developer/Recruitify-Final-Year/Recruitify-Backend/routes/testRoutes.js:0:0-0:0) for health checks or internal diagnostics.

For full request/response schemas and additional routes, see [[openapi.yaml](cci:7://file:///Users/aanshutanwar/Developer/Recruitify-Final-Year/Recruitify-Backend/openapi.yaml:0:0-0:0)](./openapi.yaml) and `/api-docs`.

---

## Authentication & Security

- **Access tokens**
  - JWT, signed with `JWT_SECRET`.
  - Returned on login/signup and stored client‑side (e.g. in memory/local storage).
  - Passed on each request via `Authorization: Bearer <token>` header.

- **Refresh tokens**
  - JWT, signed with `JWT_REFRESH_SECRET`.
  - Stored as HTTP‑only cookies (`refreshToken`).
  - `POST /api/auth/refresh` issues new access tokens if the refresh token is valid and still registered against the user.

- **Role‑based access control**
  - Base `User` model uses `role` discriminator: `Admin`, `Candidate`, `Recruiter`.
  - [authMiddleware.protect](cci:1://file:///Users/aanshutanwar/Developer/Recruitify-Final-Year/Recruitify-Backend/middlewares/auth.js:4:0-25:1) resolves the user from JWT.
  - `roleMiddleware(authorizeRoles(...))` used on routes that require specific roles.

- **Socket authentication**
  - For Socket.IO, clients must connect with:
    - `io(..., { auth: { token: "<access_token>" } })`
  - [middlewares/socketAuth.js](cci:7://file:///Users/aanshutanwar/Developer/Recruitify-Final-Year/Recruitify-Backend/middlewares/socketAuth.js:0:0-0:0) verifies the JWT and attaches `socket.user`.

- **Error handling**
  - Central `errorHandler` middleware formats errors consistently as:
    - `{ success: false, message: "..." }`
  - Logs server‑side stack/message for debugging.

---

## Background Jobs & Queues

### ATS Scoring ([jobs/atsQueue.js](cci:7://file:///Users/aanshutanwar/Developer/Recruitify-Final-Year/Recruitify-Backend/jobs/atsQueue.js:0:0-0:0))

- Queue name: `ats-processing` (Bull).
- Powered by Redis via `redisConfig`.
- Flow:
  1. Resume binary is fetched from S3 ([getFileBufferFromS3](cci:1://file:///Users/aanshutanwar/Developer/Recruitify-Final-Year/Recruitify-Backend/utils/s3Helper.js:63:0-77:1)).
  2. Text is extracted (`resumeParser`).
  3. ATS score is computed (`computeATSScoreV2`).
  4. Result and a snapshot of the resume text are stored on the `JobApplication` document.

The queue worker is wired up on server startup via `require("./jobs/atsQueue")` in [server.js](cci:7://file:///Users/aanshutanwar/Developer/Recruitify-Final-Year/Recruitify-Backend/server.js:0:0-0:0).

### Resume Queue ([queues/resumeQueue.js](cci:7://file:///Users/aanshutanwar/Developer/Recruitify-Final-Year/Recruitify-Backend/queues/resumeQueue.js:0:0-0:0))

- Queue name: `resume-processing`.
- Currently set up with event listeners; usable for future heavy resume tasks.
- Shares the same Redis config.

Ensure Redis is reachable before starting the app; `connectRedis()` is called at startup and logs connection status.

---

## Realtime Chat & Socket.IO

Socket.IO is initialized in [server.js](cci:7://file:///Users/aanshutanwar/Developer/Recruitify-Final-Year/Recruitify-Backend/server.js:0:0-0:0) and wired through [sockets/chatSocket.js](cci:7://file:///Users/aanshutanwar/Developer/Recruitify-Final-Year/Recruitify-Backend/sockets/chatSocket.js:0:0-0:0).

### Connection

- Server:
  - Initializes `io` with the same CORS origins as Express.
  - Applies [protectSocket](cci:1://file:///Users/aanshutanwar/Developer/Recruitify-Final-Year/Recruitify-Backend/middlewares/socketAuth.js:3:0-18:2) middleware for JWT authentication.

- Client:
  - Connect with:
    - `io(SERVER_URL, { auth: { token: accessToken } })`

### Events

- **joinRoom**: join a specific chat room by ID.
- **sendMessage**: send messages (`{ roomId, text }`); messages are persisted.
- **markSeen**: mark messages from the other user as seen.
- **typing / stopTyping**: typing indicators.
- **closeChat**: delete all messages and the room; emits `chatClosed`.
- **disconnect**: logs disconnection.

---

## AI Integrations

Gemini API is used via [utils/geminiHelper.js](cci:7://file:///Users/aanshutanwar/Developer/Recruitify-Final-Year/Recruitify-Backend/utils/geminiHelper.js:0:0-0:0) and [utils/geminiInterviewHelper.js](cci:7://file:///Users/aanshutanwar/Developer/Recruitify-Final-Year/Recruitify-Backend/utils/geminiInterviewHelper.js:0:0-0:0):

- **Question suggestions**:
  - For recruiters to get tailored questions for a candidate and job.
- **Smart replies**:
  - For candidates to get suggested replies to recruiter messages.
  - Includes checks to avoid answering direct technical exam‑style questions automatically.
- **Resume analyzer**:
  - Deep ATS‑oriented evaluation of resume + job description.
- **Interview assistant**:
  - Question generation, per‑answer analysis, and final evaluation.

Configuration:

- `GEMINI_API_KEY` must be set and valid.
- `GEMINI_MODEL` defaults to `models/gemini-2.5-flash` but can be overridden.

---

## Deployment Notes

- **CORS**:
  - Configure `CLIENT_ORIGINS` as a comma‑separated list of allowed frontend origins.
  - Example:
    - `CLIENT_ORIGINS=https://your-frontend.app,https://admin.your-frontend.app`
- **Environment**:
  - Set `NODE_ENV=production` in production.
  - Ensure JWT secrets, Gemini API key, Redis password, Mongo URI, and AWS credentials are provided securely.
- **HTTPS**:
  - In production, deploy behind HTTPS so secure cookies and OAuth redirects work correctly.
- **Scaling**:
  - Application servers can scale horizontally.
  - Bull queues will share work via Redis; ensure Redis is sized appropriately.
  - Socket.IO scaling may require a shared adapter (e.g. Redis adapter) if you run multiple instances.

---

## License

This backend is open source. Refer to the repository’s `LICENSE` file (or the `license` field in [package.json](cci:7://file:///Users/aanshutanwar/Developer/Recruitify-Final-Year/Recruitify-Backend/package.json:0:0-0:0)) for the exact license terms.

```
