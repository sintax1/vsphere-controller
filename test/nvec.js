var should = require('chai').should(),
  vsphereCtrl = require('../index'),
  authenticate = vsphereCtrl.authenticate;

describe('#authenticate', function() {
  it('Tests vSphere credentials', function() {
    authenticate(null, null, null).should.equal(true);
  });
});

