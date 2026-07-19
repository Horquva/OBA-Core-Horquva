const express = require('express')
const router  = express.Router()

router.use('/intelligence', require('./intelligence'))
router.use('/spof',         require('./spof'))
router.use('/failures',     require('./failures'))

module.exports = router