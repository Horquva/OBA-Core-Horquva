// SAST Trigger Fixture - Testing sentinel-no-disabled-tls-verification rule
const https = require('https');

// This should trigger the rule
const options = {
  hostname: 'api.example.com',
  port: 443,
  path: '/endpoint',
  method: 'GET',
  rejectUnauthorized: false  // VIOLATION: Disabling TLS verification
};

https.request(options, (res) => {
  console.log(`statusCode: ${res.statusCode}`);
});
