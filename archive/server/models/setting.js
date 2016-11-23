'use strict';

/**
 * Module dependencies.
 */
var mongoose  = require('mongoose');

var Schema    = mongoose.Schema;

/**
 * Setting Schema
 */

var SettingSchema = new Schema({
  vsphere: {
    host: {
      type: String,
      required: true
    },
    user: {
      type: String,
      required: true
    },
    password: {
      type: String,
      required: true
    }
  }
});

/**
 * Pre-save hook
 */
/*
// TODO: test vsphere creds
UserSchema.pre('save', function(next) {
  if (this.isNew && this.provider === 'local' && this.password && !this.password.length)
    return next(new Error('Invalid password'));
  next();
});
*/

/**
 * Methods
 */

/**
 * HasRole - check if the user has required role
 *
 * @param {String} plainText
 * @return {Boolean}
 * @api public
 */
/*
// TODO: Create method to test vsphere connection
UserSchema.methods.hasRole = function(role) {
  var roles = this.roles;
  return roles.indexOf('admin') !== -1 || roles.indexOf(role) !== -1;
};
*/


/**
 * Hide security sensitive fields
 *
 * @returns {*|Array|Binary|Object}
 */
SettingSchema.methods.toJSON = function() {
  var obj = this.toObject();
  if (obj.vsphere) {
    delete obj.vsphere.password;
  }
  return obj;
};
module.exports = mongoose.model('Setting', SettingSchema);
