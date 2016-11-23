'use strict';

var _ = require('lodash');

angular.module('mean.labManager')
  .controller('vSphereSettingsCtrl', function($scope, vSphereSettingsSvc,  AlertsSvc, $uibModal, WebSocket) {

    $scope.data = vSphereSettingsSvc.query();

    $scope.servers = [
      { name: 'r9b-apc-vsvc-01', ip: '10.20.114.100' },
      { name: 'r9b-myd-vsvc-01', ip: '10.50.114.100' },
      { name: 'r9b-sat-vsvc-01', ip: '10.40.114.100' },
      { name: 'r9b-mbl-vsvc-01', ip: '10.40.114.141' },
      { name: 'r9b-mbl-vsvc-02', ip: '10.40.114.142' },
      { name: 'r9b-mbl-vsvc-03', ip: '10.40.114.143' }
    ];

    $scope.data.$promise.then(function(data) {
      if( _.isEmpty( $scope.data.settings.selectedServer ) ) {
        //$scope.data.settings.selectedServer = { name: $scope.servers[2].name };
        $scope.data.settings.selectedServer = $scope.servers[2];
      }
    }, function(err) {
      console.log('error:', err);
    });


    $scope.serverUpdate = function() {
      var data = $scope.data;
      update(data);
    };

    var update = function(data) {
      var req = vSphereSettingsSvc.update(data);
      req.$promise.then(function() {
        AlertsSvc.addAlert('success', 'Settings updated');
        WebSocket.emit('init');
      },
      function() {
        AlertsSvc.addAlert('danger', 'Error saving settings');
      });
    }

    $scope.open = function() {
      var modalInstance = $uibModal.open({
        templateUrl: 'vSphereAuthModal.html',
        controller: 'modalInstanceCtrl',
        resolve: {
          auth: function() {
            return $scope.data.auth;
          }
        }
      });

      modalInstance.result.then(function(auth) {
        //var data = $scope.data;
        //data.auth = auth;
        $scope.data.auth = auth;
        update($scope.data);
      }, function() { 
        console.log('dismissed');
      });
    }
  }
);

angular.module('mean.labManager')
  .controller('modalInstanceCtrl', function($scope, $uibModalInstance, auth) {
    
    $scope.auth = auth;

    $scope.ok = function() {
      $uibModalInstance.close($scope.auth);
    };
    $scope.cancel = function() {
      $uibModalInstance.dismiss('cancel');
    };
  });
