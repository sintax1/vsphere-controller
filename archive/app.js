'use strict';

/*
 * Defining the Package
 */
var Module = require('meanio').Module;

var mean = require('meanio');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
var mongoose = require('mongoose');
var config = mean.getConfig();

var LabManager = new Module('labManager');

/*
 * All Lab Manager packages require registration
 * Dependency injection is used to define required modules
 */
LabManager.register(function(app, auth, database, https) {

  var io = require('./server/config/socketio')(https);

  LabManager.io = io;

  LabManager.menus.add({
    title: 'Labs',
    link: 'labs',
    roles: ['authenticated'],
    menu: 'main'
  });

  // Set views path, template engine and default layout
  app.set('views', __dirname + '/server/views');

  // Server side session storage
  var sessionMiddleWare = session({
    store: new MongoStore({ mongooseConnection: mongoose.connection }),
    secret: config.secret,
    key: config.sessionName,
    cookie: { 
      secure: true, 
      expires: Date.now() + (30 * 86400 * 1000) 
    },
    resave: true,
    saveUninitialized: true
  });

  // Server side session storage accessible to websocket
  io.use(function(socket, next) {
    sessionMiddleWare(socket.request, socket.request.res, next);
  });

  app.use(sessionMiddleWare);

  LabManager.angularDependencies(['mean.system', 'mean.users', 'ui.bootstrap']);

  LabManager.routes(app, io);

  return LabManager;
});

