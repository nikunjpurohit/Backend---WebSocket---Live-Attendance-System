// wsServer.js
const { WebSocketServer, WebSocket } = require('ws');
const jwt = require('jsonwebtoken');

// Import MongoDB Models
const Class = require('../models/class');
const Attendance = require('../models/attendance');

// Import active session state management from the attendance controller
const { getActiveSession, clearActiveSession } = require('../controllers/attendance');

function setupWebSocket(server) {
  // Initialize WebSocket Server without its own HTTP listener (sharing the Express HTTP server)
  const wss = new WebSocketServer({ noServer: true });

  // Helper function to broadcast a message to ALL connected WebSocket clients
  const broadcast = (data) => {
    const message = JSON.stringify(data);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  };

  // --------------------------------------------------------------------------
  // 1. Handle HTTP Upgrade Request for WebSocket Connections
  // URL format: ws://localhost:3000/ws?token=<JWT_TOKEN>
  // --------------------------------------------------------------------------
  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (url.pathname === '/ws') {
      const token = url.searchParams.get('token');

      // If token is missing, reject connection with 401 Unauthorized
      if (!token) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      try {
        // Verify JWT token using environment secret
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Accept connection and complete the upgrade handshake
        wss.handleUpgrade(request, socket, head, (ws) => {
          // Attach authenticated user information (userId and role) to the socket
          ws.user = { userId: decoded.userId, role: decoded.role };
          wss.emit('connection', ws, request);
        });
      } catch (err) {
        // If JWT is invalid/expired, reject connection
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }
    } else {
      // Destroy connection if path is not /ws
      socket.destroy();
    }
  });

  // --------------------------------------------------------------------------
  // 2. Handle Connection and Incoming WebSocket Messages
  // --------------------------------------------------------------------------
  wss.on('connection', (ws) => {
    console.log(`WebSocket Connected: User ${ws.user.userId} (${ws.user.role})`);

    ws.on('message', async (message) => {
      try {
        const parsed = JSON.parse(message);
        const { event, data } = parsed;
        
        // Fetch current active session from RAM memory
        const activeSession = getActiveSession();

        switch (event) {
          // ----------------------------------------------------------------
          // Event 1: ATTENDANCE_MARKED (Teacher -> Server -> Broadcast All)
          // ----------------------------------------------------------------
          case 'ATTENDANCE_MARKED': {
            // Check if user is a teacher
            if (ws.user.role !== 'teacher') {
              return ws.send(JSON.stringify({
                event: 'ERROR',
                data: { message: 'Forbidden, teacher event only' }
              }));
            }

            // Check if an attendance session is currently active
            if (!activeSession) {
              return ws.send(JSON.stringify({
                event: 'ERROR',
                data: { message: 'No active attendance session' }
              }));
            }

            const { studentId, status } = data;

            // Update status in-memory
            activeSession.attendance[studentId] = status;

            // Broadcast the marked attendance to all connected clients
            broadcast({
              event: 'ATTENDANCE_MARKED',
              data: { studentId, status }
            });
            break;
          }

          // ----------------------------------------------------------------
          // Event 2: TODAY_SUMMARY (Teacher -> Server -> Broadcast All)
          // ----------------------------------------------------------------
          case 'TODAY_SUMMARY': {
            // Check if user is a teacher
            if (ws.user.role !== 'teacher') {
              return ws.send(JSON.stringify({
                event: 'ERROR',
                data: { message: 'Forbidden, teacher event only' }
              }));
            }

            // Check if an attendance session is currently active
            if (!activeSession) {
              return ws.send(JSON.stringify({
                event: 'ERROR',
                data: { message: 'No active attendance session' }
              }));
            }

            // Calculate present and absent totals using array filters
            const statuses = Object.values(activeSession.attendance);
            const present = statuses.filter((s) => s === 'present').length;
            const absent = statuses.filter((s) => s === 'absent').length;

            // Broadcast summary stats to all connected clients
            broadcast({
              event: 'TODAY_SUMMARY',
              data: { present, absent, total: present + absent }
            });
            break;
          }

          // ----------------------------------------------------------------
          // Event 3: MY_ATTENDANCE (Student -> Server -> Unicast to Student)
          // ----------------------------------------------------------------
          case 'MY_ATTENDANCE': {
            // Check if user is a student
            if (ws.user.role !== 'student') {
              return ws.send(JSON.stringify({
                event: 'ERROR',
                data: { message: 'Forbidden, student event only' }
              }));
            }

            // Check if an attendance session is currently active
            if (!activeSession) {
              return ws.send(JSON.stringify({
                event: 'ERROR',
                data: { message: 'No active attendance session' }
              }));
            }

            // Look up student's status from active session memory
            const studentStatus = activeSession.attendance[ws.user.userId];
            const statusResult = studentStatus ? studentStatus : 'not yet updated';

            // Send response ONLY to the requesting student socket (unicast)
            ws.send(JSON.stringify({
              event: 'MY_ATTENDANCE',
              data: { status: statusResult }
            }));
            break;
          }

          // ----------------------------------------------------------------
          // Event 4: DONE (Teacher -> Server -> DB Persist -> Broadcast All)
          // ----------------------------------------------------------------
          case 'DONE': {
            // Check if user is a teacher
            if (ws.user.role !== 'teacher') {
              return ws.send(JSON.stringify({
                event: 'ERROR',
                data: { message: 'Forbidden, teacher event only' }
              }));
            }

            // Check if an attendance session is currently active
            if (!activeSession) {
              return ws.send(JSON.stringify({
                event: 'ERROR',
                data: { message: 'No active attendance session' }
              }));
            }

            // 1. Fetch class from MongoDB to get all enrolled students
            const currentClass = await Class.findById(activeSession.classId);
            
            // 2. Mark any students who haven't been marked yet as 'absent'
            if (currentClass && currentClass.studentIds) {
              currentClass.studentIds.forEach((studentId) => {
                const idStr = studentId.toString();
                if (!activeSession.attendance[idStr]) {
                  activeSession.attendance[idStr] = 'absent';
                }
              });
            }

            // 3. Persist attendance records to MongoDB using bulkWrite (upsert)
            const bulkOps = Object.entries(activeSession.attendance).map(([studentId, status]) => ({
              updateOne: {
                filter: { classId: activeSession.classId, studentId },
                update: { classId: activeSession.classId, studentId, status },
                upsert: true
              }
            }));

            if (bulkOps.length > 0) {
              await Attendance.bulkWrite(bulkOps);
            }

            // 4. Calculate final statistics
            const finalStatuses = Object.values(activeSession.attendance);
            const present = finalStatuses.filter((s) => s === 'present').length;
            const absent = finalStatuses.filter((s) => s === 'absent').length;
            const total = present + absent;

            // 5. Clear active session from server memory
            clearActiveSession();

            // 6. Broadcast completion status and summary to all clients
            broadcast({
              event: 'DONE',
              data: {
                message: 'Attendance persisted',
                present,
                absent,
                total
              }
            });
            break;
          }

          default:
            // Handle unknown event payloads
            ws.send(JSON.stringify({
              event: 'ERROR',
              data: { message: 'Unknown event' }
            }));
        }
      } catch (err) {
        // Catch parsing errors or unexpected runtime issues
        ws.send(JSON.stringify({
          event: 'ERROR',
          data: { message: err.message || 'Server error' }
        }));
      }
    });
  });
}

module.exports = setupWebSocket;