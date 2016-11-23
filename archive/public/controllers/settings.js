'use strict';

angular.module('mean.labManager')
  .controller('SettingsCtrl', function($scope, $location, VSphereSettings, AlertsSvc) {

      $scope.settings = VSphereSettings.query();
     
      $scope.messages = [];
      
      $scope.input = {
        type: 'password',
        placeholder: 'Password',
        tooltipText: 'Show password',
        iconClass: ''
      };

      $scope.togglePasswordVisible = function() {
        $scope.input.type = $scope.input.type === 'text' ? 'password' : 'text';
        $scope.input.placeholder = $scope.input.placeholder === 'Password' ? 'Visible Password' : 'Password';
        $scope.input.iconClass = $scope.input.iconClass === 'icon_hide_password' ? '' : 'icon_hide_password';
        $scope.input.tooltipText = $scope.input.tooltipText === 'Show password' ? 'Hide password' : 'Show password';
      };

      $scope.update = function(index) {
        var setting = $scope.settings;

        VSphereSettings.update(setting, function (value, resp) {
          // Success
          AlertsSvc.addAlert('success', 'Settings Saved');
        }, function (resp) {
          // Error
          AlertsSvc.addAlert('danger', 'Error: ' + resp.status + ' ' + resp.statusText);
        });
      }

    }
  );
