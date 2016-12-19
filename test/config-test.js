var vCenterTestConfig = {
  'vCenterIP' : '172.16.201.132',
  'vCenterUser' : 'administrator@vsphere.local',
  'vCenterPassword' : 'P@ssword1',
  'vCenter' : true,
  'templateFolderName': 'Templates',
  'advanced': {
    'ResourcePoolName': 'Training',	// The Resource Pool used to store new VApps
    'ResourcePoolCpuAllocation': -1,    // Cpu limit in Mhz (-1 = unlimited)
    'ResourcePoolMemAllocation': -1,     // Mem limit in MB (-1 = unlimited)
    'vSwitchName': 'Student1',
    'portGroupName': 'Student1_1',
    'portGroupVlan': 301,
  }        
};
exports.vCenterTestConfig = vCenterTestConfig;

