const mongoose = require('mongoose');
const User = require('./user');
const Class = require('./class');

const attendanceSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'User ID is required'],
        },
        classId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Class',
            required: [true, 'Class ID is required'],
        },
        status: {
            type: String,
            enum: {
                values: ['present', 'absent', 'late',"null"],
                message: '{VALUE} is not a valid status',
            },
            required: [true, 'Status is required'],
        },
        date: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Attendance', attendanceSchema);