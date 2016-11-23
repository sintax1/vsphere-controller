'use strict';

exports.get = function(req, res){
  if (req.session.vsphere_info) {
    var data = req.session.vsphere_info;
    data.auth.pass = '';
    res.send(data);
  } else {
    var data = {
      settings: {
        selectedServer: {
          name: 'r9b-sat-vsvc-01',
          ip: '10.40.114.100'
        }
      },
      auth: {
        user: 'username',
        pass: ''
      }
    };
    res.send(data);
  }
};

exports.update = function(req, res) {
  req.session.vsphere_info = req.body;
  req.session.save();
  res.send('Success');
};
