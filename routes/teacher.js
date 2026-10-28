const express = require('express')
const router = express.Router()
const { addClass ,addStudent, getAllStudents, getStudentsDetails } = require('../controllers/teacher')
const auth = require('../middleware/authentication')


router.get('/students', auth, getStudentsDetails)
router.post('/', auth, addClass)
router.post('/:id/add-student', auth, addStudent)
router.get('/:id', auth, getAllStudents)

module.exports = router