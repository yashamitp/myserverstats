const Server = require('../models/Server');
const AIInvestigation = require('../models/AIInvestigation');
const aiService = require('../ai/aiService');
const { success, error } = require('../utils/response');

// POST /api/v1/ai/chat - Interactive AI troubleshooting
exports.chat = async (req, res, next) => {
  try {
    const { serverId, prompt } = req.body;

    if (!aiService.isConfigured()) {
      return error(
        res,
        'AI troubleshooting service is not configured. Please set AI_API_KEY in backend environment.',
        503,
        { configured: false }
      );
    }

    const server = await Server.findOne({
      _id: serverId,
      tenantId: req.user.tenantId
    }).select('+credentials.encryptedPrivateKey +credentials.encryptedPassword +credentials.keyPassphrase');

    if (!server) {
      return error(res, 'Server not found or access denied', 404);
    }

    const investigation = await aiService.runInvestigation(
      server,
      prompt,
      req.user.tenantId,
      req.user.id
    );

    return success(res, investigation, 'AI investigation completed successfully');
  } catch (err) {
    if (err.code === 'AI_NOT_CONFIGURED') {
      return error(res, err.message, 503, { configured: false });
    }
    next(err);
  }
};

// POST /api/v1/ai/servers/:id/analyze - Holistic automated server health analysis
exports.analyzeServer = async (req, res, next) => {
  try {
    if (!aiService.isConfigured()) {
      return error(
        res,
        'AI troubleshooting service is not configured. Please set AI_API_KEY in backend environment.',
        503,
        { configured: false }
      );
    }

    const server = await Server.findOne({
      _id: req.params.id,
      tenantId: req.user.tenantId
    }).select('+credentials.encryptedPrivateKey +credentials.encryptedPassword +credentials.keyPassphrase');

    if (!server) {
      return error(res, 'Server not found or access denied', 404);
    }

    const { focus = 'general' } = req.body;
    const prompt = `Conduct a comprehensive health diagnostic of server "${server.name}" with focus on "${focus}". Inspect current CPU, memory, disk, network, active processes, and any recent system warnings or service failures. Synthesize your findings and list actionable remediation recommendations.`;

    const investigation = await aiService.runInvestigation(
      server,
      prompt,
      req.user.tenantId,
      req.user.id
    );

    return success(res, investigation, 'Server analysis completed');
  } catch (err) {
    if (err.code === 'AI_NOT_CONFIGURED') {
      return error(res, err.message, 503, { configured: false });
    }
    next(err);
  }
};

// GET /api/v1/ai/servers/:id/insights - Get past AI investigation reports
exports.getServerInsights = async (req, res, next) => {
  try {
    const { limit = 20 } = req.query;

    const insights = await AIInvestigation.find({
      serverId: req.params.id,
      tenantId: req.user.tenantId
    })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10));

    return success(res, {
      aiConfigured: aiService.isConfigured(),
      count: insights.length,
      insights
    });
  } catch (err) {
    next(err);
  }
};
