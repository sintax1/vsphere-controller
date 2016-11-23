'use strict';

/**
 * Module dependencies.
 */
var mongoose  = require('mongoose');

var Schema    = mongoose.Schema;

/**
 * Lab Schema
 */

var LabSchema = new Schema({
    resourceid: {
      type: String,
      unique: true,
      required: true
    },
    name: {
      type: String,
      unique: true,
      required: true
    },
    /*
    instances: {
      type: Number,
      required: true,
      default: 0
    },
    */
    instances: {
      type: Array,
      default: []
    },
    active: {
      type: Boolean,
      required: true
    },
    status: {
      type: String,
      required: false,
      default: 'Stopped'
    }
});

module.exports = mongoose.model('Lab', LabSchema);
