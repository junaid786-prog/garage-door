const queueManager = require('../../config/queue');
const logger = require('../../utils/logger');
const { NotFoundError } = require('../../utils/errors');

/**
 * Get all DLQ jobs
 * GET /admin/queue/dlq
 */
const getDLQJobs = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const start = (page - 1) * limit;
    const end = start + parseInt(limit) - 1;

    const jobs = await queueManager.getDLQJobs(start, end);
    const stats = await queueManager.getDLQStats();

    logger.info('Retrieved DLQ jobs', {
      page,
      limit,
      totalJobs: stats.total,
    });

    res.json({
      success: true,
      data: {
        jobs,
        stats,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: stats.total,
          totalPages: Math.ceil(stats.total / limit),
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error getting DLQ jobs', { error });
    next(error);
  }
};

/**
 * Get DLQ statistics
 * GET /admin/queue/dlq/stats
 */
const getDLQStats = async (req, res, next) => {
  try {
    const stats = await queueManager.getDLQStats();

    logger.info('Retrieved DLQ stats', { stats });

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error getting DLQ stats', { error });
    next(error);
  }
};

/**
 * Retry a job from DLQ
 * POST /admin/queue/dlq/:jobId/retry
 */
const retryDLQJob = async (req, res, next) => {
  try {
    const { jobId } = req.params;

    const result = await queueManager.retryJobFromDLQ(jobId);

    logger.info('Job retried from DLQ', { jobId });

    res.json({
      success: true,
      message: 'Job retried successfully',
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return next(new NotFoundError(`DLQ job ${req.params.jobId} not found`));
    }
    logger.error('Error retrying DLQ job', { jobId: req.params.jobId, error });
    next(error);
  }
};

/**
 * Remove a job from DLQ
 * DELETE /admin/queue/dlq/:jobId
 */
const removeDLQJob = async (req, res, next) => {
  try {
    const { jobId } = req.params;

    const result = await queueManager.removeDLQJob(jobId);

    logger.info('Job removed from DLQ', { jobId });

    res.json({
      success: true,
      message: 'Job removed from DLQ',
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return next(new NotFoundError(`DLQ job ${req.params.jobId} not found`));
    }
    logger.error('Error removing DLQ job', { jobId: req.params.jobId, error });
    next(error);
  }
};

/**
 * Get failed jobs from a specific queue
 * GET /admin/queue/:queueName/failed
 */
const getFailedJobs = async (req, res, next) => {
  try {
    const { queueName } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const start = (page - 1) * limit;
    const end = start + parseInt(limit) - 1;

    const jobs = await queueManager.getFailedJobs(queueName, start, end);

    logger.info('Retrieved failed jobs', {
      queueName,
      page,
      limit,
      totalJobs: jobs.length,
    });

    res.json({
      success: true,
      data: {
        queue: queueName,
        jobs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error getting failed jobs', { queueName: req.params.queueName, error });
    next(error);
  }
};

/**
 * Get queue statistics
 * GET /admin/queue/stats
 */
const getQueueStats = async (req, res, next) => {
  try {
    const stats = await queueManager.getAllQueueStats();

    logger.info('Retrieved queue stats');

    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error getting queue stats', { error });
    next(error);
  }
};

/**
 * Get specific queue statistics
 * GET /admin/queue/:queueName/stats
 */
const getSpecificQueueStats = async (req, res, next) => {
  try {
    const { queueName } = req.params;
    const stats = await queueManager.getQueueStats(queueName);

    if (!stats) {
      return next(new NotFoundError(`Queue ${queueName} not found`));
    }

    logger.info('Retrieved queue stats', { queueName });

    res.json({
      success: true,
      data: {
        queue: queueName,
        stats,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error getting queue stats', { queueName: req.params.queueName, error });
    next(error);
  }
};

/**
 * Pause a queue
 * POST /admin/queue/:queueName/pause
 */
const pauseQueue = async (req, res, next) => {
  try {
    const { queueName } = req.params;
    await queueManager.pauseQueue(queueName);

    logger.info('Queue paused', { queueName });

    res.json({
      success: true,
      message: `Queue ${queueName} paused successfully`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error pausing queue', { queueName: req.params.queueName, error });
    next(error);
  }
};

/**
 * Resume a queue
 * POST /admin/queue/:queueName/resume
 */
const resumeQueue = async (req, res, next) => {
  try {
    const { queueName } = req.params;
    await queueManager.resumeQueue(queueName);

    logger.info('Queue resumed', { queueName });

    res.json({
      success: true,
      message: `Queue ${queueName} resumed successfully`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error resuming queue', { queueName: req.params.queueName, error });
    next(error);
  }
};

/**
 * Clean a queue (remove old completed/failed jobs)
 * POST /admin/queue/:queueName/clean
 */
const cleanQueue = async (req, res, next) => {
  try {
    const { queueName } = req.params;
    const { grace = 24 * 60 * 60 * 1000 } = req.body; // Default 24 hours

    await queueManager.cleanQueue(queueName, grace);

    logger.info('Queue cleaned', { queueName, grace });

    res.json({
      success: true,
      message: `Queue ${queueName} cleaned successfully`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error cleaning queue', { queueName: req.params.queueName, error });
    next(error);
  }
};

module.exports = {
  getDLQJobs,
  getDLQStats,
  retryDLQJob,
  removeDLQJob,
  getFailedJobs,
  getQueueStats,
  getSpecificQueueStats,
  pauseQueue,
  resumeQueue,
  cleanQueue,
};
