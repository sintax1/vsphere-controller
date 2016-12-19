'use strict';

function Errors() {
  // Container class for custom errors
};

Errors.prototype.CustomError = function CustomError(message, extra) {
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.message = message;
  this.extra = extra;
};
require('util').inherits(Errors.prototype.CustomError, Error);

Errors.prototype.AuthenticationFailedError = function AuthenticationFailedError() {
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.message = "Login Failed. Invalid Username or Password.";
};
require('util').inherits(Errors.prototype.AuthenticationFailedError, Error);

Errors.prototype.TemplateFolderError = function TemplateFolderError(msg) {
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.message = msg;
};
require('util').inherits(Errors.prototype.TemplateFolderError, Error);

Errors.prototype.DuplicateNameError = function DuplicateNameError(msg) {
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.message = msg;
};
require('util').inherits(Errors.prototype.DuplicateNameError, Error);

Errors.prototype.ObjectAlreadyExistsError = function ObjectAlreadyExistsError(msg) {
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.message = msg;
};
require('util').inherits(Errors.prototype.ObjectAlreadyExistsError, Error);

module.exports = Errors;
