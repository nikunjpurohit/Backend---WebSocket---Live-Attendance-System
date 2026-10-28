const Class = require('../models/class');
const Attendance = require('../models/attendance');

const getMyAttendance = async (req, res) => {
  try {
    const classId = req.params.id;
    // ✅ Extract ID safely regardless of how middleware attached it
    const studentId = req.user.id || req.user.userId;

    if (!studentId) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized: Invalid user context"
      });
    }

    // 1. Check if class exists
    const foundClass = await Class.findById(classId);
    if (!foundClass) {
      return res.status(404).json({
        success: false,
        error: "Class not found"
      });
    }

    // 2. Check if student is enrolled in this class
    const isEnrolled = foundClass.studentIds.some(
      (id) => id.toString() === studentId.toString()
    );

    if (!isEnrolled) {
      return res.status(403).json({
        success: false,
        error: "Forbidden, not enrolled in class"
      });
    }

    // 3. Query MongoDB for persisted attendance record
    const attendanceRecord = await Attendance.findOne({
      classId: classId,
      userId: studentId
    });

    // 4. Return response matching the required spec format
    return res.status(200).json({
      success: true,
      data: {
        classId: classId,
        status: attendanceRecord ? attendanceRecord.status : null
      }
    });

  } catch (error) {
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        error: "Invalid class ID format"
      });
    }

    console.error("Error in getMyAttendance:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error"
    });
  }
};


const { z } = require('zod');

// In-Memory active session state stored in server RAM
let activeSession = null;

// Zod Schema for Route 9 validation
const startAttendanceSchema = z.object({
  classId: z.string({ required_error: "classId is required" })
});

const startAttendance = async (req, res) => {
  try {
    // ✅ FIX 2: Use safeParse instead of parse
    const parseResult = startAttendanceSchema.safeParse(req.body);

    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: parseResult.error.issues[0].message
      });
    }

    const { classId } = parseResult.data;
    const teacherId = req.user.id || req.user.userId; // Safe fallback for auth middleware

    // 2. Check teacher role
    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        error: "Forbidden, teacher access required"
      });
    }

    // 3. Find class in MongoDB
    const foundClass = await Class.findById(classId);
    if (!foundClass) {
      return res.status(404).json({
        success: false,
        error: "Class not found"
      });
    }

    // 4. Verify class ownership
    if (foundClass.teacherId.toString() !== teacherId.toString()) {
      return res.status(403).json({
        success: false,
        error: "Forbidden, not class teacher"
      });
    }

    // 5. Initialize activeSession in memory
    activeSession = {
      classId: classId,
      startedAt: new Date().toISOString(),
      attendance: {}
    };

    // 6. Return success response
    return res.status(200).json({
      success: true,
      data: {
        classId: activeSession.classId,
        startedAt: activeSession.startedAt
      }
    });

  } catch (error) {
    // ✅ FIX 3: Catch ObjectId formatting errors
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        error: "Invalid class ID format"
      });
    }

    console.error("Error in startAttendance:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error"
    });
  }
};

module.exports = {
  getMyAttendance,
  startAttendance,
  getActiveSession: () => activeSession,
  setActiveSession: (val) => { activeSession = val; }
};



