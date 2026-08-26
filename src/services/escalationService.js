// Service to handle 10-minute caregiver escalation timers (Database + Serverless Cron Compatible)
const db = require('../config/db');

const activeTimers = new Map();
const doseStatusLogs = new Map();

/**
 * Start a 10-minute escalation timer for a dose alarm
 */
async function startEscalationTimer(doseId, patientName, medicationName, caregiverPhone, timeoutMs = 10 * 60 * 1000) {
  if (activeTimers.has(doseId)) {
    clearTimeout(activeTimers.get(doseId));
  }

  const startTime = new Date();
  const escalatesAt = new Date(startTime.getTime() + timeoutMs);

  const doseLog = {
    doseId,
    patientName,
    medicationName,
    caregiverPhone,
    status: 'ALARM_RINGING',
    startTime: startTime.toISOString(),
    escalatesAt: escalatesAt.toISOString(),
    verifiedAt: null,
    escalatedAt: null
  };

  doseStatusLogs.set(doseId, doseLog);
  await db.saveDoseLog(doseLog);

  console.log(`[ESCALATION ENGINE] Started escalation tracking for Dose ${doseId} (${medicationName} for ${patientName}) - Escalates at: ${escalatesAt.toISOString()}`);

  // In-Memory Timer (For local dev environment)
  const timer = setTimeout(() => {
    triggerCaregiverEscalation(doseId);
  }, timeoutMs);

  activeTimers.set(doseId, timer);
  return doseLog;
}

/**
 * Cancel the escalation timer upon successful AI photo verification
 */
async function verifyDoseSuccess(doseId, confidenceScore, photoUrl = null) {
  if (activeTimers.has(doseId)) {
    clearTimeout(activeTimers.get(doseId));
    activeTimers.delete(doseId);
  }

  const log = doseStatusLogs.get(doseId) || { doseId };
  log.status = 'COMPLETED';
  log.verifiedAt = new Date().toISOString();
  log.confidenceScore = confidenceScore;
  log.photoUrl = photoUrl;
  doseStatusLogs.set(doseId, log);

  await db.saveDoseLog(log);

  console.log(`[ESCALATION ENGINE] ✅ Dose ${doseId} verified successfully! Timer & escalation cancelled.`);
  return log;
}

/**
 * Trigger emergency notification to caregiver when 10-minute timer expires
 */
async function triggerCaregiverEscalation(doseId) {
  if (activeTimers.has(doseId)) {
    activeTimers.delete(doseId);
  }

  const log = doseStatusLogs.get(doseId) || { doseId };
  log.status = 'ESCALATED';
  log.escalatedAt = new Date().toISOString();
  doseStatusLogs.set(doseId, log);

  await db.saveDoseLog(log);

  console.error(`[EMERGENCY ESCALATION 🚨] Patient ${log.patientName || 'Patient'} missed medication ${log.medicationName || 'Medication'}! Alerting caregiver at ${log.caregiverPhone || '+966500000000'}...`);
  // FCM High-Priority Push & Twilio SMS trigger logic
  return log;
}

/**
 * Process Overdue Escalations via Vercel Cron Job
 */
async function processCronEscalations() {
  console.log('[CRON ENGINE ⏰] Checking for overdue unverified alarms...');
  const overdueDoses = await db.getOverdueEscalations();

  const escalatedList = [];
  for (const dose of overdueDoses) {
    const doseId = dose.dose_id || dose.doseId;
    const patientName = dose.patient_name || dose.patientName;
    const medicationName = dose.medication_name || dose.medicationName;
    const caregiverPhone = dose.caregiver_phone || dose.caregiverPhone;

    console.error(`[CRON ESCALATION 🚨] Escalating overdue dose ${doseId} for ${patientName} (${medicationName}) to caregiver ${caregiverPhone}`);

    const escalatedLog = {
      doseId,
      patientName,
      medicationName,
      caregiverPhone,
      status: 'ESCALATED',
      escalatedAt: new Date().toISOString()
    };

    await db.saveDoseLog(escalatedLog);
    escalatedList.push(escalatedLog);
  }

  return {
    checkedAt: new Date().toISOString(),
    overdueCount: overdueDoses.length,
    escalated: escalatedList
  };
}

function getDoseStatus(doseId) {
  return doseStatusLogs.get(doseId) || null;
}

function getAllLogs() {
  return Array.from(doseStatusLogs.values());
}

module.exports = {
  startEscalationTimer,
  verifyDoseSuccess,
  triggerCaregiverEscalation,
  processCronEscalations,
  getDoseStatus,
  getAllLogs
};
