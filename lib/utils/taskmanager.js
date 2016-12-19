'use strict';

var util = require('util');
var EventEmitter = require('events').EventEmitter;
var _ = require('lodash');

/*
* Task Manager used to monitor and report task progress
*/
function TaskManager( vsphereClient ) {
  var self = this;

  EventEmitter.call(this);

  this.running = false;
  this.propertyCollector = undefined;
  this.version = "";
  this.tasks = {};
  this.filterLocked = false;
  this.filterSpec = {
    attributes: { type: 'PropertyFilterSpec' },
    propSet: [{
      attributes: { type: 'PropertySpec' },
      type: 'Task',
      pathSet: [ 'info.progress', 'info.state' ]
    }],
    objectSet: [{
      attributes: {type: 'ObjectSpec' },
      obj: undefined
    }]
  }

  this.vc = vsphereClient;
  this.propertyCollector = this.vc.serviceContent.propertyCollector;
  this.vc.once('error', function(err) {
    self.emit('error', err);
  });

  return this;
}
util.inherits(TaskManager, EventEmitter);

/*
*  main loop to monitor task progress
*/
TaskManager.prototype.run = function() {
  var self = this;

  function loop() {
    setTimeout(function() {
      if(!self.running) return;
      self.checkForUpdates();
      loop();
    }, 5000);
  }

  // Start the loop if not already running
  if(!self.running) {
    self.running = true;
    loop();
  }
}

/*
* Get a filterspec from vsphere with the task objects
*/
TaskManager.prototype.createFilter = function() {
  var self = this;
  var emitter = new EventEmitter;

  var createFilter = function() {
    if( ! _.isEmpty( self.filterSpec.objectSet ) ) {
      self.filterLocked = true;
      self.vc.runCommand( 'CreateFilter', 
        { _this: self.propertyCollector, spec: self.filterSpec, partialUpdates: true })
        .once('result', function(result) {
          self.propFilter = result.returnval;
          self.filterLocked = false;
          emitter.emit('ready');
        });
    }
  }

  // If the filter already exists, destroy it first
  if( this.propFilter ) {
    this.destroyFilter()
      .once('ready', function() {
        createFilter();
      });
  } else {
    createFilter();
  }

  return emitter;
}

/*
* Destroy a filterspec from vsphere
*/
TaskManager.prototype.destroyFilter = function() {
  var self = this;
  var emitter = new EventEmitter;
  self.filterLocked = true;

  self.vc.runCommand( 'DestroyPropertyFilter', { _this: self.propFilter })
    .once('result', function(result) {
      self.propFilter = undefined;
      self.filterLocked = false;
      emitter.emit('ready');
    });

  return emitter;
}


/*
* Task manager function to get the status of tasks from vsphere
*/
TaskManager.prototype.checkForUpdates = function() {
  var self = this;
  var emitter = new EventEmitter;

  this.vc.runCommand( 'CheckForUpdates', { _this: this.propertyCollector, version: this.version } )
    .once('result', function(result) {

      if ( ! _.isEmpty(result.returnval) ) {
        self.version = result.returnval.version;
        var filters = result.returnval.filterSet;

        if ( ! _.isArray( filters ) )
          filters = [ filters ]
        
        _.forEach( filters, function(filter) {
          var objects = filter.objectSet;

          if ( ! _.isArray( objects ) )
            objects = [ objects ]

          _.forEach( objects, function(object) {
            var taskMORef = object.obj;
            var changes = object.changeSet;

            if ( ! _.isArray( changes ) )
              changes = [ changes ]

            _.forEach( changes, function(change) {
              if ( change && change.name == 'info.progress' && change.val ) {
                var progress = change.val.$value;
                self.tasks[taskMORef.$value] = progress;
              }
              if ( change && change.name == 'info.state') {
                var state = change.val.$value;
                if( state != 'running' ) {
                  self.removeTask(taskMORef);
                }
              }
            }); // for each change
          }); // for each object
        }); // for each filter

        if(! _.isEmpty(self.tasks) ) {
          self.emit( 'progress', self.calculateTotalProgress() );
        }
      } 
    });

  return emitter;
}

TaskManager.prototype.calculateTotalProgress = function() {

  var values = _.values(this.tasks);
  var total = 0;
  if(values.length > 1) {
    var sum = values.map(function(v) { return parseInt(v); })
      .reduce( function(a,b) { return a+b; });
    total = _.round(sum / _.size(this.tasks), 0);
  } else {
    total = values[0];
  }
  return total;
}

/*
* Add a task to the task list to monitor
*/
TaskManager.prototype.addTask = function( taskMORef ) {
  var self = this;

  // Add task to vsphere filterspec
  var index = _.findIndex( this.filterSpec.objectSet, function(o) {
    if(o.obj == undefined) return -1;
    return o.obj.$value == taskMORef.$value;
  });
  var ObjectSpec = {
    attributes: {type: 'ObjectSpec' },
    obj: taskMORef
  }
  if( index == -1 )
    this.filterSpec.objectSet.push( ObjectSpec );
  else
    this.filterSpec.objectSet.splice( index, 1, ObjectSpec );

  // Add task to local task list
  this.tasks[taskMORef.$value] = 0;

  function tryCreateFilter() {
    setTimeout(function() {
      if( !self.filterLocked ) {
        self.createFilter()
          .once('ready', function() {
            self.run();
          });
        return;
      }
      console.log('filter locked');
      tryCreateFilter();
    }, 2000);
  }
  tryCreateFilter();
}
/*
* Remove a task from the task list to monitor
*/
TaskManager.prototype.removeTask = function( taskMORef ) {
  var self = this;

  // Remove task from vsphere filterspec
  _.remove(this.filterSpec.objectSet, function(o) {
    return o.obj.$value == taskMORef.$value;
  });

  // Remove task from local task list
  //delete this.tasks[taskMORef.$value];

  /*
  this.createFilter()
    .once('ready', function() {
      self.run();
    });
  */

  function tryCreateFilter() {
    setTimeout(function() {
      if( !self.filterLocked ) {
        self.createFilter()
          .once('ready', function() {
            self.run();
          });
        return;
      }
      console.log('destroy: filter locked');
      tryCreateFilter();
    }, 2000);
  }
  tryCreateFilter();

  if(this.filterSpec.objectSet.length <= 0) {
    this.running = false;
  }
}

module.exports = TaskManager;
