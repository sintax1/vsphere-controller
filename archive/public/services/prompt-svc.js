'use strict';

angular.module('mean.labManager')
.factory(
  'prompt',
    function( $window, $q ) {
      // Define promise-based prompt() method.
      function prompt( message, defaultValue ) {
        var defer = $q.defer();
        // The native prompt will return null or a string.
        var response = $window.prompt( message, defaultValue );
        if ( response === null ) {
          defer.reject();
        } else {
          defer.resolve( response );
        }
        return( defer.promise );
      }
      return( prompt );
    }
);
