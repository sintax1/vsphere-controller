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
      console.error(err);
      // this should fail if there's a problem
      expect(VItest.vc.userName).to.exist;
      //console.log('logged in user : ' + VItest.vc.userName);
      expect(VItest.vc.fullName).to.exist;
      //console.log('logged in user fullname : ' + VItest.vc.fullName);
      expect(VItest.serviceContent).to.exist;
      //console.log(VItest.serviceContent);
      done();
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
            console.error(err);
          });
      })
      .once('error', function (err) {
        console.error(err);
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
        console.error(err);
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
        console.error(err);
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
          console.log('\n\nlast request : ' + VItest.vc.client.lastRequest);
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
          console.log('\n\nlast request : ' + VItest.vc.client.lastRequest);
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
          console.log('\n\nlast request : ' + VItest.vc.client.lastRequest);
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
          console.log('\n\nlast request : ' + VItest.vc.client.lastRequest);
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
          console.log('\n\nlast request : ' + VItest.vc.client.lastRequest);
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
          console.log('\n\nlast request : ' + VItest.vc.client.lastRequest);
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
          //console.log(util.inspect(result.objects, {depth: null}));

          if( _.isArray(result.objects) ) {
            expect( _.sample(result.objects).obj.attributes.type).to.be.equal('VirtualMachine');
          } else {
            expect(result.objects.obj.attributes.type).to.be.equal('VirtualMachine');
          }
          done();
        })
        .once('error', function (err){
          console.log('\n\nlast request : ' + VItest.vc.client.lastRequest);
        });
    });
  }); 

  describe('#getvAppsFromFolder()', function() {
    it('can obtain all vApps from a Folder', function (done) {

      VItest.getvAppsFromFolder( TestConfig.templateFolderName )
        .once('result', function (result, raw){

          if( _.isEmpty(result) ) {
            console.log('No vApp templates received. Is the Template folder empty on the vSphere server?');
            done();
          }

          if( _.isArray(result) ) {
            expect( _.sample(result).obj.attributes.type).to.be.equal('VirtualApp');
          } else {
            expect(result.obj.attributes.type).to.be.equal('VirtualApp');
          }
          done();
        })
        .once('error', function (err){
          console.log('\n\nlast request : ' + VItest.vc.client.lastRequest);
        });
    });
  });

  describe('#getFolderByName()', function() {});

  describe('#createFolder()', function() {});
  describe('#getVirtualSwitchByName', function() {});
  describe('#createVirtualSwitch()', function() {});
  describe('#getVirtualPortGroupByName()', function() {});
  describe('#getVirtualApplianceByName()', function() {});
  describe('#cloneVirtualAppliance()', function() {});
          
});

