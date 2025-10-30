const service = require('./service');
const APIResponse = require('../../utils/response');

/**
 * Mock API controller - exposes mock endpoints for testing
 */
class MockApiController {
  /**
   * Create service job (mock ServiceTitan endpoint)
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   */
  async createJob(req, res, next) {
    try {
      const result = await service.createServiceJob(req.body);
      return APIResponse.created(res, result, 'Service job created (mock)');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get job status (mock ServiceTitan endpoint)
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   */
  async getJobStatus(req, res, next) {
    try {
      const { jobId } = req.params;
      const result = await service.getJobStatus(jobId);
      return APIResponse.success(res, result, 'Job status retrieved (mock)');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update job (mock ServiceTitan endpoint)
   * @param {Request} req
   * @param {Response} res
   * @param {NextFunction} next
   */
  async updateJob(req, res, next) {
    try {
      const { jobId } = req.params;
      const result = await service.updateJob(jobId, req.body);
      return APIResponse.success(res, result, 'Job updated (mock)');
    } catch (error) {
      next(error);
    }
  }
}

const controller = new MockApiController();
module.exports = {
  createJob: controller.createJob.bind(controller),
  getJobStatus: controller.getJobStatus.bind(controller),
  updateJob: controller.updateJob.bind(controller),
};
