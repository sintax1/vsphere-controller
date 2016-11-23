'use strict';

var settings = require('../controllers/vSphereSettings');

//var vsphere = require('../controllers/vsphere');
//var labs = require('../controllers/labs');

var socketctrl = require('../controllers/websocket.js');

module.exports = function(labManager, app, io) {

  /*
  *  Websocket Routes
  */
  io.sockets.on('connect', socketctrl.connect);

  // Settings API
  app.route('/api/vsphere')
    .get(settings.get)
    .put(settings.update);

};
