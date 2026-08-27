const express = require('express')

const { validate } = require('../validation/validate')
const { advancedValidate } = require('../validation/advanced')

const router = express.Router()

// Basic validation
router.post('/', (req, res, next) => {
  try {
    const result = validate(req.body)

    res.status(200).json({
      success: true,
      data: result,
    })
  } catch (error) {
    next(error)
  }
})

// Advanced evidence validation
router.post('/advanced', (req, res, next) => {
  try {
    const result = advancedValidate(req.body)

    res.status(200).json({
      success: true,
      data: result,
    })
  } catch (error) {
    next(error)
  }
})

module.exports = router