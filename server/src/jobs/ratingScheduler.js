const cron = require('node-cron');
const { recalculateAllRatings } = require('../services/ratingService');
const { logger } = require('../utils/logger');

const SCHEDULE_LABELS = {
  '0 2 * * *': 'Daily at 2:00 AM',
  '0 */6 * * *': 'Every 6 hours',
  '0 0 * * 0': 'Weekly on Sunday at midnight',
  '0 0 1 * *': 'Monthly on the 1st at midnight'
};

const state = {
  enabled: false,
  schedule: '0 2 * * *',
  scheduleLabel: 'Daily at 2:00 AM',
  timezone: process.env.TZ || 'Africa/Kampala',
  lastRunAt: null,
  lastRunCount: 0,
  lastRunError: null,
  isRunning: false,
  triggeredBy: null
};

let cronTask = null;

async function runScheduledRecalculation(trigger = 'schedule') {
  if (state.isRunning) {
    logger.warn('Rating recalculation already in progress, skipping');
    return { skipped: true, reason: 'already_running' };
  }

  state.isRunning = true;
  state.triggeredBy = trigger;

  try {
    const { calculated, eligible } = await recalculateAllRatings();
    state.lastRunAt = new Date().toISOString();
    state.lastRunCount = calculated;
    state.lastRunError = null;
    logger.info(`Rating recalculation (${trigger}): ${calculated}/${eligible} players updated`);
    return { calculated, eligible };
  } catch (err) {
    state.lastRunError = err.message;
    logger.error(`Rating recalculation failed (${trigger}):`, err);
    throw err;
  } finally {
    state.isRunning = false;
  }
}

function getScheduleStatus() {
  return {
    enabled: state.enabled,
    schedule: state.schedule,
    scheduleLabel: state.scheduleLabel,
    timezone: state.timezone,
    lastRunAt: state.lastRunAt,
    lastRunCount: state.lastRunCount,
    lastRunError: state.lastRunError,
    isRunning: state.isRunning,
    lastTriggeredBy: state.triggeredBy
  };
}

function startRatingScheduler() {
  if (process.env.RATING_AUTO_CALCULATE === 'false') {
    logger.info('Auto-rating scheduler disabled (RATING_AUTO_CALCULATE=false)');
    return;
  }

  const schedule = process.env.RATING_CRON_SCHEDULE || '0 2 * * *';
  if (!cron.validate(schedule)) {
    logger.error(`Invalid RATING_CRON_SCHEDULE: "${schedule}" — scheduler not started`);
    return;
  }

  state.enabled = true;
  state.schedule = schedule;
  state.scheduleLabel = SCHEDULE_LABELS[schedule] || schedule;
  state.timezone = process.env.TZ || 'Africa/Kampala';

  cronTask = cron.schedule(
    schedule,
    () => runScheduledRecalculation('schedule'),
    { timezone: state.timezone }
  );

  logger.info(`Auto-rating scheduler started — ${state.scheduleLabel} (${state.timezone})`);

  if (process.env.RATING_RUN_ON_STARTUP === 'true') {
    setTimeout(() => {
      runScheduledRecalculation('startup').catch(() => {});
    }, 8000);
  }
}

function stopRatingScheduler() {
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
    state.enabled = false;
  }
}

module.exports = {
  startRatingScheduler,
  stopRatingScheduler,
  getScheduleStatus,
  runScheduledRecalculation
};
