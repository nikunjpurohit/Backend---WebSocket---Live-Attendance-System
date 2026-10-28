const express = require('express');
const router = express.Router();
const { getMyAttendance,startAttendance } = require('../controllers/attendance');
const auth = require('../middleware/authentication');

router.get('/:id/my-attendance', auth, getMyAttendance);
router.post('/start', auth, startAttendance);

module.exports = router;