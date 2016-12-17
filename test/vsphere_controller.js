/*
  vsphere-controller.test.js

  tests for the vCenterController class
*/ 

var chai = require('chai'),
  expect = chai.expect,
  spy = require('sinon').spy(),
  _ = require('lodash'),
  util = require('util'),
  EventEmitter = require('events').EventEmitter,
  vsphereCtrl = require('../lib/client');

var TestConfig = require('./config-test').vCenterTestConfig;

var VItest = new vsphereCtrl.Client(TestConfig.vCenterIP, TestConfig.vCenterUser, TestConfig.vCenterPassword, false);

describe('Client object initialization:', function () {
  it('provides a successful login', function (done) {
    
    VItest.once('ready', function () {
      expect(VItest.vc.userName).to.exist;
      //console.log('logged in user : ' + VItest.vc.userName);
      expect(VItest.vc.fullName).to.exist;
      //console.log('logged in user fullname : ' + VItest.vc.fullName);
      expect(VItest.serviceContent).to.exist;
      //console.log(VItest.serviceContent);
      done();

    })
    .once('error', function (err) {
      done(err);
      // this should fail if there's a problem
      expect(VItest.vc.userName).to.exist;
      //console.log('logged in user : ' + VItest.vc.userName);
      expect(VItest.vc.fullName).to.exist;
      //console.log('logged in user fullname : ' + VItest.vc.fullName);
      expect(VItest.serviceContent).to.exist;
      //console.log(VItest.serviceContent);
    });
  });
});

describe('Client reconnection test:', function () {

  it('can successfully reconnect', function (done) {
    //VItest.runCommand('Logout', { _this: VItest.serviceContent.sessionManager })
    VItest.logout()
      .once('result', function (result){
        // now we're logged out, so let's try running a command to test automatic re-login
        VItest.getCurrentTime()
          .once('result', function (result) {
            //console.log(result);
            expect(result).to.be.an.instanceof(Date);
            done();
          })
          .once('error', function (err) {
            done(err);
          });
      })
      .once('error', function (err) {
        done(err);
      });
  });
});

describe('Client tests - query commands:', function (){

  describe('#getCurrentTime()', function() {
    it('retrieves current time', function (done){
      VItest.getCurrentTime()
        .once('result', function (result){
          expect(result).to.be.an.instanceof(Date);
          done();
      })
      .once('error', function (err) {
        done(err);
      });
    }); 
  }); 

  describe('#getCurrentTime()', function() {
    it('retrieves current time 2 (check for event clobbering)', function (done){

      VItest.getCurrentTime()
        .once('result', function (result){
          expect(result).to.be.an.instanceof(Date);
          done();
      })
      .once('error', function (err) {
        done(err);
      });
    }); 
  }); 

  describe('#getDatacenters()', function() {
    it('can get a list of Datacenters', function( done ) {
      VItest.getDatacenters()
        .once('result', function(result) {
          //console.log(util.inspect(result, {depth:null}));
          done();
        })
        .once('error', function (err) {
          done('\n\nlast request : ' + VItest.vc.client.lastRequest);
        });
    });
  });

  describe('#getHosts()', function() {
    it('can get a list of Hosts in the Datacenter', function( done ) {
      VItest.getHosts()
        .once('result', function(result) {
          //console.log(util.inspect(result, {depth:null}));
          done();
        })
        .once('error', function (err) {
          done('\n\nlast request : ' + VItest.vc.client.lastRequest);
        });
    });
  });

  describe('#getDatastores()', function() {
    it('can obtain all Datastores', function (done){

      VItest.getDatastores()
        .once('result', function (result){

          expect(result.objects).to.exist;
          //console.log(util.inspect(result.objects, {depth: null}));

          if( _.isArray(result.objects) ) {
            expect( _.sample(result.objects).obj.attributes.type).to.be.equal('Datastore');
          } else {
            expect(result.objects.obj.attributes.type).to.be.equal('Datastore');
          }
          done();
        })
        .once('error', function (err){
          done('\n\nlast request : ' + VItest.vc.client.lastRequest);
        });
    });
  });

  describe('#getAllResourcePools()', function() {
    it('can obtain Resource Pool info', function (done){
      VItest.getAllResourcePools()
        .once('result', function (result){

          expect(result.objects).to.exist;

          if( _.isArray(result.objects) ) {
            expect( _.sample(result.objects).obj.attributes.type).to.be.oneOf(['ResourcePool', 'VirtualApp']);
          } else {
            expect(result.objects.obj.attributes.type).to.be.equal('ResourcePool');
          }
          done();
        })
        .once('error', function (err){
          done('\n\nlast request : ' + VItest.vc.client.lastRequest);
        });
    });
  });

  describe('#getResourcePoolByName()', function() {
    it('can obtain Resource Pool by name: `' + TestConfig.advanced.ResourcePoolName + '`', function (done){

      VItest.getResourcePoolByName( TestConfig.advanced.ResourcePoolName )
        .once('result', function (result){

          expect(result.attributes).to.exist;
          expect(result.attributes.type).to.be.equal('ResourcePool');
          done();
        })
        .once('error', function (err){
          done('\n\nlast request : ' + VItest.vc.client.lastRequest);
        });
    });
  });

  /*
  describe('#createResourcePool()', function() {
    it('can create a Resource Pool with name `' + TestConfig.advanced.ResourcePoolName + '`', function( done ) {

      var originalException = process.listeners('uncaughtException').pop()
      //Needed in node 0.10.5+
      process.removeListener('uncaughtException', originalException);

      process.on("uncaughtException", function (err) {
        expect(err).to.match(/The name 'Training' already exists/);
        done()
      })

      VItest.createResourcePool( TestConfig.advanced.ResourcePoolName )
        .once('result', function (result) {
          expect(result.attributes).to.exist;
          done();
        })
        .once('error', function (err) {
          done('\n\nlast request : ' + VItest.vc.client.lastRequest);
        });

      process.nextTick(function () {
        process.listeners('uncaughtException').push(originalException)
      });

    });
  });
  */

  describe('#getVMNames()', function() {
    it('can obtain all Virtual Machine names', function (done) {

      VItest.getVMNames()
        .once('result', function (result, raw){

          expect(result.objects).to.exist;

          //console.log( util.inspect(result, {depth:null}) );

          if( _.isArray(result.objects) ) {
            expect( _.sample(result.objects).obj.attributes.type).to.be.equal('VirtualMachine');
          } else {
            expect(result.objects.obj.attributes.type).to.be.equal('VirtualMachine');
          }
          done();
        })
        .once('error', function (err){
          done('\n\nlast request : ' + VItest.vc.client.lastRequest);
        });
    });
  }); 

  describe('#getFolderByName()', function() {
    it('can get a folder MORef by name', function (done) {

      VItest.getFolderByName( TestConfig.templateFolderName )
        .once('result', function (result, raw){

          //console.log( util.inspect(result, {depth:null}));

          if( _.isEmpty(result) ) {
            done('No folder found with name ' + TestConfig.templateFolderName);
          }

          if( _.isArray(result) ) {
            expect( _.sample(result).attributes.type).to.be.equal('Folder');
          } else {
            expect(result.attributes.type).to.be.equal('Folder');
          }
          done();
        })
        .once('error', function (err){
          done('\n\nlast request : ' + VItest.vc.client.lastRequest);
        });
    });
  });

  describe('#getvAppsFromFolder()', function() {
    it('can obtain all vApps from a Folder', function (done) {

      VItest.getvAppsFromFolder( TestConfig.templateFolderName )
        .once('result', function (result, raw){

          if( _.isEmpty(result) ) {
            done('No vApp templates received. Is the Template folder empty on the vSphere server?');
          }

          //console.log( util.inspect(result, {depth:null}) );

          if( _.isArray(result) ) {
            expect( _.sample(result).obj.attributes.type).to.be.equal('VirtualApp');
          } else {
            expect(result.obj.attributes.type).to.be.equal('VirtualApp');
          }
          done();
        })
        .once('error', function (err){
          done('\n\nlast request : ' + VItest.vc.client.lastRequest);
        });
    });
  });

  describe('#createFolder()', function() {
    it('can create a Folder', function (done) {

      VItest.createFolder( TestConfig.templateFolderName )
        .once('result', function (result, raw){

          if( _.isEmpty(result) ) {
            done('Failed to create folder named ' + TestConfig.templateFolderName);
          }

          console.log( util.inspect(result, {depth:null}) );

          if( _.isArray(result) ) {
            expect( _.sample(result).attributes.type).to.be.equal('Folder');
          } else {
            expect(result.attributes.type).to.be.equal('Folder');
          }
          done();
        })
        .once('error', function (err){
          done('\n\nlast request : ' + VItest.vc.client.lastRequest);
        });
    });
  });

  describe('#getVirtualSwitchArray', function() {
    it('can get all Virtual Switches', function (done) {

      VItest.getVirtualSwitchArray()
        .once('result', function (result, raw){

          if( _.isEmpty(result) ) {
            done('Failed to get all Virtual Switches');
          }
          
          if( _.isArray(result) ) {
            expect( _.sample(result).attributes['xsi:type']).to.be.equal('HostVirtualSwitch');
          } else {
            expect(result.attributes['xsi:type']).to.be.equal('HostVirtualSwitch');
          }
          done();
        })
        .once('error', function (err){
          done('\n\nlast request : ' + VItest.vc.client.lastRequest);
        });
    });
  });

  describe('#getVirtualSwitchByName', function() {
    it('can get a vSwitch by name', function (done) {

      VItest.getVirtualSwitchByName( TestConfig.advanced.vSwitchName )
        .once('result', function (result, raw){

          if( _.isEmpty(result) ) {
            done('Failed to get vSwitch with name ' + TestConfig.advanced.vSwitchName);
          }

          if( _.isArray(result) ) {
            expect( _.sample(result).attributes['xsi:type']).to.be.equal('HostVirtualSwitch');
          } else {
            expect(result.attributes['xsi:type']).to.be.equal('HostVirtualSwitch');
          }
          done();
        })
        .once('error', function (err){
          done('\n\nlast request : ' + VItest.vc.client.lastRequest);
        });
    });
  });

  describe('#createVirtualSwitch()', function() {
    it('can create a VirtualSwitch', function (done) {

      VItest.createVirtualSwitch( TestConfig.advanced.vSwitchName )
        .once('result', function (result, raw){

          if( _.isArray(result) ) {
            expect( _.sample(result) ).to.be.empty;
          } else {
            expect(result).to.be.empty;
          }
          done();
        })
        .once('error', function (err){
          done('\n\nlast request : ' + VItest.vc.client.lastRequest);
        });
    });
  });

  describe('#getPortGroupArray()', function() {
    it('can get all Port Groups', function (done) {

      VItest.getPortGroupArray()
        .once('result', function (result, raw){

          if( _.isEmpty(result) ) {
            done('Failed to get all Port Groups');
          }
          
          if( _.isArray(result) ) {
            expect( _.sample(result).attributes['xsi:type']).to.be.equal('HostPortGroup');
          } else {
            expect(result.attributes['xsi:type']).to.be.equal('HostPortGroup');
          }
          done();
        })
        .once('error', function (err){
          done('\n\nlast request : ' + VItest.vc.client.lastRequest);
        });
    });
  });

  describe('#getPortGroupByName()', function() {
    it('can get a Port Group by name', function (done) {

      VItest.getPortGroupByName( TestConfig.advanced.portGroupName )
        .once('result', function (result, raw){

          if( _.isEmpty(result) ) {
            done('Failed to get Port Group with name ' + TestConfig.advanced.portGroupName);
          }

          if( _.isArray(result) ) {
            expect( _.sample(result).attributes['xsi:type']).to.be.equal('HostPortGroup');
          } else {
            expect(result.attributes['xsi:type']).to.be.equal('HostPortGroup');
          }
          done();
        })
        .once('error', function (err){
          done('\n\nlast request : ' + VItest.vc.client.lastRequest);
        });
    });
  });

  describe('#createPortGroup()', function() {});

  describe('#getVirtualApplianceByName()', function() {});
  describe('#cloneVirtualAppliance()', function() {});
          
});

