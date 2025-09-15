# Recruitify Backend

Recruitify is a **web-based hiring platform** built using the MERN stack. This repository contains the backend code that powers the platform's core functionalities including user management, job postings, resume parsing, candidate filtering, and AI-powered assistance.

## Features

### Admin
- Manage users (recruiters and candidates)
- View platform analytics
- Handle scam or reported recruiters

### Candidate
- Create and manage profiles
- Upload resumes
- Explore and apply for jobs
- Interact with an AI-powered ATS chatbot for resume scoring and improvement suggestions

### Recruiter
- Create and manage job postings
- Filter candidates using advanced search and matching
- Send job alerts to eligible candidates
- Chat with shortlisted candidates

## Tech Stack
- **Node.js** with **Express.js** (server-side)
- **MongoDB** with Mongoose (database)
- **JWT** for authentication & authorization
- **Socket.io** (for chat feature)
- **AI/ML Integration** (ATS scoring bot and resume suggestions)

## Getting Started

### Prerequisites
Make sure you have installed:
- Node.js (>= 16.x)
- MongoDB
- npm

### Installation
1. Clone the repository:
   ```
   git clone https://github.com/AnshuTanwar/recruitify-backend.git
   cd recruitify-backend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up environment variables by creating a `.env` file in the root directory:
   ```
   PORT=5000
   MONGO_URI=your_mongodb_uri
   JWT_SECRET=your_secret_key
   ```

4. Start the development server:
   ```
   npm start
   ```


## Roadmap
- [ ] User Authentication (JWT + Role-based access)
- [ ] Admin panel APIs
- [ ] Candidate resume upload & parsing
- [ ] Recruiter job posting & filtering APIs
- [ ] Chat system with Socket.io
- [ ] AI chatbot integration for ATS scoring

## License
This project is licensed under the **Apache License**.
```