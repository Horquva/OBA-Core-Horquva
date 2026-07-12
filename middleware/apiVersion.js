function apiVersion(req, res, next) {
  req.apiVersion = 'v1'
  next()
}

module.exports = apiVersion