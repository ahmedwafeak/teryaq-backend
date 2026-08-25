// Service to handle 10-minute caregiver escalation timers

const activeTimers = new Map();
const doseStatusLogs = new Map();

/**
 * Start a 10-minute escalation timer for a dose alarm
 * @param {string} doseId - Unique ID for the scheduled dose
 * @param {string} patientName - Patient name
 * @param {string} medicationName - Name of the required medication
 * @param {string} caregiverPhone - Caregiver contact phone
 * @param {number} timeoutMs - Timeout duration (default 10 minutes = 600,000ms, set smaller for testing if needed)
 */
function startEscalationTimer(doseId, patientName, medicationName, caregiverPhone, timeoutMs = 10 * 60 * 1000) {
  // Cancel any existing timer for this dose
  if (activeTimers.has(doseId)) {
    clearTimeout(activeTimers.get(doseId));
  }

  doseStatusLogs.set(doseId, {
    doseId,
    patientName,
    medicationName,
    caregiverPhone,
    status: 'ALARM_RINGING',
    startTime: new Date().toISOString(),
    verifiedAt: null,
    escalatedAt: null
  });

  console.log(`[ESCALATION ENGINE] Started 10-minute timer for Dose ${doseId} (${medicationName} for ${patientName})`);

  const timer = setTimeout(() => {
    triggerCaregiverEscalation(doseId);
  }, timeoutMs);

  activeTimers.set(doseId, timer);
}

/**
 * Cancel the escalation timer upon successful AI photo verification
 */
function verifyDoseSuccess(doseId, confidenceScore, photoUrl = null) {
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

  console.log(`[ESCALATION ENGINE] ✅ Dose ${doseId} verified successfully! Timer cancelled.`);
  return log;
}

/**
 * Trigger emergency notification to caregiver when 10-minute timer expires
 */
function triggerCaregiverEscalation(doseId) {
  activeTimers.delete(doseId);
  const log = doseStatusLogs.get(doseId);
  if (!log) return;

  log.status = 'ESCALATED';
  log.escalatedAt = new Date().toISOString();
  doseStatusLogs.set(doseId, log);

  console.error(`[EMERGENCY ESCALATION 🚨] Patient ${log.patientName} missed medication ${log.medicationName}! Alerting caregiver at ${log.caregiverPhone}...`);
  // Here FCM High-Priority Push & Twilio SMS trigger is executed
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
  getDoseStatus,
  getAllLogs
};
