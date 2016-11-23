'use strict';
/**
 * Confirm Dialog Provider
 */

angular.module('mean.labManager')
.factory(
  'confirm',
  function( $window, $q ) {
      // Define promise-based confirm() method.
    function confirm( message ) {
      var defer = $q.defer();
      // The native confirm will return a boolean.
      if ( $window.confirm( message ) ) {
        defer.resolve( true );
      } else {
        defer.reject( false );
      }
      return( defer.promise );
    }
    return( confirm );
  }
);

