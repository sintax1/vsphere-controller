'use strict';

var labs = require('../controllers/labs_websocket');
var util = require('util');

exports.connect = function(socket){

  socket.once('error', function(err) {
    console.log(err);
  });

  // Callback function for async operations
  var callbackEmit = function(data) {
    console.log('callbackEmit', data);
    socket.emit(data.type, data.data);
  };

  var sendMsg = function(msg) {
    callbackEmit({type: 'message', data: msg});
  };

  socket.on('authenticate', function(data, callback) {
    console.log('authenticate', data);
  });

  // Websocket Disconnect
  socket.on('disconnect', function() {
  });

  var getlabs = function() {
    sendMsg('Getting labs...');
    labs.list()
      .on('message', function(message) {
        sendMsg(message);
      })
      .once('labs', function(labs) {
        callbackEmit({type: 'update', data: {labs: labs}});
        sendMsg('Labs updated');
      })
      .once('error', function(err) {
        callbackEmit({type: 'err', data: err});
      });
  };

  // Websocket init
  socket.on('init', function() {
    socket.request.session.reload(function(err) {
      var vsphere_info = socket.request.session.vsphere_info;
      labs.updateSettings(vsphere_info);
      getlabs();
    });
  });

  // Websocket update
  socket.on('update', function() {
    getlabs();
  });

  // Get a single Lab
  socket.on('get', function(labId) {
    labs.get(labId)
      .once('error', function(err) {
        callbackEmit({type: 'err', data: err});
      })
      .once('result', function(result) {
        callbackEmit(result);
      })
      .on('lab', function(lab) {
        callbackEmit({type: 'lab', data: lab});
      });
  });

  // Clone a Lab
  socket.on('clone', function(lab) {
    labs.clone(lab.id, lab.students)
      .on('message', function(message) {
        sendMsg(message);
      })
      .on('error', function(err) {
        callbackEmit({type: 'err', data: err});
      })
      .once('result', function(result) {
        callbackEmit(result);
      })
      .on('lab', function(lab) {
        callbackEmit({type: 'lab', data: lab});
      });
  });

  // Delete a Lab
  socket.on('delete', function(lab) {
    labs.delete(lab.id, lab.students)
      .on('error', function(err) {
        callbackEmit({type: 'err', data: err});
      })
      .on('message', function(message) {
        sendMsg(message);
      })
      .on('lab', function(lab) {
        callbackEmit({type: 'lab', data: lab});
      })
      .once('result', function(result) {
        callbackEmit(result);
      });
  });

  // Start a Lab
  socket.on('start', function(lab) {
    labs.start(lab.id)
      .on('error', function(err) {
        callbackEmit({type: 'err', data: err});
      })
      .on('lab', function(lab) {
        callbackEmit({type: 'lab', data: lab});
      })
      .on('message', function(message) {
        sendMsg(message);
      })
      .once('result', function(result) {
        callbackEmit(result);
      });
  });

  // Stop a Lab
  socket.on('stop', function(lab) {
    labs.stop(lab.id)
      .on('error', function(err) {
        callbackEmit({type: 'err', data: err});
      })
      .on('lab', function(lab) {
        callbackEmit({type: 'lab', data: lab});
      })
      .on('message', function(message) {
        sendMsg(message);
      })
      .once('result', function(result) {
        callbackEmit(result);
      });
  });
};
