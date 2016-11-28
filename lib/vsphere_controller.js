'use strict';

/**
* Test vSphere credentials
*/
exports.authenticate = function(vSphereObj, user, pass) {
	return true;
}


/*
var studentFolderPrefix = 'Student';
var templateFolderName = 'Templates';
var student_list = [1,2,3,4,5,6,7,8,9,10,11,12,13,14];

  util = require('util'),
  _ = require('lodash');

var TaskManager = require('../utils/taskmanager');

*/


/*
* vSphere Client
*/
function Client() {
  var emitter = new EventEmitter;

  var self = this;

  if ( vc != undefined ) {
    if ( vc.vc.status == 'ready' ) {
      setTimeout(function() {
        emitter.emit('ready');
      }, 0);
      return emitter;
    } else if ( vc.vc.status == 'connecting' ) {
      // Wait until vc is connected and ready
      function getStatus() {
        setTimeout(function() {
          if(vc.vc.status != 'connecting') {
            if ( vc.vc.status == 'ready') {
              emitter.emit('ready');
            } else {
              emitter.emit('error', 'Error connecting: ' + vc.vc.status);
              return;
            }
          }
          getStatus();
        }, 1000);
      } 
      getStatus();
      return emitter;
    }
  } 

  if ( vsphere === undefined ) {
    setTimeout(function() {
      emitter.emit('error', 'Login to a vSphere server first');
    }, 0);
    return emitter;
  }

  vc = new Vsphere.Client(
    vsphere.settings.selectedServer.ip,
    //vsphere.auth.user,
    'craig.koroscil',
    //vsphere.auth.pass, false);
    'Yepneed@beer2!!', false);

  vc.once('ready', function() {
    emitter.emit('ready');
  })
  .once('error', function(err){
    var error = err.toString();
    if(error.match( /incorrect user name or password/ )) {
      emitter.emit( 'error', 'vSphere: Invalid user name or password' );
    } else if(error.match( /ECONNREFUSED/ )) {
      emitter.emit( 'error', 'vSphere: Unable to connect to ' + err.address + ':' + err.port );
    } else {
      emitter.emit( 'error', 'vSphere Error: ' + err );
    }
  });

  return emitter;
};


/*
* Clone a template for each student
*/
var cloneLabs = function( students, srcVAppName, dstDatastoreArr, dstResourcePoolName) {
  var emitter = new EventEmitter;
  emitter.setMaxListeners(student_list.length);

  var client = new Client();
  client.once('ready', function() {
    var rootFolder = vc.serviceContent.rootFolder;
    var propertyCollector = vc.serviceContent.propertyCollector;
    var taskmanager = new TaskManager( vc );
    taskmanager.on('progress', function(progress) {
        emitter.emit('message', progress + '%');
    });

    // Get Destination Resource Pool
    vc.getMORefsInContainerByTypeName( rootFolder, 'VirtualApp', srcVAppName )
      .once('result', function(vapp) {
        var srcVApp = vapp;
         
        // Get destination ResourcePool
        emitter.emit('message', 
          'Clone ' + srcVAppName + ': Getting ResourcePool ' + dstResourcePoolName );
        vc.getMORefsInContainerByTypeName( rootFolder, 'ResourcePool', dstResourcePoolName )
          .once('result', function(trainingResourcePool) {
            var dstResourcePool = trainingResourcePool;

            // Get destination datastore
            var dstDatastore = _.sample(dstDatastoreArr);
            emitter.emit('message', 
              'Clone ' + srcVAppName + ': Getting Datastore ' + dstDatastore );
            vc.getMORefsInContainerByTypeName( rootFolder, 'Datastore', dstDatastore )
              .once('result', function(datastore) {
                var dstDatastore = datastore;

                _.forEach( students, function( studentId ) {

                  // Get Destination Student Folder
                  var dstFolder = studentFolderPrefix + studentId;
                  emitter.emit('message', 
                    'Clone ' + srcVAppName + ': Getting Folder ' + dstFolder );
                  vc.getMORefsInContainerByTypeName( rootFolder, 'Folder', dstFolder )
                    .once('result', function(folder) {
                      var dstFolder = folder;
                      var dstVAppName = srcVAppName.replace('Template', studentId);
                      
                      emitter.emit('message', 
                        'Clone ' + srcVAppName + ': Sent task to vSphere' );
                      vc.runCommand( 'CloneVApp_Task', { 
                        _this: srcVApp, 
                        name: dstVAppName, 
                        target: dstResourcePool, 
                        spec: { location: dstDatastore, vmFolder: dstFolder } } )
                        .once('result', function(result) {
                          var taskMORef = result.returnval;
                         
                          taskmanager.addTask(taskMORef);
                          taskmanager.run();

                          vc.waitForValues( taskMORef , ['info.state','info.error'], 'state', ['success','error'])
                            .once('result', function(result) {
                              var vAppName = dstVAppName;
                              if( result['info.error'] == undefined ) {
                                // Update all network adapters 
                                emitter.emit('message', 
                                  'Clone ' + srcVAppName + ': Updating network adapters' );
                                updateNetworkAdapters( vAppName, studentId )
                                  .once('ready', function() {
                                    emitter.emit('message', 
                                      'Clone ' + srcVAppName + ': Network adapters updated' );
                                    emitter.emit('cloned', vAppName);
                                  })
                                  .on('message', function(msg) {
                                    emitter.emit('message', 'Clone ' + vAppName + ': ' + msg);
                                  })
                                  .once('error', function(err) {
                                    emitter.emit('error', err);
                                  });

                              } else {
                                emitter.emit('message', 
                                  'Clone ' + srcVAppName + ': Error -> ' +  result['info.error'].localizedMessage);
                                emitter.emit('error', result['info.error'].localizedMessage);
                              }
                            });
                        })
                        .once('error', function(err) {
                          emitter.emit('error', err);
                        });
                    });
                }); // for each student
              });
          });
      });
    })
    .once('error', function(err) {
      emitter.emit('error', err);
    });

  return emitter;
}

/*
* Clone a Lab
*/
exports.clone = function( labId, students ) {
  var emitter = new EventEmitter;
  emitter.setMaxListeners(student_list.length);

  // TODO: Get datastores dynamically
  var dstDatastoreArr = ['VPEX2-DS2', 'VPEX2-DS3', 'VPEX2-DS4'];
  var dstResourcePoolName = 'Training';

  Lab.findOne({ _id: labId }, function (err, lab) {
    if (err) emitter.emit('error', err);

    var studentsArr = students.replace(/[^\d,]+/g, '').split(',');

    if (studentsArr.length > 0) {
      lab.status = 'Cloning...';
      emitter.emit('lab', lab);

      // Clone the labs
      cloneLabs( studentsArr, lab.name, dstDatastoreArr, dstResourcePoolName)
        .on('cloned', function( clonedVAppName ) {
          getVAppResourceIdByName( clonedVAppName )
            .once('result', function(result) {
              lab.instances.push( result );

              if (lab.instances.length >= studentsArr.length) {
                lab.status = 'Cloned';
                updateLabStatus( lab )
                  .once('lab', function(lab) {
                    emitter.emit('lab', lab);
                  });
              } else {
                lab.status = 'Cloning... ' + lab.instances.length + '/' + studentsArr.length;
                emitter.emit('lab', lab);
              }
            });
        })
        .on('message', function(msg) {
          emitter.emit('message', msg);
        })
        .on('status', function(status) {
          lab.status = status;
          emitter.emit('lab', lab);
        })
        .on('error', function(err) {
          emitter.emit('error', err);
          emitter.emit('message', 'Error while cloning: ' + err);
        })
    }
  });

  return emitter;
}

var deleteVApp = function( resourceId ) {
  var emitter = new EventEmitter;
  var MORef = { attributes: { type: 'VirtualApp' }, '$value': resourceId };
  var client = new Client();

  client.once('ready', function() {
    vc.runCommand( 'Destroy_Task', { _this: MORef } )
      .once('result', function(result){
        var taskMORef = result.returnval;

        vc.waitForValues( taskMORef , ['info.state','info.error'], 'state', ['success','error'])
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
      });
    })
    .once('error', function( err ) {
      emitter.emit('error', err);
    });

  return emitter;
}

/*
* Delete a Lab
*/
exports.delete = function(labId) {
  var emitter = new EventEmitter;

  Lab.findOne({ _id: labId }, function (err, lab) {
    if (err) emitter.emit('error', err);

    if( _.isEmpty( lab.instances ) ) {
      emitter.emit('error', 'No instances to delete.');
      return;
    }

    var deleteCount = 0;
    var deleteTotal = lab.instances.length;

    _.forEach( lab.instances, function( labInstance ) {
      getVAppStatus( labInstance.resourceid )
        .once('result', function( status ) {

          if ( status === 'stopped' ) {
            // Vapp stopped so go ahead and delete
            lab.status = 'Deleting Instances...';
            emitter.emit('lab', lab);
            emitter.emit('message', 'Delete lab instances ' + lab.name);

            // send poweron command to VSphere
            deleteVApp( labInstance.resourceid )
              .once('result', function(result) {
                if (result.$value  === 'success' ) {
                  _.remove(lab.instances, { resourceid: labInstance.resourceid } );
                  if(deleteCount++ >= lab.instances.length) {
                    lab.status = 'Stopped';
                    updateLabStatus( lab )
                      .once('lab', function(lab) {
                        emitter.emit('lab', lab);
                      });
                    emitter.emit('message', 'Delete lab instances ' + lab.name + ': Done');
                  } else {
                    lab.status = 'Deleting... ' + deleteCount + '/' + deleteTotal;
                    emitter.emit('lab', lab);
                  }
                } else {
                  emitter.emit('error', 'Failed to delete ' + lab.name);
                }
              })
              .once('error', function(err) {
                emitter.emit('error', labInstance.name + ':' + err.localizedMessage);
              });
          } else {
            emitter.emit('error', lab.name + ' cannot be deleted due to current state: ' + status);
            lab.status = status;
            emitter.emit('lab', lab);
          }
        })
        .once('error', function(err) {
          emitter.emit('error', err);
          emitter.emit('Error while deleting: ' + err);
        });        
    });
  });

  return emitter;
}

var getVAppStatus = function( resourceId ) {
  var emitter = new EventEmitter;
  var MORef = { attributes: { type: 'VirtualApp' }, '$value': resourceId };
  var client = new Client();

  client.once('ready', function() {
    var rootFolder = vc.serviceContent.rootFolder;

    vc.getMORefProperties( MORef, 'summary' )
      .once('result', function(result) {
        var status = result.returnval.objects.propSet.val.vAppState;
        emitter.emit('result', status);
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

var powerOpVApp = function( resource_id, powerOp ) {

  var emitter = new EventEmitter;
  var powerCommand = null;
  var MORef = { attributes: { type: 'VirtualApp' }, '$value': resource_id };
  var commandArgs = { _this: MORef };

  switch (powerOp) {
    case 'powerOn':
      powerCommand = 'PowerOnVApp_Task';
      break;
    case 'powerOff':
      powerCommand = 'PowerOffVApp_Task';
      commandArgs = { _this: MORef, force: true };
      break;
    default:
      emitter.emit('error', 'Invalid powerOp given!');
  }

  if( powerCommand ) {
    var client = new Client();

    client.once('ready', function() {
      vc.runCommand( powerCommand, commandArgs )
        .once('result', function(result){
          var taskMORef = result.returnval;

          vc.waitForValues( taskMORef , ['info.state','info.error'], 'state', ['success','error'])
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
      })
      .once('error', function(err){
        emitter.emit('error',err);
      });
  }

  return emitter;
};

var updateLabStatus = function( lab ) {
  var emitter = new EventEmitter;
  var labInfo = lab.toObject();
  delete labInfo._id;

  Lab.update(
    { _id: lab._id },
    labInfo,
    { multi: false }, 
    function(err, ret) {
      if (err) emitter.emit('error', err);
      //callback({type: 'lab', data: lab});
      emitter.emit('lab', lab);
    });
  return emitter;
}

/*
* Start a Lab
*/
exports.start = function(labId) {
  var emitter = new EventEmitter;

  Lab.findOne({ _id: labId }, function (err, lab) {
    if (err) emitter.emit('error', err);

    if( _.isEmpty( lab.instances ) ) {
      emitter.emit('error', 'No instances to start. Try cloning some first.');
      return;
    }

    var labCount = 0;

    _.forEach( lab.instances, function( labInstance ) {
      getVAppStatus( labInstance.resourceid )
        .once('result', function( status ) {

          if ( status === 'stopped' ) {
            // Vapp stopped so go ahead and start
            lab.status = 'Starting...'
            emitter.emit('lab', lab);
            emitter.emit('message', 'Starting: ' + lab.name);

            // send poweron command to VSphere
            powerOpVApp( labInstance.resourceid, 'powerOn' )
              .once('result', function(result) {
                var status = result.$value;

                if (status  == 'success' ) {
                  if (++labCount >= lab.instances.length) {
                    lab.status = 'Started';
                    updateLabStatus( lab )
                      .once('lab', function(lab) {
                        emitter.emit('lab', lab);
                      });
                    emitter.emit('message', 'Started: ' + lab.name);
                  }
                } else {
                  emitter.emit('error', 'Failed to start ' + lab.name);
                }
              })
              .once('error', function(err) {
                emitter.emit('error', labInstance.name + ':' + err.localizedMessage);
              });
          } else {
            emitter.emit('error', lab.name + ' cannot be started due to current state: ' + status);
          }
        })
        .once('error', function(err) {
          emitter.emit('error', err);
        });        
    });
  });

  return emitter;
}

/*
* Stop a Lab
*/
exports.stop = function(labId) {
  var emitter = new EventEmitter;

  Lab.findOne({ _id: labId }, function (err, lab) {
    if (err) emitter.emit('error', err);

    var instanceCount = 0;

    _.forEach( lab.instances, function( labInstance ) {
      getVAppStatus( labInstance.resourceid )
        .once('result', function( status ) {

          if ( status === 'started' ) {
            // Vapp started so go ahead and stop
            lab.status = 'Stopping...';
            emitter.emit('lab', lab);
            emitter.emit('message', 'Stopping: ' + lab.name);

            // send poweroff command to VSphere
            powerOpVApp( labInstance.resourceid, 'powerOff' )
              .once('result', function(result) {
                if (result.$value  == 'success' ) {
                  if(++instanceCount >= lab.instances.length) {
                    lab.status = 'Stopped';
                    updateLabStatus( lab )
                      .once('lab', function(lab) {
                        emitter.emit('lab', lab);
                      });
                      emitter.emit('message', 'Stopped: ' + lab.name);
                  }
                } else {
                  emitter.emit('error', 'Failed to stop ' + lab.name);
                  lab.status = status;
                  emitter.emit('lab', lab);
                }
              })
              .once('error', function(err) {
                emitter.emit('error', labInstance.name + ':' + err.localizedMessage);
                lab.status = status;
                emitter.emit('lab', lab);
              });
          } else {
            emitter.emit('error', lab.name + ' cannot be stopped due to current state: ' + status);
            lab.status = status;
            emitter.emit('lab', lab);
          }
        })
        .once('error', function(err) {
          emitter.emit('error', err);
        });        
    });
  });

  return emitter;
}

/*
* List all Labs
*/
exports.list = function() {
  var emitter = new EventEmitter;
  var templatesDone = false;
  var labsDone = false;

  var dbready = function() {
    if(templatesDone && labsDone) {
      emitter.emit('message', 'Database updated');

      Lab.find(function (err, labs) {
        if (err) emitter.emit('error', err);
        emitter.emit('labs', labs);
      });
    }
  }

  dbupdate()
    .once('templatesdone', function() {
      templatesDone = true;
      dbready();
    })
    .once('labsdone', function() {
      labsDone = true;
      dbready();
    })
    .once('error', function(err) {
      emitter.emit('error', err);
    });

  return emitter;
}

/*
* Get a single Lab
*/
exports.get = function(labId) {
  var emitter = new EventEmitter;

  Lab.findOne({ _id: labId }, function (err, lab) {
     if (err) emitter.emit('error', err);
     emitter.emit('result', {type: 'lab', data: lab});
   });

  return emitter;
}

/*
* Update Lab
*/
/*
exports.update = function(labId) {
  var emitter = new EventEmitter;

  Lab.findOne({ _id: labId }, function (err, lab) {
    if (err) emitter.emit('error', err);

    Lab.update({ name: lab.name }, {active: lab.active, status: lab.status}, {multi: false}, function(err, ret) {
      if (err) emitter.emit('error', err);
      emitter.emit('result', {type: 'lab', data: lab});
    }); 
  });

  return emitter;
}
*/

var getVAppResourceIdByName = function( VAppName ) {
  var emitter = new EventEmitter;
  var client = new Client();

  client.once('ready', function() {
    var rootFolder = vc.serviceContent.rootFolder;

      vc.getMORefsInContainerByTypePropertyArray( rootFolder, 'VirtualApp', 'name')
        .once('result', function(result) {
          if( _.isEmpty(result) ) {
            emitter.emit('error', 'No VApps found');
            return;
          }

          if( ! _.isArray(result) ) {
            result = [ result ];
          }

          var vAppObjArray = _.flatMap( result, 'returnval.objects' );

          for (var i = 0, len = vAppObjArray.length; i< len; i++) {
            var name = vAppObjArray[i].propSet.val.$value;
            var resourceid = vAppObjArray[i].obj.$value;
            if (name === VAppName)
              emitter.emit('result', {name: name, resourceid: resourceid});
          }
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

/*
* Get all the current labs from all student folders
*/
var getAllLabs = function() {
  var emitter = new EventEmitter;
  var labsArr = [];
  var labCount = 0;
  var client = new Client();

  client.once('ready', function() {
    var rootFolder = vc.serviceContent.rootFolder;

    _.forEach( student_list, function( studentId ) {
        // Get Student folders
        vc.getMORefsInContainerByTypeName( rootFolder, 'Folder', studentFolderPrefix + studentId )
          .once('result', function( studentFolderMORef ) {

            // Get VApss in student folder
            vc.getMORefsInContainerByTypePropertyArray( studentFolderMORef, 'VirtualApp', 'name')
              .once('result', function( result ) {
                if ( ! _.isEmpty( result ) ) {
                  if ( ! _.isArray (result ) )
                    result = [ result ];              

                  var vAppObjArr = _.flatMap( result, 'returnval.objects' );

                  for (var i = 0, len = vAppObjArr.length; i < len; i++ ) {
                    var name = vAppObjArr[i].propSet.val.$value;
                    var resourceid = vAppObjArr[i].obj.$value
                    if (name)
                      labsArr.push({ name: name, resourceid: resourceid });
                  }
                }
                if(++labCount >= student_list.length) {
                  emitter.emit('labs', labsArr);
                }
              })
              .once('error', function(err) {
                emitter.emit('error', err);
              });
          })
          .once('error', function(err) {
            emitter.emit('error', err);
          });
      })
    })
    .once('error', function(err) {
      emitter.emit('error', err);
    });

  return emitter;
};

/*
* Get all Lab templates
*/
var getAllTemplates = function() {
  var emitter = new EventEmitter;
  var client = new Client();

  client.once('ready', function() {
    var rootFolder = vc.serviceContent.rootFolder;

    // Get Template folder
    vc.getMORefsInContainerByTypeName( rootFolder, 'Folder', templateFolderName )
      .once('result', function( studentFolderMORef ) {

        // Get all lab templates
        vc.getMORefsInContainerByTypePropertyArray( studentFolderMORef, 'VirtualApp', 'name')
          .once('result', function( result ) {
            if ( _.isEmpty( result ) ) {
              return;
            }
            if ( ! _.isArray (result ) )
              result = [ result ];              

            var vAppObjArr = _.flatMap( result, 'returnval.objects' );
            var labsArr = [];

            for (var i = 0, len = vAppObjArr.length; i < len; i++ ) {
              var name = vAppObjArr[i].propSet.val.$value;
              var resourceid = vAppObjArr[i].obj.$value
              if (name)
                labsArr.push({ name: name, resourceid: resourceid });
            } 
            emitter.emit('templates', labsArr);
          })
          .once('error', function(err) {
            emitter.emit('error', err);
          });
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

/*
* Update database with VSphere labs
*/
var dbupdate = function() {
  var emitter = new EventEmitter;
  var templateCount = 0;
  var client = new Client();

  client.once('ready', function() {
    var rootFolder = vc.serviceContent.rootFolder;
    emitter.emit('message', 'Retrieving all Labs from vSphere');

    getAllTemplates()
      .once('templates', function( templateArr ) {
        if( _.isEmpty( templateArr ) ) {
          return;
        };

        var lab_callback = function(err, lab) {
          if (err) emitter.emit('error', err);
          //emitter.emit('lab', lab);
          if(++templateCount >= templateArr.length) {
            emitter.emit('templatesdone');
          }
        };

        _.forEach( templateArr, function( template ) {
          Lab.findOneAndUpdate({ name: template.name}, 
            { resourceid: template.resourceid, instances: [] },
            { upsert: true, new: true }, 
            lab_callback
          );

        });
      })
      .once('error', function(err) {
        emitter.emit('error', err);
      });

      emitter.emit('message', 'Retrieving all Lab instances from vSphere');

      var labCount = 0;
      getAllLabs()
        .once('labs', function( labsArr ) {
          if( _.isEmpty( labsArr ) ) {
            return;
          };

          // Called for each lab instance
          var lab_callback = function(err, lab) {
            if (err) emitter.emit('error', err);
            if(++labCount >= labsArr.length)
              emitter.emit('labsdone');
          };

          // Iterate over all lab instances and store in the database
          _.forEach( labsArr, function( lab ) {
            var templateName = lab.name.replace(/\d+/, 'Template');
            getVAppStatus( lab.resourceid )
              .once('result', function( status ) {
                var isActive = (status.toLowerCase() === 'started') ? true : false;
                Lab.findOneAndUpdate({ name: templateName}, 
                    { $set: { "status": status, "active": isActive }, $addToSet: { "instances": lab }},
                    { new: true }, 
                    lab_callback
                );
              })
              .once('error', function(err) {
                emitter.emit('error', err);
              });
          })
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

/*
* Update all the network adapters based on student_id on all VMs in a vApp
*/
var updateNetworkAdapters = function( vAppName, student_id ) {
  var emitter = new EventEmitter;

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

  var client = new Client();

  client.once('ready', function() {
    var rootFolder = vc.serviceContent.rootFolder;

    vc.getMORefsInContainerByTypeName( rootFolder, 'VirtualApp', vAppName )
      .once('result', function(result) {
        var vAppMORef = result;

        vc.getMORefsInContainerByType( vAppMORef, 'VirtualMachine' )
          .once('result', function( result ) {
            if (_.isEmpty( result.returnval )) {
              emitter.emit('error', 'No virtual machines found in ' + vapp);
              return;
            }
            var vms = result.returnval.objects;

            if( ! _.isArray( vms ) )
              vms = [ vms ];
              var vmCount = 0;

              // Iterate over all the VMs in this VApp
              _.forEach(vms, function(vm) {
                var new_VirtualMachineConfigSpec = _.cloneDeep(VirtualMachineConfigSpec);
                var config = vm.propSet[_.findIndex( vm.propSet, { name: 'config' } )];
                var deviceArr = config.val.hardware.device;
                var nicArr = _.filter(deviceArr, {attributes: { 'xsi:type': 'VirtualPCNet32' }});

                // Iterate over all network adapters for this VM and update the network name
                _.forEach(nicArr, function(nic) {
                  var deviceName = nic.backing.deviceName; 
                  if( deviceName.includes('Student1') ) {
                    var new_deviceName = deviceName.replace(/Student1/, 'Student' + student_id);
                    emitter.emit('message', 
                      'Updating NIC ' + deviceName + '->' + new_deviceName );
                    var new_VirtualDeviceConfigSpec = _.cloneDeep(VirtualDeviceConfigSpec);
                    new_VirtualDeviceConfigSpec.device.key = nic.key;
                    new_VirtualDeviceConfigSpec.device.backing.deviceName = new_deviceName;
                    new_VirtualMachineConfigSpec.deviceChange.push( new_VirtualDeviceConfigSpec );

                    vc.runCommand( 'ReconfigVM_Task', { _this: vm.obj, spec: new_VirtualMachineConfigSpec })
                      .once('result', function( result ) {
                        var taskMORef = result.returnval;

                        vc.waitForValues(
                          taskMORef , ['info.state','info.error'], 'state', ['success','error'])
                            .once('result', function(result) {
                              if( result['info.error'] == undefined ) {
                                if (++vmCount >= vms.length) { 
                                  //emitter.emit('result', result.$value );
                                  emitter.emit('ready');
                                }
                              } else {
                                console.log('Error:', result['info.error'].localizedMessage);
                                emitter.emit('error', 'Error:', result['info.error'].localizedMessage);
                              }
                          });
                      });
                  }
                }); // End Nic loop
              }); // End VM loop
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
}
