const https = require('https');
const fs = require('fs');
const path = require('path');

const options = {
  key: fs.readFileSync('localhost.key'),
  cert: fs.readFileSync('localhost.crt')
};

https.createServer(options, (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Request-Method', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  let status = 200;
  let content = "";
  let contentType = "text/html";
  let headers = {};
  let { url: _url } = req;
  let [ url, query ] = _url.split('?');
  if (url === '/') {
    url = '/index.html';
  }
  if (url === '/bundle.js') {
    //console.log('SERVING APPLICATION BUNDLE') 
  }
  if (url === '/sw.js') {
    //console.log('SERVING SERVICE WORKER') 
  }
  if (url.endsWith(".js")) {
    contentType = "text/javascript"; 
  }
  if (url.endsWith(".css")) {
    contentType = "text/css"; 
  }
  const filePath = path.join(__dirname, "html", url);
  console.log('serve', filePath);
  try {
    content = fs.readFileSync(filePath);  
  } catch (e) {
    status = 404;
  }
  headers['Content-Type'] = contentType;
  res.writeHead(status, headers);
  res.end(content);
}).listen(8001);
console.log('listening on', 8001);
