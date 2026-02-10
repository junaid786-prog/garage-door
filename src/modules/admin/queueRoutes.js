const express = require('express');
const router = express.Router();
const queueController = require('./queueController');

// DLQ routes
router.get('/dlq', queueController.getDLQJobs);
router.get('/dlq/stats', queueController.getDLQStats);
router.post('/dlq/:jobId/retry', queueController.retryDLQJob);
router.delete('/dlq/:jobId', queueController.removeDLQJob);

// Queue statistics routes
router.get('/stats', queueController.getQueueStats);
router.get('/:queueName/stats', queueController.getSpecificQueueStats);

// Queue management routes
router.post('/:queueName/pause', queueController.pauseQueue);
router.post('/:queueName/resume', queueController.resumeQueue);
router.post('/:queueName/clean', queueController.cleanQueue);

// Failed jobs routes
router.get('/:queueName/failed', queueController.getFailedJobs);

module.exports = router;
