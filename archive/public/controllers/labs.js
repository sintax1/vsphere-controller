'use strict';

/**
 * Labs Controller
 */
angular.module('mean.labManager')
  .controller('LabsCtrl',
    function($scope, $timeout, AlertsSvc, Labs, prompt, confirm, WebSocket) {

      $scope.server_message = '';
      $scope.labs = [];

      WebSocket.on('message', function(message){
        $scope.server_message = message;
      });

      WebSocket.on('alert', function(message){
        AlertsSvc.addAlert('info', message);
      });

      WebSocket.on('connect', function(){
        console.log('connected');
        // Initialize the labs data
        WebSocket.emit('init');
      });

      WebSocket.on('err', function(err){
        AlertsSvc.addAlert('danger', err);
        $scope.server_message = err;
      });

      WebSocket.on('update', function (data) {
        $scope.labs = data.labs;
      });

      WebSocket.on('lab', function(lab) {
        var labFound = false;
        for (var x = 0; x < $scope.labs.length; x++) {
          if ($scope.labs[x].hasOwnProperty('_id') && $scope.labs[x]._id === lab._id ) {
            for (var k in lab) $scope.labs[x][k] = lab[k];
            labFound = true;
          }
        }
        if ( !labFound ) {
          $scope.labs.push(lab);
        }
      });


      // Get a single lab
      //WebSocket.emit('get', $scope.labs[0]._id);

      $scope.clone = function(index) {
        var lab = $scope.labs[index];

        prompt( 'Cloning lab: ' + lab.name + '. Enter the list of students that require the lab', '1,2,3,4,5,6,7,8,9,10,11,12,13,14' ).then(
          function( students ) {
            // User acknowleged start clone
            WebSocket.emit('clone', {id: lab._id, students: students});
          },
          function() {
            // User cancelled clone
            return;
          }
        );
      };     

      // Delete lab instances 
      $scope.delete = function(index) {
        var lab = $scope.labs[index];
        confirm( 'OK to delete student lab \'' + lab.name + '\' ?' ).then(
          function( response ) {
            // User acknowleged delete
            WebSocket.emit('delete', {id: lab._id});
          },
          function() {
            // User cancelled delete
            return;
          }
        );
      };     

      // Start lab function
      $scope.start = function(index) {
        var lab = $scope.labs[index];

        confirm( 'OK to power on lab \'' + lab.name + '\' ?' ).then(
          function( response ) {
            // User acknowleged start labs
            WebSocket.emit('start', {id: lab._id});
          },
          function() {
            // User cancelled start lab
            return;
          }
        );
      };

      // Stop lab function
      $scope.stop = function( index ) {
        var lab = $scope.labs[index];

        confirm( 'OK to power off lab \'' + lab.name + '\' ?' ).then(
          function( response ) {
            WebSocket.emit('stop', {id: lab._id});
          },
          function() {
            return;
          }
        );
      };
    }
  );

