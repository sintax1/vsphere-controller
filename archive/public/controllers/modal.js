'use strict';

var util = require('util');

angular.module('mean.labManager')
  .controller('modalCtrl', function($scope, vSphereSettingsSvc, $uibModal) {

      $scope.data = vSphereSettingsSvc.query();

      $scope.open = function() {
        var modalInstance = $uibModal.open({
          templateUrl: 'vSphereAuthModal.html',
          controller: 'modalInstanceCtrl',
          resolve: {
            auth: function() {
              return $scope.data;
            }
          }
        });

        modalInstance.result.then(function(data) {
          vSphereSettingsSvc.update(data);
        }, function() { 
          console.log('dismissed');
        });
      }
    }
  );

angular.module('mean.labManager')
  .controller('modalInstanceCtrl', function($scope, $uibModalInstance, data) {
    
    $scope.data = data;

    $scope.ok = function() {
      $uibModalInstance.close($scope.data);
    };
    $scope.cancel = function() {
      $uibModalInstance.dismiss('cancel');
    };
  });
