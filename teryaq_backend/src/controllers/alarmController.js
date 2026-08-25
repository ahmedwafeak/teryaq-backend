// Alarm & Dose Verification Controller
const escalationService = require('../services/escalationService');

/**
 * Handle alarm trigger event from Mobile App
 */
function handleAlarmTriggered(req, res) {
  const { doseId, patientName, medicationName, caregiverPhone, timeoutMs } = req.body;

  if (!doseId || !patientName || !medicationName) {
    return res.status(400).json({ success: false, message: 'بيانات التنبيه غير مكتملة.' });
  }

  // Default timeout: 10 mins (or custom override for testing)
  const duration = timeoutMs ? parseInt(timeoutMs, 10) : 10 * 60 * 1000;

  escalationService.startEscalationTimer(
    doseId,
    patientName,
    medicationName,
    caregiverPhone || '+966500000000',
    duration
  );

  return res.json({
    success: true,
    message: 'تم بدء رنين المنبه وتفعيل مؤقت تصعيد الطوارئ.',
    doseId,
    escalationTimeoutMs: duration
  });
}

/**
 * Handle AI Photo Verification submission from Mobile App
 */
function handleVerifyDose(req, res) {
  const { doseId, confidenceScore, photoBase64, detectedText } = req.body;

  if (!doseId) {
    return res.status(400).json({ success: false, message: 'معرف الجرعة مطلوب.' });
  }

  const result = escalationService.verifyDoseSuccess(
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
  getLogStatus,
  getAllLogs
};
