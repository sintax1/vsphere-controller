'use strict';
/**
 * Alerts Controller
 */
angular.module('mean.labManager')
  .controller('AlertsCtrl', ['$scope', 'AlertsSvc', 
    function($scope, AlertsSvc) {
      $scope.alerts = AlertsSvc.alerts;

      $scope.closeAlert = function(index) {
        AlertsSvc.closeAlert(index);
      };
    }
  ]);
