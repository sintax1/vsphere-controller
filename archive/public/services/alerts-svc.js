'use strict';
/**
 * Alerts Service Provider
 */

angular.module('mean.labManager')
  .service('AlertsSvc', function ($timeout) {

    const service = {};

    service.alerts = [];

    service.addAlert = function(type, msg) {
      type = typeof type !== 'undefined' ? type : '';

      service.alerts.push({
        type: type,
        msg: msg
      });

      $timeout(function() {
        service.closeAlert(0);
      }, 30000);

    };

    service.closeAlert = function(index) {
      service.alerts.splice(index, 1);
    };

    return service;
  }
);
