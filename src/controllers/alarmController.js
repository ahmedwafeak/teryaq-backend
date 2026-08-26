// Alarm & Dose Verification Controller
const escalationService = require('../services/escalationService');

/**
 * Handle alarm trigger event from Mobile App
 */
async function handleAlarmTriggered(req, res) {
  const { doseId, patientName, medicationName, caregiverPhone, timeoutMs } = req.body;

  if (!doseId || !patientName || !medicationName) {
    return res.status(400).json({ success: false, message: 'بيانات التنبيه غير مكتملة.' });
  }

  // Default timeout: 10 mins (or custom override for testing)
  const duration = timeoutMs ? parseInt(timeoutMs, 10) : 10 * 60 * 1000;

  const log = await escalationService.startEscalationTimer(
    doseId,
    patientName,
    medicationName,
    caregiverPhone || '+966500000000',
    duration
  );

  return res.json({
    success: true,
    message: 'تم بدء رنين المنبه وحفظ مؤقت التصعيد في السحاب.',
    doseId,
    escalationTimeoutMs: duration,
    log
  });
}

/**
 * Handle AI Photo Verification submission from Mobile App
 */
async function handleVerifyDose(req, res) {
  const { doseId, confidenceScore, photoBase64, detectedText } = req.body;

  if (!doseId) {
    return res.status(400).json({ success: false, message: 'معرف الجرعة مطلوب.' });
  }

  const result = await escalationService.verifyDoseSuccess(
    doseId,
    confidenceScore || 0.95,
    'https://storage.teryaq.health/doses/' + doseId + '.jpg'
  );

  return res.json({
    success: true,
    message: 'تم التحقق من الجرعة وإيقاف التنبيه ومؤقت الطوارئ.',
    log: result,
    detectedText
  });
}

/**
 * Vercel Cron Job Endpoint: Check & Escalated Overdue Doses Every Minute
 */
async function handleCronEscalations(req, res) {
  try {
    const summary = await escalationService.processCronEscalations();
    return res.json({
      success: true,
      message: 'تم فحص وإنذار الحالات المتأخرة بنجاح عبر Cron Job.',
      summary
    });
  } catch (error) {
    console.error('Vercel Cron Error:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Get Dose status log
 */
function getLogStatus(req, res) {
  const { doseId } = req.params;
  const status = escalationService.getDoseStatus(doseId);

  if (!status) {
    return res.status(404).json({ success: false, message: 'الجرعة غير موجودة.' });
  }

  return res.json({ success: true, log: status });
}

/**
 * Get all logs for caregiver dashboard
 */
function getAllLogs(req, res) {
  return res.json({ success: true, logs: escalationService.getAllLogs() });
}

module.exports = {
  handleAlarmTriggered,
  handleVerifyDose,
  handleCronEscalations,
  getLogStatus,
  getAllLogs
};
