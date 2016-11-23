(function() {
  'use strict';

  angular.module('mean.labManager')
    .controller('StarterController', ['$scope', 'Global', 
      function StarterController($scope, Global) {
        // Original scaffolded code.
        $scope.global = Global;
        $scope.package = {
          name: 'labManager'
        };
      }
    ])
})();
