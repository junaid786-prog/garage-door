const express = require('express');
const router = express.Router();
const controller = require('./controller');

/**
 * Mock API routes
 * Task #2: Mock Endpoint
 */

// Mock ServiceTitan endpoints
router.post('/servicetitan/jobs', controller.createJob);
router.get('/servicetitan/jobs/:jobId', controller.getJobStatus);
router.put('/servicetitan/jobs/:jobId', controller.updateJob);

module.exports = router;
