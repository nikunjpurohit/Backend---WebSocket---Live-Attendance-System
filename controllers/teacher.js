const Class = require('../models/class');
const User = require('../models/user')
const { z } = require('zod');

// Schema for creating a class
const classSchema = z.object({
  className: z.string().min(3, { message: 'className must be at least 3 characters long' }).max(20),
});

const addClass = async (req, res) => {
  try {
    const validatedData = classSchema.parse(req.body);
    console.log(validatedData);
    console.log(req.user);

    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to create a class',
      });
    }
    const newClass = await Class.create({
      ...validatedData,
      teacherId: req.user.id,
      studentIds: [],
    });

    return res.status(201).json({
      success: true,
      data: {
        _id: newClass._id,
        className: newClass.className,
        teacherId: newClass.teacherId,
        studentIds: newClass.studentIds || [],
      },
    });
  } catch (error) {
    // Check if error is a ZodValidation error
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: error.issues[0].message, // ✅ FIXED: use .issues instead of .errors
      });
    }

    console.error('Error in addClass:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
};


// add a student to class POST /class/:id/add-student

const studenidSchema = z.object({
    studentId: z.string().min(1),
})

const addStudent = async (req, res) => {
    try {
        const validatedData = studenidSchema.parse(req.body);
        console.log(validatedData);
        console.log(req.user);
        console.log(req.params);
        //check if the class exists
        const classExists = await Class.findById(req.params.id);
        if(!classExists){
            return res.status(404).json({
                success: false,
                error: 'Class not found',
            });
        }
        //check if the student is already in the class
        if(classExists.studentIds.includes(validatedData.studentId)){
            return res.status(400).json({
                success: false,
                error: 'Student already in class',
            });
        }
        //add student to class
        classExists.studentIds.push(validatedData.studentId);
        await classExists.save();
        return res.status(200).json({
            success: true,
            data: {
                _id: classExists._id,
                className: classExists.className,
                teacherId: classExists.teacherId,
                studentIds: classExists.studentIds,
            },
        });
        
    } catch (error) {
        // Check if error is a ZodValidation error
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                error: error.issues[0].message, // ✅ FIXED: use .issues instead of .errors
            });
        }

        console.error('Error in addStudent:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Internal server error',
        });
    }
}

// get all students from a class GET /class/:id  Auth Required: Yes (Teacher who owns class OR Student enrolled in class)

const getAllStudents = async (req, res) => {
  try {
    const classExists = await Class.findById(req.params.id);
    console.log(classExists);
    console.log(req.user);
    if (!classExists) {
      return res.status(404).json({
        success: false,
        error: 'Class not found',
      });
    }

    // 1. Convert ObjectIds to strings for safe comparison
    const teacherIdStr = classExists.teacherId.toString();
    const currentUserIdStr = req.user.id.toString();
    const isTeacher = teacherIdStr === currentUserIdStr;

    // 2. Check if the user is enrolled in studentIds array
    const isStudent = classExists.studentIds.some(
      (studentId) => studentId.toString() === currentUserIdStr
    );

    // 3. Block access only if user is NEITHER teacher NOR student
    if (!isTeacher && !isStudent) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to view class details',
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        _id: classExists._id,
        className: classExists.className,
        teacherId: classExists.teacherId,
        studentIds: classExists.studentIds,
      },
    });
  } catch (error) {
    // Handle invalid MongoDB ObjectId format (e.g. GET /class/invalid-id)
    if (error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        error: 'Invalid Class ID format',
      });
    }

    console.error('Error in getAllStudents:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
};

// get all students details onlu if you are a teacher get /students
const getStudentsDetails = async (req, res) => {
    try {
        console.log(req.user)
        if (req.user.role !== 'teacher') {
            return res.status(403).json({
                success: false,
                error: 'Unauthorized to view students',
            });
        }
        console.log(req.user);
        //get all students details
        const students = await User.find({ role: 'student' }).select('-password');
        return res.status(200).json({
            success: true,
            data: students,
        });
    } catch (error) {
        console.error('Error in getStudents:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Internal server error',
        });
    }
}



module.exports = { addClass ,addStudent, getAllStudents, getStudentsDetails };