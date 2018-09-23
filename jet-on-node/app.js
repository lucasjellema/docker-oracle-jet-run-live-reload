var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

const http = require('http');
const url = require('url');
const fs = require('fs');
const request = require('request');

var app = express();

var APP_VERSION = "0.0.9";

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

// any request at /js/jet-composites/input-country2
// should intercepted
var compositeBasePath = '/js/jet-composites/'
app.get(compositeBasePath + '*', function (req, res) {
  var requestedResource = req.url.substr(compositeBasePath.length)
  console.log("request composite resource " + requestedResource)
  console.log(`${req.method} ${requestedResource}`);
  // parse URL
  const parsedUrl = url.parse(requestedResource);
  // extract URL path
  let pathname = `${parsedUrl.pathname}`;
  // maps file extention to MIME types
  const mimeType = {
    '.ico': 'image/x-icon',
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.css': 'text/css',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.wav': 'audio/wav',
    '.mp3': 'audio/mpeg',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.eot': 'appliaction/vnd.ms-fontobject',
    '.ttf': 'aplication/font-sfnt'
  };

//  handleResourceFromLocalFileSystem(res,mimeType,   compositeBasePath + pathname)
  handleResourceFromCompositesServer(res,mimeType,    pathname)
  //http://127.0.0.1:3100/jet-composites/input-country/view.html
 
})

async function handleResourceFromCompositesServer(res,mimeType, requestedResource ) {
   var reqUrl = "http://127.0.0.1:3100/jet-composites/"+requestedResource
   console.log(reqUrl)
   // fetch resource and return
   var options = url.parse(reqUrl);
   options.method = "GET";
   options.agent = false;
 
//   options.headers['host'] = options.host;
 http.get(reqUrl,  function(serverResponse) {
     console.log('<== Received res for', serverResponse.statusCode, reqUrl);
     console.log('\t-> Request Headers: ', options);
     console.log(' ');
     console.log('\t-> Response Headers: ', serverResponse.headers);
 
     serverResponse.pause();
 
     serverResponse.headers['access-control-allow-origin'] = '*';
 
     switch (serverResponse.statusCode) {
       // pass through.  we're not too smart here...
       case 200: case 201: case 202: case 203: case 204: case 205: case 206:
       case 304:
       case 400: case 401: case 402: case 403: case 404: case 405:
       case 406: case 407: case 408: case 409: case 410: case 411:
       case 412: case 413: case 414: case 415: case 416: case 417: case 418:
         res.writeHeader(serverResponse.statusCode, serverResponse.headers);
         serverResponse.pipe(res, {end:true});
         serverResponse.resume();
       break;
 
       // fix host and pass through.  
       case 301:
       case 302:
       case 303:
         serverResponse.statusCode = 303;
         serverResponse.headers['location'] = 'http://localhost:'+PORT+'/'+serverResponse.headers['location'];
         console.log('\t-> Redirecting to ', serverResponse.headers['location']);
         res.writeHeader(serverResponse.statusCode, serverResponse.headers);
         serverResponse.pipe(res, {end:true});
         serverResponse.resume();
       break;
 
       // error everything else
       default:
         var stringifiedHeaders = JSON.stringify(serverResponse.headers, null, 4);
         serverResponse.resume();
         res.writeHeader(500, {
           'content-type': 'text/plain'
         });
         res.end(process.argv.join(' ') + ':\n\nError ' + serverResponse.statusCode + '\n' + stringifiedHeaders);
       break;
     }
 
     console.log('\n\n');
   });
}


function handleResourceFromLocalFileSystem(res,mimeType, requestedResource ) {
  var resourcePath = './public' + compositeBasePath+requestedResource
  console.log(`resourcepath ${resourcePath}`)
  fs.exists(resourcePath, function (exist) {
    if (!exist) {
      // if the file is not found, return 404
      res.statusCode = 404;
      res.end(`File ${resourcePath} not found!`);
      return;
    }
    // if is a directory, then look for index.html
    if (fs.statSync(resourcePath).isDirectory()) {
      resourcePath += '/index.html';
    }
    // read file from file system
    fs.readFile(resourcePath, function (err, data) {
      if (err) {
        res.statusCode = 500;
        res.end(`Error getting the file: ${err}.`);
      } else {
        // based on the URL path, extract the file extention. e.g. .js, .doc, ...
        const ext = path.parse(resourcePath).ext;
        // if the file is found, set Content-type and send data
        res.setHeader('Content-type', mimeType[ext] || 'text/plain');
        res.end(data);
      }
    });
  });
}

app.use(express.static(path.join(__dirname, 'public')));


app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.get('/about', function (req, res) {
  var about = {
    "about": "about operation on soaring portal backend",
    "PORT": process.env.PORT,
    "PRODUCT_PORTAL_URL": process.env.PRODUCT_PORTAL_URL
    , "CUSTOMER_PORTAL_URL": process.env.CUSTOMERS_PORTAL_URL
    , "FINANCE_PORTAL_URL": process.env.FINANCE_PORTAL_URL
    , "ORDERS_PORTAL_URL": process.env.ORDERS_PORTAL_URL
    , "LOYALTY_PORTAL_URL": process.env.LOYALTY_PORTAL_URL
    , "APP_VERSION ": APP_VERSION
  }
  res.json(about);
})

app.get('/environmentSettings', function (req, res) {
  var settings = {
    "PRODUCT_PORTAL_URL": process.env.PRODUCT_PORTAL_URL
    , "CUSTOMER_PORTAL_URL": process.env.CUSTOMERS_PORTAL_URL
    , "FINANCE_PORTAL_URL": process.env.FINANCE_PORTAL_URL
    , "LOYALTY_PORTAL_URL": process.env.LOYALTY_PORTAL_URL
    , "ORDERS_PORTAL_URL": process.env.ORDERS_PORTAL_URL
    , "APP_VERSION ": APP_VERSION
  }
  res.json(settings);
})


// catch 404 and forward to error handler
app.use(function (req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.json({
    message: err.message,
    error: err
  });
});



module.exports = app;
