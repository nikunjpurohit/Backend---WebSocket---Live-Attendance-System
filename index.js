require('dotenv').config();
const mongoose = require('mongoose');
const express = require('express');
const http = require('http');

const app = express();
const cors = require('cors');
const connectDB = require('./db/connect');
const authenticateUser = require('./middleware/authentication');
const setupWebSocket = require('./ws/websocket');
// routers
const authRouter = require('./routes/auth');
const meRouter = require('./routes/me')
const teacherRouter = require('./routes/teacher')
const attendanceRouter = require('./routes/attendance')
app.use(express.json());
app.use(cors());

const port = process.env.PORT || 3000;

// routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/me',meRouter)
app.use('/api/v1/class',teacherRouter)
app.use('/api/v2/class',attendanceRouter)
app.get('/', (req, res) => {
    res.send('Hello World!');
});

const start = async () => {
  try {
    await connectDB(process.env.MONGO_URI);
    const server = http.createServer(app)
    setupWebSocket(server)
    console.log("Connected to DB");
    server.listen(port, () =>
      console.log(`Server is listening on port ${port}...`)
    );
  } catch (error) {
    console.log(error);
  }
};

start();