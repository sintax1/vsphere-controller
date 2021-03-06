"use strict";
/*
  client.js
  Implements the vsphere Client() class
*/

var EventEmitter = require('events').EventEmitter,
  util = require('util'),
  nvs = require('node-vsphere-soap'),
  types = require('./types'),
  Joi = require('joi'),
  _ = require('lodash'),
  //parseString = require('xml2js').parseString,
  //stripPrefix = require('xml2js').processors.stripPrefix;
  CustomErrors = require('./errors'),
  TaskManager = require('./utils/taskmanager');

  var errors = new CustomErrors();

// Client class
function Client( hostname, username, password, sslVerify) {

  var self = this;

  EventEmitter.call(this);

  this.serviceContent = undefined;

  this._hostname = hostname;
  this._username = username;
  this._password = password;
  this._sslVerify = sslVerify;

  // this calls the node-vsphere-soap module to create a session with the vCenter server
  // this also saves a copy of the serviceContent object for later use
  var vc = new nvs.Client( hostname, username, password, sslVerify);
  vc.once('ready', function() {
    self.serviceContent = vc.serviceContent;
    self.emit('ready');
  })
  .once('error', function(err) {
    self.emit('error', err);
  });

  this.vc = vc;

  return this;
}

util.inherits(Client, EventEmitter);

// run arbitrary vSphere API command
Client.prototype.runCommand = function( command, args) {
  return this.vc.runCommand( command, args );
};

// get ManagedObjectReferences of objects in a container that are a certain type
Client.prototype.getMORefsInContainerByType = function( MORefFolder, type ) {

  return this.getMORefsInContainerByTypePropertyArray( MORefFolder, type, undefined );

};

// get ManagedObjectReferences of objects in a container that are a certain type
// and have a certain name or names
Client.prototype.getMORefsInContainerByTypeName = function( MORefFolder, type, nameArray ) {

  var self = this;
  var emitter = new EventEmitter;

  // convert nameArray to an array if only one name given
  if( typeof nameArray === 'string' && ! _.isArray(nameArray)) {
    nameArray = [ nameArray ];
  }

  this.getMORefsInContainerByTypePropertyArray( MORefFolder, type, 'name' )
  .once('result', function(result) {

    var allObjsArray = result.returnval.objects;
    var objArray = [];
    var processed = 0;

    // convert allObjsArray to array if onlyone object returned
    if( typeof allObjsArray === 'object' && ! _.isArray(allObjsArray)) {
      allObjsArray = [ allObjsArray ];
    }

    _.forEach( allObjsArray, function( object ) {

      if( _.includes( nameArray, object.propSet.val['$value']) ) {
        objArray.push(object.obj);
      }
      processed++;
      if( processed == allObjsArray.length ) {
        if(objArray.length == 1) {
          emitter.emit('result', objArray[0]);
        } else {
          emitter.emit('result', objArray);
        }
      }
    });

  })
  .once('error', function(err) {
    emitter.emit('error', err);
  });

  return emitter;
};

// get ManagedObjectReferences of objects in a container that are a certain type
// and only return certain properties
Client.prototype.getMORefsInContainerByTypePropertyArray = function( MORefFolder, type, propertyArray ) {

  var viewManager = this.vc.serviceContent.viewManager;
  var propertyCollector = this.vc.serviceContent.propertyCollector;

  var containerView;

  var emitter = new EventEmitter;
  var self = this;

  this.runCommand('CreateContainerView', { _this: viewManager,
                                        container: MORefFolder,
                                        type: type,
                                        recursive: true})
    .once('result', function(result) {

      containerView = result.returnval;

      var propertySpec = {};

      if( propertyArray && typeof propertyArray === 'object' && propertyArray.length > 0) {
        propertySpec = {
          attributes: {'xsi:type': 'PropertySpec'},
          type: type,
          all: false,
          pathSet: propertyArray
        };
      } else if( propertyArray && typeof propertyArray === 'string') {
        propertySpec = {
          attributes: {'xsi:type': 'PropertySpec'},
          type: type,
          all: false,
          pathSet: [ propertyArray ]
        };
      } else {
        propertySpec = {
          attributes: {'xsi:type': 'PropertySpec'},
          type: type,
          all: true
        };
      }
      Joi.validate(propertySpec, types.schemaPropertySpec, function(err, value) {
        if(err) {
          emitter.emit('error', err);
          return;
        }
      });
      var traversalSpec = {
        attributes: {'xsi:type': 'TraversalSpec'},
        type: 'ContainerView',
        path: 'view',
        skip: false
      };
      Joi.validate(traversalSpec, types.schemaTraversalSpec, function(err, value) {
        if(err) {
          emitter.emit('error', err);
          return;
        }
      });

      var objectSpec = {
        attributes: {'xsi:type': 'ObjectSpec'},
        obj: containerView,
        skip: true,
        selectSet: [ traversalSpec ]
      };
      Joi.validate(objectSpec, types.schemaObjectSpec, function(err, value) {
        if(err) {
          emitter.emit('error', err);
          return;
        }
      });

      var propertyFilterSpec = {
        attributes: {'xsi:type': 'PropertyFilterSpec'},
        propSet: [ propertySpec ],
        objectSet: [ objectSpec ]
      };
      Joi.validate(propertyFilterSpec, types.schemaPropertyFilterSpec, function(err, value) {
        if(err) {
          emitter.emit('error', err);
          return;
        }
      });

      self.runCommand('RetrievePropertiesEx', { _this: propertyCollector, specSet: [ propertyFilterSpec ], options: {} })
        .once('result', function(result){
          emitter.emit('result', result);
        })
        .once('error', function(err){
          emitter.emit('error', err);
        });
    })
    .once('error', function(err){
      emitter.emit('error', err);
    });

  return emitter;
};

// retrieve the properties of a specific object by its ManagedObjectReference
Client.prototype.getMORefProperties = function( MORef, propertyArray ) {

  var viewManager = this.vc.serviceContent.viewManager;
  var propertyCollector = this.vc.serviceContent.propertyCollector;
  var rootFolder = this.vc.serviceContent.rootFolder;

  var containerView;

  var emitter = new EventEmitter;
  var self = this;

  self.runCommand('CreateContainerView', { _this: viewManager,
                                        container: rootFolder,
                                        type: MORef.attributes.type,
                                        recursive: true})
    .once('result', function(result) {

      containerView = result.returnval;

      var propertySpec = {};

      if( propertyArray && typeof propertyArray === 'object' && propertyArray.length > 0) {
        propertySpec = {
          attributes: {'xsi:type': 'PropertySpec'},
          type: MORef.attributes.type,
          all: false,
          pathSet: propertyArray
        };
      } else if( propertyArray && typeof propertyArray === 'string') {
        propertySpec = {
          attributes: {'xsi:type': 'PropertySpec'},
          type: MORef.attributes.type,
          all: false,
          pathSet: [ propertyArray ]
        };
      } else {
        propertySpec = {
          attributes: {'xsi:type': 'PropertySpec'},
          type: MORef.attributes.type,
          all: true
        };
      }
      Joi.validate(propertySpec, types.schemaPropertySpec, function(err, value) {
        if(err) {
          emitter.emit('error', err);
          return;
        }
      });

      var traversalSpec = {
        attributes: {'xsi:type': 'TraversalSpec'},
        type: 'ContainerView',
        path: 'view',
        skip: false
      };
      Joi.validate(traversalSpec, types.schemaTraversalSpec, function(err, value) {
        if(err) {
          emitter.emit('error', err);
          return;
        }
      });

      var objectSpec = {
        attributes: {'xsi:type': 'ObjectSpec'},
        obj: MORef
      };
      Joi.validate(objectSpec, types.schemaObjectSpec, function(err, value) {
        if(err) {
          emitter.emit('error', err);
          return;
        }
      });

      var propertyFilterSpec = {
        attributes: {'xsi:type': 'PropertyFilterSpec'},
        propSet: [ propertySpec ],
        objectSet: [ objectSpec ]
      };
      Joi.validate(propertyFilterSpec, types.schemaPropertyFilterSpec, function(err, value) {
        if(err) {
          emitter.emit('error', err);
          return;
        }
      });

      self.runCommand('RetrievePropertiesEx', { _this: propertyCollector, specSet: [ propertyFilterSpec ], options: {} })
        .once('result', function(result){
          emitter.emit('result', result);
        })
        .once('error', function(err){
          emitter.emit('error', err);
        });
    })
    .once('error', function(err){
      emitter.emit('error', err);
    });

  return emitter;
};

// gets the power state of all VMs in a certain container
// this function returns information in the following format
Client.prototype.getVMinContainerPowerState = function( MORefFolder ) {

  var self = this;
  var emitter = new EventEmitter;

  this.getMORefsInContainerByTypePropertyArray( MORefFolder, 'VirtualMachine', 'summary')
    .once('result', function(result) {

      // if no vms, return empty set
      if( typeof result == 'undefined' || _.isEmpty(result)) {
        emitter.emit('result', []);
        return;
      }

      var data = result.returnval.objects;
      var resultArray = [];

      if( ! _.isArray(data) ) {
        data = [ data ];
      }

      _.forEach(data, function(vm) {
        resultArray.push({
          obj: vm.obj,
          name: vm.propSet.val.config.name,
          powerState: vm.propSet.val.runtime.powerState
        });
        if( resultArray.length === data.length ) {
          emitter.emit('result',resultArray);
        }
      });
    })
    .once('error', function(err){
      emitter.emit('error', err);
    });

  return emitter;

};

// this monitors an object via its ManagedObjectReference, only watching the given filtered Properties (filterProps).
// when the properties from the filter named by endWaitProps equal one of the expectedVals, the result event is emitted.
// This function was ported from vSphere WS Java SDK
Client.prototype.waitForValues = function( MORef, filterProps, endWaitProps, expectedVals) {

  var self = this;
  var serviceContent = this.serviceContent;

  var emitter = new EventEmitter;

  if( ! _.isArray(filterProps) ) {
    filterProps = [ filterProps ];
  }
  if( ! _.isArray(endWaitProps) ) {
    endWaitProps = [ endWaitProps ];
  }
  if( ! _.isArray(expectedVals) ) {
    expectedVals = [ expectedVals ];
  }

  // utilize a separate client session to prevent filter clobbering from simultaneous calls to this function
  var singletonClient = new nvs.Client( self._hostname, self._username, self._password, self._sslVerify);
  singletonClient.once('ready', function() {

    // create propertyFilterSpec for upcoming createFilter command
    var objectSpec = {
      attributes: {'xsi:type': 'ObjectSpec'},
      obj: MORef,
      skip: false,
    };
    Joi.validate(objectSpec, types.schemaObjectSpec, function(err, value) {
      if(err) {
        emitter.emit('error', err);
        return;
      }
    });
    var propertySpec = {
      attributes: {'xsi:type': 'PropertySpec'},
      type: MORef.attributes.type,
      pathSet: filterProps
    };
    Joi.validate(propertySpec, types.schemaPropertySpec, function(err, value) {
      if(err) {
        emitter.emit('error', err);
        return;
      }
    });

    var propertyFilterSpec = {
      attributes: {'xsi:type': 'PropertyFilterSpec'},
      propSet: [ propertySpec ],
      objectSet: [ objectSpec ]
    };
    Joi.validate(propertyFilterSpec, types.schemaPropertyFilterSpec, function(err, value) {
      if(err) {
        emitter.emit('error', err);
        return;
      }
    });

    var version = "";
    var reached = false;

    singletonClient.runCommand('CreateFilter', { _this: singletonClient.serviceContent.propertyCollector, spec: propertyFilterSpec, partialUpdates: true })
    .once('result', function(result) {

      var filterSpecRef = result.returnval;
      var version = "";

      var found = false;

      var toCompare = {};
      var finalReturnVals = {};

      ( function waitForUpdates() {

        singletonClient.runCommand('WaitForUpdatesEx', { _this: singletonClient.serviceContent.propertyCollector, version: version, options: {} })
        .once('result', function(result) {
          if( _.isEmpty(result.returnval) || _.isEmpty(result.returnval.filterSet) ) {
            waitForUpdates();
            return;
          }
          version = result.returnval.version;

          var filterSetArray = result.returnval.filterSet;
          if( ! _.isArray(filterSetArray) ) {
            filterSetArray = [ result.returnval.filterSet ];
          }
          
          _.forEach( filterSetArray, function( filterSet ) {
            var objSetArray = filterSet.objectSet;
            if( ! _.isArray(objSetArray) ) {
              objSetArray = [ objSetArray ];
            }
            _.forEach( objSetArray, function( objSet ) {
              if( objSet.kind == 'modify' ||
                objSet.kind == 'enter' ||
                objSet.kind == 'leave' ) {
                var changeSetArray = objSet.changeSet;
                if( ! _.isArray(changeSetArray) ) {
                  changeSetArray = [ changeSetArray ];
                }

                _.forEach( changeSetArray, function( changeSet ) {

                  _.forEach( endWaitProps, function(prop) {
                    if( changeSet['name'].indexOf(prop) >= 0) {
                      if(changeSet['op'] == 'remove') {
                        toCompare[prop] = "";
                      } else {
                        toCompare[prop] = changeSet.val;
                      }
                    }
                  });

                  _.forEach( filterProps, function(prop) {
                    if( changeSet['name'].indexOf(prop) >= 0) {
                      if(changeSet['op'] == 'remove') {
                        finalReturnVals[prop] = "";
                      } else {
                        finalReturnVals[prop] = changeSet.val;
                      }
                    }
                  });
                });
              } // end if
            });

            var compared = 0;
            while(compared < _.keysIn( toCompare ).length ) {
              
              for( var key in toCompare) {
                if( expectedVals.indexOf(toCompare[key]['$value']) > -1 ) {
                  found = true;
                }
                compared++;
              }
            }

            if(found) {
              // emit result
              emitter.emit('result', finalReturnVals);
              singletonClient.close();        
            } else {
              if( compared == _.keysIn( toCompare ).length && !found) {
                // no relevant updates yet -- check again
                waitForUpdates();
                return;
              }
            }
          });
        })
        .once('error', function(err) {
          // issue with WaitForUpdatesEx
          emitter.emit('error',err);
          singletonClient.close();

        })
      }()); // end waitForUpdates()
    })
    .once('error', function(err) {
      // issue with CreateFilter
      emitter.emit('error',err);
      singletonClient.close();
    });
  })
  .once('error', function(err) {
    // issue creating second client
    emitter.emit('error',err);
    singletonClient.close();
  });

  return emitter;

};

// run a power operation on a single VM or array of VMs by name
Client.prototype.powerOpVMByName = function( nameArray, powerOp ) {

  var self = this;
  var emitter = new EventEmitter;

  // _.isUndefined()
  if( !_.isArray(nameArray) ) {
    nameArray = [ nameArray ];
  }

  self.getMORefsInContainerByTypePropertyArray( self.serviceContent.rootFolder, 'VirtualMachine', 'name')
  .once('error', function(err) {
    emitter.emit('error', err);
  })
  .once('result', function(result) {
    var allVMsArray = result.returnval.objects;
    var vmObjArray = [];
    var processed = 0;
    var cmdRun = false;

    _.forEach( allVMsArray, function( vmObj ) {
      if( _.includes( nameArray, vmObj.propSet.val['$value']) ) {
        vmObjArray.push(vmObj.obj);
      }
      if(vmObjArray.length == nameArray.length && !cmdRun) {
        cmdRun = true;
        self.powerOpVMByMORef( vmObjArray, powerOp )
        .once('error', function(err) {
          emitter.emit('error', err);
        })
        .once('result', function(result) {
          emitter.emit('result', result);
        });
      }
      processed++;
      if(processed == allVMsArray.length && !cmdRun) {
        emitter.emit('error', 'One or more specified VMs not found!');
      }
    });


  });

  return emitter;

};

// run a power operation on a single VM or array of VMs by ManagedObjectReference
Client.prototype.powerOpVMByMORef = function( MORefs, powerOp ) {

  var self = this;
  var emitter = new EventEmitter;

  if( _.isUndefined(MORefs) || _.isEmpty(MORefs)) {
    powerOp = null;
    emitter.emit('error', 'No ManagedObjectReference(s) given!');
  }

  var powerCommand = null;

  switch( powerOp ) {
    case 'powerOn':
      powerCommand = 'PowerOnVM_Task';
      break;
    case 'powerOff':
      powerCommand = 'PowerOffVM_Task';
      break;
    case 'reset':
      powerCommand = 'ResetVM_Task';
      break;
    case 'standby':
      powerCommand = 'StandbyGuest';
      break;
    case 'shutdown':
      powerCommand = 'ShutdownGuest';
      break;
    case 'reboot':
      powerCommand = 'RebootGuest';
      break;
    case 'suspend':
      powerCommand = 'SuspendVM_Task';
      break;
    default:
      emitter.emit('error', 'Invalid powerOp given!');
  }

  if( powerCommand ) {
    // if one VM
    if( ! _.isArray(MORefs)) {
      MORefs = [ MORefs ];
    }
    // if multiple VMs
    var resultArray = [];

    _.forEach(MORefs, function(MORef) {
      var errorEncountered = false;
      self.runCommand( powerCommand, { _this: MORef })
      .once('result', function(result){
        var taskMORef = result.returnval;
        self.waitForValues( taskMORef , ['info.state','info.error'], 'state', ['success','error'])
        .once('result', function( result ) {
          if( result['info.error'] == undefined ) {
            resultArray.push( { obj: MORef, result: result['info.state'] } );
          } else {
            resultArray.push( { obj: MORef, result: result['info.error'] } );
            var errorEncountered = true;
          }
          if(resultArray.length === MORefs.length) {
            if(errorEncountered) {
              emitter.emit('error', resultArray);
            } else {
              emitter.emit('result', resultArray);
            }
          } 
        })
        .once('error', function( err ) {
          emitter.emit('error',err);
        });
      })
      .once('error', function(err){
        emitter.emit('error',err);
      });
    });
  }

  return emitter;
};

// get the current time on the vCenter Server
Client.prototype.getCurrentTime = function( MORefFolder, type, propertyArray ) {

  var emitter = new EventEmitter;
  var self = this;

  this.runCommand('CurrentTime', { _this: 'ServiceInstance'} )
    .once('result', function (result) {
      emitter.emit('result', result.returnval);
    })
    .once('error', function (err) {
      emitter.emit('error', err);
    });

  return emitter;
};

// Close the session
Client.prototype.logout = function() {

  var emitter = new EventEmitter;
  var self = this;

  this.runCommand('Logout', { _this: self.serviceContent.sessionManager })
    .once('result', function (result) {
      emitter.emit('result', result.returnval);
    })
    .once('error', function (err) {
      emitter.emit('error', err);
    });

  return emitter;
};


// Retrieve all Datacenters
Client.prototype.getDatacenters = function() {

  var emitter = new EventEmitter;
  var self = this;

  var rootFolder = self.serviceContent.rootFolder;

  this.getMORefsInContainerByTypePropertyArray( rootFolder, 'Datacenter', ['name', 'vmFolder'] )
    .once('result', function(result) {
      emitter.emit('result', result);
    })
    .once('error', function(err) {
      emitter.emit('error', err);
    });

  return emitter;
};

// Retrieve all Hosts
Client.prototype.getHosts = function() {

  var emitter = new EventEmitter;
  var self = this;

  var rootFolder = self.serviceContent.rootFolder;

  this.getMORefsInContainerByTypePropertyArray( rootFolder, 'HostSystem', ['name', 'summary'] )
    .once('result', function(result) {
      emitter.emit('result', result);
    })
    .once('error', function(err) {
      emitter.emit('error', err);
    });

  return emitter;
};


// Retrieve all Datastores
Client.prototype.getDatastores = function() {

  var emitter = new EventEmitter;
  var self = this;

  var rootFolder = self.serviceContent.rootFolder;

  this.getMORefsInContainerByTypePropertyArray( rootFolder, 'Datastore', ['name', 'summary'] )
    .once('result', function(result) {
      emitter.emit('result', result.returnval);
    })
    .once('error', function(err) {
      emitter.emit('error', err);
    });

  return emitter;
};

// Retrieve all Resource Pools
Client.prototype.getAllResourcePools = function() {

  var emitter = new EventEmitter;
  var self = this;

  var rootFolder = self.serviceContent.rootFolder;

  this.getMORefsInContainerByTypePropertyArray( rootFolder, 'ResourcePool', ['name', 'summary'] )
    .once('result', function(result) {
      emitter.emit('result', result.returnval);
    })
    .once('error', function(err) {
      emitter.emit('error', err);
    });

  return emitter;
};


// Retrieve a Resource Pool MORef by name
Client.prototype.getResourcePoolByName = function( ResourcePoolName ) {

  var emitter = new EventEmitter;
  var self = this;

  var rootFolder = self.serviceContent.rootFolder;

  this.getMORefsInContainerByTypeName( rootFolder, 'ResourcePool', ResourcePoolName )
    .once('result', function(result) {
      emitter.emit('result', result);
    })
    .once('error', function(err) {
      emitter.emit('error', err);
    });

  return emitter;
};

// Create a Resource Pool
Client.prototype.createResourcePool = function( resourcePoolName ) {

  var emitter = new EventEmitter;
  var self = this;

  var rootFolder = self.serviceContent.rootFolder;

  var resourceConfigSpec = {
    attributes: { 'xsi:type': 'ResourceConfigSpec'},
    cpuAllocation: {
      attributes: { 'xsi:type': 'ResourceAllocationInfo'},
      reservation: 0,
      expandableReservation: true,
      limit: -1,
      shares: {
        shares: 0,
        level: 'normal'
      }
    },
    memoryAllocation: {
      attributes: { 'xsi:type': 'ResourceAllocationInfo'},
      reservation: 0,
      expandableReservation: true,
      limit: -1,
      shares: {
        shares: 0,
        level: 'normal'
      }
    }
  };

  Joi.validate(resourceConfigSpec, types.schemaResourceConfigSpec, function(err, value) {
    if(err) {
      emitter.emit('error', err);
      return;
    }
  });

  // TODO: More reliable way to find root resource pool? Not always named 'Resources'?
  this.getMORefsInContainerByTypeName( rootFolder, 'ResourcePool', 'Resources' )
    .once('result', function(result) {

      var rootResourcePool = result;

      self.runCommand( 'CreateResourcePool', { _this: rootResourcePool, name: resourcePoolName, spec: resourceConfigSpec} )
        .once('result', function(result) {
          emitter.emit('result', result.returnval);
        })
        .once('error', function(err) {
          emitter.emit('error', err);
        });

    })
    .once('error', function(err) {
      emitter.emit('error', err);
    });

  return emitter;
};

// Get Folder by name
Client.prototype.getFolderByName = function( folderName ) {

  var emitter = new EventEmitter;
  var self = this;

  var rootFolder = self.serviceContent.rootFolder;

  this.getMORefsInContainerByTypeName( rootFolder, 'Folder', folderName)
    .once('result', function(result) {
      if( typeof result == 'undefined' || _.isEmpty(result)) {
        //throw new errors.TemplateFolderError('The folder with name \'' + folderName + '\' could not be found.' );
        emitter.emit('error', 'The folder with name \'' + folderName + '\' could not be found.');
      }
      emitter.emit('result', result);
    })
    .once('error', function(err) {
      emitter.emit('error', err);
    });

  return emitter;
};

// Create a Folder
Client.prototype.createFolder = function( folderName ) {

  var emitter = new EventEmitter;
  var self = this;

  var rootFolder = self.serviceContent.rootFolder;

  self.runCommand( 'CreateFolder', { _this: rootFolder, name: folderName} )
    .once('result', function(result) {
      emitter.emit('result', result.returnval);
    })
    .once('error', function(err) {
      emitter.emit('error', err);
    });

  return emitter;
};

// get all Virtual Switches
Client.prototype.getVirtualSwitchArray = function() {

  var emitter = new EventEmitter;
  var self = this;

  var rootFolder = self.serviceContent.rootFolder;

  self.getMORefsInContainerByTypePropertyArray( rootFolder, 'HostSystem', 'config.network.vswitch' )
    .once('result', function(result) {
      var vSwitchArray = result.returnval.objects.propSet.val['HostVirtualSwitch'];
      emitter.emit('result', vSwitchArray);
    })
    .once('error', function(err) {
      emitter.emit('error', err);
    });

  return emitter;
};

// get a vSwitch MORef by name
Client.prototype.getVirtualSwitchByName = function( vSwitchName ) {

  var emitter = new EventEmitter;
  var self = this;

  var rootFolder = self.serviceContent.rootFolder;

  self.getVirtualSwitchArray()
    .once('result', function(result) {

      _.forEach(result, function(vswitch) {
        if(vswitch.name == vSwitchName) {
          emitter.emit('result', vswitch);
        }
      });
      emitter.emit('result', null);
    })
    .once('error', function(err) {
      emitter.emit('error', err);
    });

  return emitter;
};

// create a VirtualSwitch
Client.prototype.createVirtualSwitch = function( vSwitchName ) {

  var emitter = new EventEmitter;
  var self = this;

  var rootFolder = self.serviceContent.rootFolder;

  this.getMORefsInContainerByTypePropertyArray( rootFolder, 'HostSystem', ['configManager.networkSystem'] )
    .once('result', function(result) {

      var hostNetworkSystemMORef = result.returnval.objects.propSet.val;

      self.runCommand( 'AddVirtualSwitch', { _this: hostNetworkSystemMORef, vswitchName: vSwitchName} )
        .once('result', function(result) {
          emitter.emit('result', result);
        })
        .once('error', function(err) {
          emitter.emit('error', err);
        });
    })
    .once('error', function(err) {
      emitter.emit('error', err);
    });

  return emitter;
};

// get all Port Groups
Client.prototype.getPortGroupArray = function() {

  var emitter = new EventEmitter;
  var self = this;

  var rootFolder = self.serviceContent.rootFolder;

  self.getMORefsInContainerByTypePropertyArray( rootFolder, 'HostSystem', 'config.network.portgroup' )
    .once('result', function(result) {
      var portGroupArray = result.returnval.objects.propSet.val['HostPortGroup'];
      emitter.emit('result', portGroupArray);
    })
    .once('error', function(err) {
      emitter.emit('error', err);
    });

  return emitter;
};

// get a Port Group MORef by name
Client.prototype.getPortGroupByName = function( portGroupName ) {

  var emitter = new EventEmitter;
  var self = this;

  var rootFolder = self.serviceContent.rootFolder;

  self.getPortGroupArray()
    .once('result', function(result) {

      _.forEach(result, function(portgroup) {
        if(portgroup.spec.name == portGroupName) {
          emitter.emit('result', portgroup);
        }
      });
      emitter.emit('result', null);
    })
    .once('error', function(err) {
      emitter.emit('error', err);
    });

  return emitter;
};

// create a Port Group
Client.prototype.createPortGroup = function( vSwitchName, portGroupName, vlan ) {

  var emitter = new EventEmitter;
  var self = this;

  var rootFolder = self.serviceContent.rootFolder;

  self.getMORefsInContainerByTypePropertyArray( rootFolder, 'HostSystem', 'configManager.networkSystem' )
    .once('result', function(result) {
      var hostNetworkSystemMORef = result.returnval.objects.propSet.val;

      var hostNetworkSecurityPolicy = {
        allowPromiscuous: true,
        macChanges: true,
        forgedTransmits: true
      };

      var hostNetworkPolicy = {
        security: hostNetworkSecurityPolicy
      };

      var hostPortGroupSpec = {
        name: portGroupName,
        vlanId: vlan,
        vswitchName: vSwitchName,
        policy: hostNetworkPolicy
      };

      self.runCommand( 'AddPortGroup', { _this: hostNetworkSystemMORef, portgrp: hostPortGroupSpec} )
        .once('result', function(result) {
          emitter.emit('result', result);
        })
        .once('error', function(err) {
          emitter.emit('error', err);
        });
    });

  return emitter;
};

// Get VirtualApps within a Folder
Client.prototype.getVirtualAppsFromFolder = function( folderName ) {

  var emitter = new EventEmitter;
  var self = this;

  this.getFolderByName( folderName )
    .once('result', function(result) {

      // Return empty results if no folders received
      if( typeof result == 'undefined' || _.isEmpty(result)) {
        emitter.emit('error', 'The folder with name \'' + folderName + '\' could not be found.');
        return emitter;
      }

      var folders = result;

      if( ! _.isArray(result) ) {
        folders = [ folders ];
      }

      var processedCount = 0;
      var vAppArray = [];

      _.forEach(folders, function(folder) {

        self.getMORefsInContainerByTypePropertyArray( folder, 'VirtualApp', ['name'] )
          .once('result', function(result) {

            processedCount++;

            // if no vApps, process next folder
            if( typeof result == 'undefined' || _.isEmpty(result)) {
              if(processedCount === folders.length) {
                if(vAppArray.length === 0) {
                  emitter.emit('error', 'No vApps found in folder with name \'' + folderName + '\'');
                }
                emitter.emit('result', vAppArray);
              }
              return emitter;
            }

            var vApps = result.returnval.objects;

            if( ! _.isArray(vApps) ) {
              vApps = [ vApps ];
            }

            _.forEach(vApps, function( vApp ) {
              // Don't add it to the array if it's already added (due to recursive views)
              if (!_.some(vAppArray, vApp)) {
                vAppArray.push( vApp );
              }
            });

            if(processedCount === folders.length) {
              emitter.emit('result', vAppArray);
            }
          })
          .once('error', function(err) {
            emitter.emit('error', err);
          });
      });

    })
    .once('error', function(err) {
      emitter.emit('error', err);
    });

  return emitter;
};

// Get VirtualApps By Name
Client.prototype.getVirtualAppByName = function( vAppName ) {

  var emitter = new EventEmitter;
  var self = this;

  var rootFolder = self.serviceContent.rootFolder;

  self.getMORefsInContainerByTypePropertyArray( rootFolder, 'VirtualApp', ['name'] )
    .once('result', function(result) {
      var vApps = result.returnval.objects;
      if( ! _.isArray(vApps) ) {
        vApps = [ vApps ];
      }

      _.forEach(vApps, function(vApp) {
        if(vApp.propSet.val['$value'] === vAppName) {
          emitter.emit('result', vApp);
        }
      });
      emitter.emit('result', null);
    })
    .once('error', function(err) {
      emitter.emit('error', err);
    });

  return emitter;
};


// Retrieve all Virtual Machines
// TODO: Make this a private function but create a public function 
//   that gets VMs from a folder or VApp
Client.prototype.getVMArray = function() {

  var emitter = new EventEmitter;
  var self = this;

  var rootFolder = self.serviceContent.rootFolder;

  this.getMORefsInContainerByType( rootFolder, 'VirtualMachine' )
    .once('result', function(result) {
      emitter.emit('result', result.returnval);
    })
    .once('error', function(err) {
      emitter.emit('error', err);
    });

  return emitter;
};


exports.Client = Client;



/*
* Clone a Virtual Appliance
*/
Client.prototype.cloneVirtualApp = function( 
  srcVirtualAppName, dstVirtualAppName, dstDatastoreName, dstResourcePoolName, dstFolderName ) {

  var emitter = new EventEmitter;
  //emitter.setMaxListeners(student_list.length);

  var self = this;

  var rootFolder = self.serviceContent.rootFolder;

  var taskmanager = new TaskManager( self );
  taskmanager.on('progress', function(progress) {
    emitter.emit('progress', progress + '%');
  });

  // Get Source vApp
  self.getMORefsInContainerByTypeName( rootFolder, 'VirtualApp', srcVirtualAppName )
    .once('result', function(vapp) {
      var srcVirtualAppMORef = vapp;
      
      emitter.emit('message', 
        'Clone ' + srcVirtualAppName + ': Getting ResourcePool ' + dstResourcePoolName );

      // Get Destination ResourcePool
      self.getMORefsInContainerByTypeName( rootFolder, 'ResourcePool', dstResourcePoolName )
        .once('result', function(resourcepool) {
          var dstResourcePoolMORef = resourcepool;

          emitter.emit('message', 
            'Clone ' + srcVirtualAppName + ': Getting Datastore ' + dstDatastoreName );

          // Get destination Datastore
          self.getMORefsInContainerByTypeName( rootFolder, 'Datastore', dstDatastoreName )
            .once('result', function(datastore) {
              var dstDatastoreMORef = datastore;

              emitter.emit('message', 
                'Clone ' + srcVirtualAppName + ': Getting Folder ' + dstFolderName );

              // Get Destination Folder
              self.getMORefsInContainerByTypeName( rootFolder, 'Folder', dstFolderName )
                .once('result', function(folder) {
                  var dstFolderMORef = folder;

                  emitter.emit('message', 
                    'Clone ' + srcVirtualAppName + ': Sent clone task to vSphere' );

                  // Start Clone
                  self.runCommand( 'CloneVApp_Task', { _this: srcVirtualAppMORef, name: dstVirtualAppName, 
                    target: dstResourcePoolMORef, spec: { location: dstDatastoreMORef, vmFolder: dstFolderMORef } } )
                    .once('result', function(result) {
                      var taskMORef = result.returnval;
                     
                      taskmanager.addTask(taskMORef);
                      taskmanager.run();

                      self.waitForValues( taskMORef , ['info.state','info.error'], 'state', ['success','error'])
                        .once('result', function(result) {
                          var vAppName = dstVirtualAppName;

                          // Successful clone
                          if( result['info.error'] == undefined ) {
                            emitter.emit('result', result);
                          } else {
                            emitter.emit('message', 
                              'Clone ' + srcVirtualAppName + ': Error -> ' +  result['info.error'].localizedMessage);
                            emitter.emit('error', result['info.error'].localizedMessage);
                          }
                        })
                        .once('error', function(err) {
                          emitter.emit('error', err);
                        }); // waitForValues
                    })
                    .once('error', function(err) {
                      emitter.emit('error', err);
                    }); // Clone Task
                })
                .once('error', function(err) {
                  emitter.emit('error', err);
                }); // get Destination Folder
            })
            .once('error', function(err) {
              emitter.emit('error', err);
            }); // get Destination Datastore
        })
        .once('error', function(err) {
          emitter.emit('error', err);
        }); // get Destination Resourcepool
    })
    .once('error', function(err) {
      emitter.emit('error', err);
    }); // get Source vApp

  return emitter;
}

// Delete a Virtual Appliance
Client.prototype.deleteVirtualApp = function( virtualAppName ) {

  var emitter = new EventEmitter;
  var self = this;

  var rootFolder = self.serviceContent.rootFolder;

  var taskmanager = new TaskManager( self );
  taskmanager.on('progress', function(progress) {
    emitter.emit('progress', progress + '%');
  });

  self.getMORefsInContainerByTypeName( rootFolder, 'VirtualApp', virtualAppName )
    .once('result', function(vapp) {
      var vAppMORef = vapp;

      self.runCommand( 'Destroy_Task', { _this: vAppMORef } )
        .once('result', function(result){
          var taskMORef = result.returnval;

          taskmanager.addTask(taskMORef);
          taskmanager.run();

          self.waitForValues( taskMORef , ['info.state','info.error'], 'state', ['success','error'])
            .once('result', function( result ) {
              if( result['info.error'] == undefined ) {
                emitter.emit('result', result);
              } else {
                emitter.emit('error', result['info.error']);
              }
            })
            .once('error', function( err ) {
              emitter.emit('error', err);
            });
        })
        .once('error', function( err ) {
          emitter.emit('error', err);
        });
    })
    .once('error', function( err ) {
      emitter.emit('error', err);
    });

  return emitter;
};

/*
 *  Update all network adapters on all VMs within a vApp
 *    searchNetworkName => String to match when looking at network names. e.g. 'Student1'
 *    replaceNetworkName => String to replace when network name contains string `searchNetworkName`. e.g. 'Student2'
 */
Client.prototype.updateVirtualAppNetworkAdapters = function( virtualAppName, searchNetworkName, replaceNetworkName ) {
  var emitter = new EventEmitter;
  var self = this;

  var rootFolder = self.serviceContent.rootFolder;

  var VirtualMachineConfigSpec = {
    attributes: { type: 'VirtualMachineConfigSpec' },
    deviceChange: []
  }

  var VirtualDeviceConfigSpec = { 
    attributes: { type: 'VirtualDeviceConfigSpec' },
    operation: {
      attributes: { type: 'VirtualDeviceConfigSpecOperation' },
      $value: 'edit'
    },
    device: {
      attributes: { 'xsi:type': 'VirtualPCNet32' },
      key: null,
      backing: { 
        attributes: { 'xsi:type': 'VirtualEthernetCardNetworkBackingInfo' },
         deviceName: ''
      }
    }
  };

  // Get the VirtualApp
  this.getMORefsInContainerByTypeName( rootFolder, 'VirtualApp', virtualAppName )
    .once('result', function(result) {
      var vAppMORef = result;

      // get the VMs in the Virtual App
      self.getMORefsInContainerByType( vAppMORef, 'VirtualMachine' )
        .once('result', function( result ) {

          if(_.isEmpty( result.returnval )) {
            emitter.emit('error', 'No virtual machines found in ' + vapp);
            return emitter;
          }

          var vms = result.returnval.objects;
          if( ! _.isArray( vms ) ) {
            vms = [ vms ];
          }
          
          var vmCount = 0;
          var nicCount = 0;

          var nicReady = function() {
            nicCount--;
            if( vmCount >= vms.length && nicCount <= 0 ) {
              emitter.emit('result');
            }
          };


          // Iterate over all the VMs in this VApp
          _.forEach(vms, function(vm) {
            var new_VirtualMachineConfigSpec = _.cloneDeep(VirtualMachineConfigSpec);
            var config = vm.propSet[_.findIndex( vm.propSet, { name: 'config' } )];
            var deviceArr = config.val.hardware.device;
             
            var nicArr = _.filter(deviceArr, { backing: { attributes: { 'xsi:type': 'VirtualEthernetCardNetworkBackingInfo' } } } );
            nicCount += nicArr.length;;

            // Iterate over all network adapters for this VM and update the network name
            _.forEach(nicArr, function(nic) {
              var deviceName = nic.backing.deviceName; 

              if( deviceName.includes( searchNetworkName ) ) {
                var re = new RegExp(searchNetworkName,'g');
                var new_deviceName = deviceName.replace(re, replaceNetworkName);

                emitter.emit('message', 
                  'Updating NIC ' + deviceName + '->' + new_deviceName );

                var new_VirtualDeviceConfigSpec = _.cloneDeep(VirtualDeviceConfigSpec);
                new_VirtualDeviceConfigSpec.device.key = nic.key;
                new_VirtualDeviceConfigSpec.device.backing.deviceName = new_deviceName;
                new_VirtualMachineConfigSpec.deviceChange.push( new_VirtualDeviceConfigSpec );

                // Update the network interface on the VM
                self.runCommand( 'ReconfigVM_Task', { _this: vm.obj, spec: new_VirtualMachineConfigSpec })
                  .once('result', function( result ) {
                    var taskMORef = result.returnval;

                    self.waitForValues(taskMORef , ['info.state','info.error'], 'state', ['success','error'])
                      .once('result', function(result) {
                        if( result['info.error'] == undefined ) {
                          nicReady();
                        } else {
                          emitter.emit('error', 'Error:', result['info.error'].localizedMessage);
                        }
                      })
                      .once('error', function( err ) {
                        emitter.emit('error', err);
                      }); // wait for values
                  })
                  .once('error', function( err ) {
                    emitter.emit('error', err);
                  }); // reconfig VM
              } else {
                nicReady();
              } // end if
            }); // End Nic loop
            vmCount++;
          }); // End VM loop
        })
        .once('error', function( err ) {
          emitter.emit('error', err);
        });
    })
    .once('error', function( err ) {
      emitter.emit('error', err);
    });

  return emitter;
}

// Get vApp power status
Client.prototype.getVirtualAppStatus = function( vAppMORef ) {

  var emitter = new EventEmitter;
  var self = this;

  this.getMORefProperties( vAppMORef, 'summary' )
    .once('result', function(result) {
      var status = result.returnval.objects.propSet.val.vAppState;
      emitter.emit('result', status);
    })
    .once('error', function(err) {
      emitter.emit('error', err);
    });

  return emitter;
}

// Power on/off vApp
Client.prototype.powerOpVApp = function( vAppMORef, powerOp ) {

  var emitter = new EventEmitter;
  var self = this;

  var powerCommand = null;
  var commandArgs = { _this: vAppMORef };

  switch (powerOp) {
    case 'powerOn':
      powerCommand = 'PowerOnVApp_Task';
      break;
    case 'powerOff':
      powerCommand = 'PowerOffVApp_Task';
      commandArgs = { _this: vAppMORef, force: true };
      break;
    default:
      emitter.emit('error', 'Invalid powerOp given!');
  }

  if( powerCommand ) {
    this.runCommand( powerCommand, commandArgs )
      .once('result', function(result){
        var taskMORef = result.returnval;

        self.waitForValues( taskMORef , ['info.state','info.error'], 'state', ['success','error'])
          .once('result', function( result ) {
            if( result['info.error'] == undefined ) {
              emitter.emit('result', result['info.state']);
            } else {
              emitter.emit('error', result['info.error']);
            }
          })
          .once('error', function( err ) {
            emitter.emit('error', err);
          });
      })
      .once('error', function(err){
        emitter.emit('error',err);
      });
  }

  return emitter;
};

// Get roles that a user is member of
Client.prototype.getUserRoles = function() {

  var emitter = new EventEmitter;
  var self = this;

  var rootFolder = self.serviceContent.rootFolder;

  self.runCommand( 'RetrieveAllPermissions', { _this: this.serviceContent.authorizationManager } )
    .once('result', function(result) {
   
      var roles = result.returnval;
 
      self.getMORefProperties( rootFolder, 'effectiveRole' )
        .once('result', function(result) {
          
          var effectiveRole = result.returnval.objects.propSet.val.int.$value;
          var userRoles = [];

          _.forEach(roles, function(role) {
            if(parseInt(role.roleId) == effectiveRole) {
              var principal = _.split(role.principal, '\\');
              userRoles.push({domain: principal[0], user: principal[1]});
            }
          });

          emitter.emit('result', userRoles);
        })
        .once('error', function(err) {
          emitter.emit('error', err);
        });
    })
    .once('error', function(err) {
      emitter.emit('error', err);
    });

  return emitter;
}

// Retrieves the current session key
Client.prototype.getCurrentSession = function() {

  var emitter = new EventEmitter;
  var self = this;

  var sessionManager = this.serviceContent.sessionManager;
  var propertyCollector = this.serviceContent.propertyCollector;

  var propertyFilterSpec = [{
    attributes: {'xsi:type': 'PropertyFilterSpec'},
    propSet: [
      {
        attributes: {'xsi:type': 'PropertySpec'},
        type: 'SessionManager',
        pathSet: ['currentSession.key']
        //all: true
      }
    ],
    objectSet: [ 
      {
        attributes: {'xsi:type': 'ObjectSpec'},
        obj: sessionManager
      }
    ]
  }]

  self.runCommand('RetrievePropertiesEx', { _this: propertyCollector, specSet: propertyFilterSpec, options: '' })
    .once('result', function(result) {
      var currentSession = result.returnval.objects.propSet.val.$value;
      emitter.emit('result', currentSession);
    })
    .once('error', function(err) {
      emitter.emit('error', err);
    });

  return emitter;
}

// Checks if the current session is still active
Client.prototype.sessionIsActive = function() {

  var emitter = new EventEmitter;
  var self = this;
 
  this.getCurrentSession()
    .once('result', function(result) {
      var currentSessionKey = result;

      self.runCommand( 'SessionIsActive', { 
        _this: self.serviceContent.sessionManager,
        sessionID: currentSessionKey,
        userName: self.vc.userName } )
        .once('result', function(result) {
          emitter.emit('result', result.returnval);
        })
        .once('error', function(err) {
          emitter.emit('error', err);
        });
    })
    .once('error', function(err) {
      emitter.emit('error', err);
    });

  return emitter;
}
