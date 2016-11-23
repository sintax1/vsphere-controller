'use strict';

angular.module('mean.labManager')
.factory('WebSocket', function($rootScope) {
  var socket = io();

  return {
    on: function(eventName, callback) {
      socket.on(eventName, function() {
        console.log('socket.on:', eventName);
        var args = arguments;
        $rootScope.$apply(function() {
          callback.apply(socket, args);
        });
      });
    },
    emit: function(eventName, data, callback) {
      socket.emit(eventName, data, function() {
        console.log('socket.emit:', eventName);
        var args = arguments;
        $rootScope.$apply(function() {
          if (callback) {
            callback.apply(socket, args);
          }
        });
      });
    }
  };
});
