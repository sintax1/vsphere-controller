'use strict';
/**
 * Labs Service Provider
 */

angular.module('mean.labManager')
  .factory('Labs', ['$resource', 
    function($resource) {
      return $resource('/api/labs/:labId/:action', {
        labId: '@_id',
        action: '@action'
      }, {
        update: { method: 'PUT' },
        action:  { method: 'PUT' }
      });
    }
  ]);
