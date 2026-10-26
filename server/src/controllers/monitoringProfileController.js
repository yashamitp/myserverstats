const MonitoringProfile = require('../models/MonitoringProfile');
const Server = require('../models/Server');
const AuditEvent = require('../models/AuditEvent');
const { success, error } = require('../utils/response');

// Predefined template profiles seeded for tenants
const DEFAULT_PROFILES = [
  {
    name: 'Standard Linux Server',
    description: 'Balanced CPU, RAM and disk monitoring suitable for general Linux workloads.',
    targetOs: 'linux',
    isDefault: true,
    checkIntervalSec: 10,
    thresholds: {
      cpu: { enabled: true, threshold: 85, severity: 'warning' },
      memory: { enabled: true, threshold: 90, severity: 'warning' },
      disk: { enabled: true, threshold: 90, severity: 'critical' }
    },
    monitoredServices: [
      { name: 'ssh.service', targetOs: 'linux', required: true }
    ]
  },
  {
    name: 'Web Application Server',
    description: 'Optimized for high-traffic HTTP/HTTPS web application servers and reverse proxies.',
    targetOs: 'linux',
    isDefault: false,
    checkIntervalSec: 10,
    thresholds: {
      cpu: { enabled: true, threshold: 80, severity: 'warning' },
      memory: { enabled: true, threshold: 85, severity: 'warning' },
      disk: { enabled: true, threshold: 85, severity: 'critical' }
    },
    monitoredServices: [
      { name: 'nginx.service', targetOs: 'linux', required: true },
      { name: 'ssh.service', targetOs: 'linux', required: true }
    ]
  },
  {
    name: 'Database Host',
    description: 'Strict monitoring for database engines with lower memory threshold tolerances.',
    targetOs: 'any',
    isDefault: false,
    checkIntervalSec: 10,
    thresholds: {
      cpu: { enabled: true, threshold: 80, severity: 'warning' },
      memory: { enabled: true, threshold: 92, severity: 'critical' },
      disk: { enabled: true, threshold: 80, severity: 'critical' }
    },
    monitoredServices: [
      { name: 'mongod.service', targetOs: 'linux', required: false },
      { name: 'postgresql.service', targetOs: 'linux', required: false }
    ]
  },
  {
    name: 'Windows Server',
    description: 'Tailored for Windows Server 2019/2022/2025 and Windows 10/11 hosts.',
    targetOs: 'windows',
    isDefault: false,
    checkIntervalSec: 15,
    thresholds: {
      cpu: { enabled: true, threshold: 85, severity: 'warning' },
      memory: { enabled: true, threshold: 90, severity: 'warning' },
      disk: { enabled: true, threshold: 90, severity: 'critical' }
    },
    monitoredServices: [
      { name: 'sshd', targetOs: 'windows', required: true },
      { name: 'TermService', targetOs: 'windows', required: false },
      { name: 'wuauserv', targetOs: 'windows', required: false }
    ],
    eventLogFilters: [
      { logName: 'System', entryTypes: ['Error', 'Critical'], source: '' }
    ]
  }
];

// GET /api/v1/profiles - List monitoring profiles
exports.getProfiles = async (req, res, next) => {
  try {
    let profiles = await MonitoringProfile.find({ tenantId: req.user.tenantId }).sort({ isDefault: -1, createdAt: 1 });

    // Seed defaults if empty
    if (profiles.length === 0) {
      const seedData = DEFAULT_PROFILES.map(p => ({ ...p, tenantId: req.user.tenantId }));
      profiles = await MonitoringProfile.insertMany(seedData);
    }

    return success(res, profiles);
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/profiles - Create profile
exports.createProfile = async (req, res, next) => {
  try {
    const {
      name,
      description,
      targetOs,
      checkIntervalSec,
      thresholds,
      monitoredServices,
      eventLogFilters,
      isDefault
    } = req.body;

    if (!name || name.trim() === '') {
      return error(res, 'Profile name is required', 400);
    }

    if (isDefault) {
      await MonitoringProfile.updateMany({ tenantId: req.user.tenantId }, { isDefault: false });
    }

    const profile = await MonitoringProfile.create({
      tenantId: req.user.tenantId,
      name: name.trim(),
      description: description || '',
      targetOs: targetOs || 'any',
      checkIntervalSec: parseInt(checkIntervalSec, 10) || 10,
      thresholds: thresholds || {},
      monitoredServices: monitoredServices || [],
      eventLogFilters: eventLogFilters || [],
      isDefault: Boolean(isDefault)
    });

    await AuditEvent.create({
      tenantId: req.user.tenantId,
      actorId: req.user.id,
      action: 'profile.created',
      resourceType: 'monitoring_profile',
      resourceId: profile._id.toString(),
      metadata: { name: profile.name, targetOs: profile.targetOs }
    });

    return success(res, profile, 'Monitoring profile created successfully', 201);
  } catch (err) {
    next(err);
  }
};

// PUT /api/v1/profiles/:id - Update profile
exports.updateProfile = async (req, res, next) => {
  try {
    const profile = await MonitoringProfile.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId
    });

    if (!profile) {
      return error(res, 'Monitoring profile not found', 404);
    }

    const {
      name,
      description,
      targetOs,
      checkIntervalSec,
      thresholds,
      monitoredServices,
      eventLogFilters,
      isDefault
    } = req.body;

    if (isDefault && !profile.isDefault) {
      await MonitoringProfile.updateMany({ tenantId: req.user.tenantId }, { isDefault: false });
      profile.isDefault = true;
    } else if (isDefault !== undefined) {
      profile.isDefault = Boolean(isDefault);
    }

    if (name) profile.name = name.trim();
    if (description !== undefined) profile.description = description;
    if (targetOs) profile.targetOs = targetOs;
    if (checkIntervalSec) profile.checkIntervalSec = parseInt(checkIntervalSec, 10);
    if (thresholds) profile.thresholds = thresholds;
    if (monitoredServices) profile.monitoredServices = monitoredServices;
    if (eventLogFilters) profile.eventLogFilters = eventLogFilters;

    await profile.save();

    return success(res, profile, 'Monitoring profile updated successfully');
  } catch (err) {
    next(err);
  }
};

// DELETE /api/v1/profiles/:id - Delete profile
exports.deleteProfile = async (req, res, next) => {
  try {
    const profile = await MonitoringProfile.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.user.tenantId
    });

    if (!profile) {
      return error(res, 'Monitoring profile not found', 404);
    }

    // Unassign servers using this profile
    await Server.updateMany(
      { tenantId: req.user.tenantId, monitoringProfileId: profile._id },
      { monitoringProfileId: null }
    );

    return success(res, null, 'Monitoring profile deleted successfully');
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/profiles/:id/assign - Bulk assign profile to servers
exports.assignProfileToServers = async (req, res, next) => {
  try {
    const { serverIds } = req.body;
    if (!Array.isArray(serverIds) || serverIds.length === 0) {
      return error(res, 'serverIds array is required', 400);
    }

    const profile = await MonitoringProfile.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId
    });

    if (!profile) {
      return error(res, 'Monitoring profile not found', 404);
    }

    const result = await Server.updateMany(
      { _id: { $in: serverIds }, tenantId: req.user.tenantId },
      {
        monitoringProfileId: profile._id,
        monitoringInterval: profile.checkIntervalSec
      }
    );

    await AuditEvent.create({
      tenantId: req.user.tenantId,
      actorId: req.user.id,
      action: 'profile.assigned',
      resourceType: 'monitoring_profile',
      resourceId: profile._id.toString(),
      metadata: { profileName: profile.name, serverCount: result.modifiedCount }
    });

    return success(res, { assignedCount: result.modifiedCount }, `Profile assigned to ${result.modifiedCount} server(s)`);
  } catch (err) {
    next(err);
  }
};
