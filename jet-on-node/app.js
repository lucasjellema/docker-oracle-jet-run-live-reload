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

var APP_VERSION = "0.0.10";

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());


app.use(express.static(path.join(__dirname, 'public')));


app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.get('/about', function (req, res) {
  var about = {
    "about": "About Oracle JET Application - served from Docker Container with automatic reload facility",
    "PORT": process.env.PORT
    }
  res.json(about);
})

if (process.env.CUSTOM_NODE_MODULE) {
  console.log("Loading Custom Module "+'./'+process.env.CUSTOM_NODE_MODULE)
  var customModule = require('./'+process.env.CUSTOM_NODE_MODULE);
  customModule.init(app)
}

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
