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
            expect( _.sample(result.objects).obj.attributes.type).to.be.equal('ResourcePool');
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
    it('can obtain Resource Pool by name: ' + '`' + TestConfig.advanced.ResourcePoolName + '`', function (done){

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
          
});

