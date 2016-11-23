var should = require('chai').should(),
  vsphereCtrl = require('../lib/vsphere_controller'),
  authenticate = vsphereCtrl.authenticate;

describe('#authenticate', function() {
  it('Tests vSphere credentials', function() {
    authenticate(null, null, null).should.equal(true);
  });
});

