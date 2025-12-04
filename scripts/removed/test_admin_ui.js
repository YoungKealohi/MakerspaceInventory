const http = require('http');
const querystring = require('querystring');

// Configure these credentials to match an admin in your DB
const adminEmail = process.env.TEST_ADMIN_EMAIL || 'jmarcos3@my.hpu.edu';
const adminPassword = process.env.TEST_ADMIN_PASSWORD || 'demo123';
const host = process.env.HOST || 'localhost';
const port = process.env.PORT || 3000;

function postLogin(callback) {
  const postData = querystring.stringify({ email: adminEmail, password: adminPassword });
  const options = {
    hostname: host,
    port: port,
    path: '/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = http.request(options, res => {
    // Capture cookie from response headers
    const setCookie = res.headers['set-cookie'];
    const cookie = setCookie ? setCookie.map(c => c.split(';')[0]).join('; ') : '';
    // Follow redirect and fetch /workers
    callback(null, cookie);
  });
  req.on('error', err => callback(err));
  req.write(postData);
  req.end();
}

function fetchWorkers(cookie, callback) {
  const options = {
    hostname: host,
    port: port,
    path: '/workers',
    method: 'GET',
    headers: {
      Cookie: cookie
    }
  };
  const req = http.request(options, res => {
    let body = '';
    res.on('data', d => body += d.toString('utf8'));
    res.on('end', () => callback(null, body));
  });
  req.on('error', err => callback(err));
  req.end();
}

postLogin((err, cookie) => {
  if (err) return console.error('Login failed:', err);
  console.log('Got cookie:', cookie);
  fetchWorkers(cookie, (err, html) => {
    if (err) return console.error('Fetch workers failed:', err);
    const hasAdd = html.indexOf('Add New Worker') !== -1;
    const hasEdit = html.indexOf('>Edit<') !== -1;
    const hasDelete = html.indexOf('>Delete<') !== -1;
    console.log('Add New Worker present:', hasAdd);
    console.log('Edit button present:', hasEdit);
    console.log('Delete button present:', hasDelete);
    if (!hasAdd || !hasEdit || !hasDelete) {
      console.log('\n--- HTML snapshot (first 2000 chars) ---\n');
      console.log(html.slice(0, 2000));
      process.exit(2);
    }
    console.log('Admin UI checks passed.');
  });
});
