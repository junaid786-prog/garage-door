const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { validateJob, validateJobStatus, validateBatchJobs } = require('./validator');

/**
 * ServiceTitan integration routes
 * Handles job creation, status updates, and ServiceTitan API operations
 */

// Health check endpoint
router.get('/health', controller.getHealth);

// Authentication test endpoint
router.get('/auth/test', controller.testAuth);

// Job management endpoints
router.post('/jobs', validateJob, controller.createJob);
router.get('/jobs/:jobId', controller.getJob);
router.patch('/jobs/:jobId/status', validateJobStatus, controller.updateJobStatus);
router.delete('/jobs/:jobId', controller.cancelJob);

// Batch operations
router.post('/jobs/batch', validateBatchJobs, controller.createBatchJobs);

// Query endpoints
router.get('/jobs', controller.getJobsByDateRange);

// Webhook endpoint (for future real implementation)
router.post('/webhook', controller.webhook);

module.exports = router;