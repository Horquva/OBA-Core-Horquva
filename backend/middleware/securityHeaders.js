// SEC-1 — standard browser security headers on every backend response.
//
// helmet's defaults cover the three the cohort handout names:
//   X-Content-Type-Options: nosniff        — stop MIME-type guessing
//   X-Frame-Options: SAMEORIGIN            — block framing by other sites
//   Strict-Transport-Security              — enforce HTTPS (browsers ignore
//                                            it over plain http, so local
//                                            dev on localhost is unaffected)
// plus a restrictive Content-Security-Policy and removal of X-Powered-By.
// This backend only serves JSON, so the default CSP breaks nothing.

const helmet = require('helmet')

module.exports = helmet()
