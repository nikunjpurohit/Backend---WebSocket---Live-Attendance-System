Backend + WebSocket - Live Attendance System
A comprehensive Node.js backend application featuring JWT authentication, role-based access control (Teacher & Student), class management CRUD operations, and real-time live attendance tracking powered by WebSockets (ws) and MongoDB persistence.

🛠️ Tech Stack
Runtime: Node.js

Framework: Express.js

Database & ODM: MongoDB, Mongoose

Validation: Zod

Authentication: JSON Web Tokens (JWT), bcrypt

Real-time Communication: ws (WebSocket)

⚙️ Features & Architecture
Authentication & Authorization: Secure signup and login with hashed passwords (bcrypt) and JWT issuance. Role-based privileges separating teacher and student actions.

Class & Student Management: Create classes, add students, populate enrolled student details, and fetch available student pools.

Real-Time Live Attendance via WebSocket:

Single active session in server RAM (activeSession).

WebSocket connection upgrade with JWT verification at ws://localhost:3000/ws?token=<JWT>.

Teacher Events: Mark live attendance (ATTENDANCE_MARKED), fetch live metrics (TODAY_SUMMARY), and finish/persist records (DONE).

Student Events: Query individual live status (MY_ATTENDANCE).

MongoDB Persistence: When a session is marked DONE, missing students are automatically categorized as absent, and the complete session data is bulk-written/upserted into the MongoDB Attendance collection.

🚀 Getting Started & Installation
1. Clone the repository & install dependencies
Bash
git clone <your-repository-url>
cd <your-project-folder>
npm install express mongoose cors dotenv jsonwebtoken zod ws bcrypt
2. Configure Environment Variables
Create a .env file in the root directory with the following variables:

Code snippet
PORT=3000
MONGO_URI=your_mongodb_connection_string_here
JWT_SECRET=your_jwt_secret_key_here
3. Run the Server
For development (using nodemon):

Bash
npx nodemon index.js
Or with standard Node:

Bash
node index.js
📡 API Endpoints Reference
Authentication & User
POST /api/v1/auth/signup — Register a new user (teacher or student)

POST /api/v1/auth/login — Authenticate and receive a JWT token

GET /api/v1/auth/me — Get current logged-in user details

Class Management
POST /api/v1/class — Create a new class (Teacher only)

POST /api/v1/class/:id/add-student — Add a student to a class (Teacher owner only)

GET /api/v1/class/:id — Get class details with populated students (Teacher owner or Enrolled student)

GET /api/v1/class/students — Get all users with the student role (Teacher only)

Attendance & Sessions
GET /api/v2/class/:id/my-attendance — Check student's persisted attendance record (Student only)

POST /api/v2/class/start — Start a live attendance session in server memory (Teacher only)

🔌 WebSocket Events Reference
Connect to the WebSocket server using your JWT token:

Plaintext
ws://localhost:3000/ws?token=<YOUR_JWT_TOKEN>
All payloads follow the event format:

JSON
{
  "event": "EVENT_NAME",
  "data": { ... }
}
ATTENDANCE_MARKED (Teacher → Server → Broadcast): Marks a student's live status (present / absent).

TODAY_SUMMARY (Teacher → Server → Broadcast): Requests current live counts of present and absent students.

MY_ATTENDANCE (Student → Server → Unicast): Queries the requesting student's live session status.

DONE (Teacher → Server → DB Persist → Broadcast): Finalizes the session, auto-marks unmarked students as absent, bulk-saves data to MongoDB, clears server memory, and broadcasts final metrics.
