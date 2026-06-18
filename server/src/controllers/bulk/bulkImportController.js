const { runBulkImport } = require('../../utils/bulkImport');
const { successResponse, errorResponse } = require('../../utils/helpers');
const { logger } = require('../../utils/logger');
const { AuditLog } = require('../../models');

const bulkImportController = {
  /**
   * POST /api/v1/admin/bulk/import
   * Body shape:
   *   {
   *     dryRun?: bool,
   *     skipExisting?: bool,
   *     upsert?: bool,
   *     coaches?:   [{ email, first_name, last_name, phone?, password? }],
   *     students?:  [{ email, first_name, last_name, student_number, phone?, password? }],
   *     teams?:     [{ name, hall_id?, hall_name?, sport_type?, coach_id?, coach_email?, description? }],
   *     players?:   [{ email, sport?, position?, hall_id?, hall_name?, team_id?, team_name?,
   *                    date_of_birth?, height?, weight?, is_active? }]
   *   }
   */
  import: async (req, res) => {
    try {
      const { dryRun, skipExisting, upsert, ...sections } = req.body || {};
      const result = await runBulkImport(sections, { dryRun, skipExisting, upsert });

      // Audit per-section: one row per non-empty section. Skip on dry runs.
      if (!dryRun) {
        for (const [name, summary] of Object.entries(result.sections)) {
          if (!summary || summary.total === 0) continue;
          if (summary.created === 0 && summary.updated === 0) continue;
          try {
            await AuditLog.create({
              user_id: req.user?.id || null,
              action: 'BULK_IMPORT',
              entity_type: name,
              entity_id: null,
              details: JSON.stringify({
                total: summary.total,
                created: summary.created,
                updated: summary.updated,
                skipped: summary.skipped,
                failed: summary.failed
              })
            });
          } catch (auditErr) {
            logger.warn('Audit log failed for bulk import:', auditErr.message);
          }
        }
      }

      return successResponse(
        res,
        result,
        dryRun ? 'Bulk import preview (no changes written)' : 'Bulk import complete',
        dryRun ? 200 : (result.hard_errors && Object.values(result.hard_errors).some((arr) => arr.length) ? 207 : 200)
      );
    } catch (err) {
      logger.error('Bulk import error:', err);
      return errorResponse(res, 'Bulk import failed', 500);
    }
  }
};

module.exports = bulkImportController;