const express = require('express')
const { validate } = require('../validation/validate')

const router = express.Router()

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

module.exports = router