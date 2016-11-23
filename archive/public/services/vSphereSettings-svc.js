'use strict';
/**
 * vSphere Settings Service Provider
 */

angular.module('mean.labManager')
  .factory('vSphereSettingsSvc', ['$resource', 
    function($resource) {
      return $resource('/api/vsphere', {}, {
        update: { method: 'PUT' },
        query: { method: 'GET', isArray: false }
      });
    }
  ]);
