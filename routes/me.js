const express = require('express')
const router = express.Router()
const { getMe } = require('../controllers/me')
const auth = require('../middleware/authentication')

router.get('/', auth, getMe)

module.exports = router