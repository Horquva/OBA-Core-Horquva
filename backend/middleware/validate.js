// Request logging and error handling middleware

function requestLogger(req, res, next) {
  const start = Date.now()
  const { method, originalUrl } = req

  res.on('finish', () => {
    const duration = Date.now() - start
    const status = res.statusCode
    const level = status >= 500 ? 'ERROR' : status >= 400 ? 'WARN' : 'INFO'
    console.log(`[${level}] ${method} ${originalUrl} → ${status} (${duration}ms)`)
  })

  next()
}

function errorHandler(err, req, res, next) {
  console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err.message)
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  })
}

module.exports = { requestLogger, errorHandler }
