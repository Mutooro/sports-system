const express = require('express');
const router = express.Router();
const bulkImportController = require('../controllers/bulk/bulkImportController');
const { authenticate, authorize } = require('../middleware/auth');

router.post(
  '/import',
  authenticate,
  authorize('admin'),
  bulkImportController.import
);

module.exports = router;