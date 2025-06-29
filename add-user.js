const http = require('http');

const data = JSON.stringify({
  "testuser@example.com": { "name": "Test User" }
});

const options = {
  hostname: 'localhost',
  port: 3333,
  path: '/?mode=disk&key=users',
  method: 'POST',
  headers: {
    'Content-Type': 'text/plain',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  let body = '';
  res.on('data', chunk => { body += chunk; });
  res.on('end', () => {
    console.log('Response:', body);
  });
});

req.on('error', error => {
  console.error('Error:', error);
});

req.write(data);
req.end();