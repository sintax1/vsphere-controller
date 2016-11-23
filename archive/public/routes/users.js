'use strict';

//Setting up route
angular.module('mean.labManager').config(['$meanStateProvider',
  function($meanStateProvider) {
        
    // states for users
    $meanStateProvider
      .state('auth', {
        url: '/auth',
        abstract: true,
        templateUrl: 'labManager/views/users/index.html'
      })
      .state('auth.login', {
        url: '/login',
        templateUrl: 'labManager/views/users/login.html',
        resolve: {
          loggedin: function(MeanUser) {
            return MeanUser.checkLoggedOut();
          }
        }
      })
      .state('forgot-password', {
        url: '/forgot-password',
        templateUrl: 'labManager/views/users/forgot-password.html',
        resolve: {
          loggedin: function(MeanUser) {
            return MeanUser.checkLoggedOut();
          }
        }
      })
      .state('reset-password', {
        url: '/reset/:tokenId',
        templateUrl: 'labManager/views/users/reset-password.html',
        resolve: {
          loggedin: function(MeanUser) {
            return MeanUser.checkLoggedOut();
          }
        }
      })
      .state('vsphere-settings', {
        url: '/vsphere/settings',
        templateUrl: 'labManager/views/users/settings.html'
      })
      .state('labs', {
        url: '/labs',
        templateUrl: 'labManager/views/users/labs.html'
      });
  }
]);
