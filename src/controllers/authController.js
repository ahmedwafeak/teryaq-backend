// Auth Controller for Restricted Access & Google Authentication
const db = require('../config/db');

const validInviteCodes = new Map([
  ['TRQ-MOTHER', { patientName: 'والدتي العزيزة', patientId: 'p-mother', medication: 'دواء الضغط (كابوتين 25mg)', caregiverPhone: '+201000000000' }],
  ['TRQ-WIFE', { patientName: 'زوجتي الغالية', patientId: 'p-wife', medication: 'الفيتامينات اليومية', caregiverPhone: '+201000000000' }],
  ['TRQ-SISTER', { patientName: 'أختي الكريمة', patientId: 'p-sister', medication: 'دواء الحديد والحديديك', caregiverPhone: '+201000000000' }],
  ['TRQ-7788', { patientName: 'أحمد محمود', patientId: 'p-101', medication: 'كابوتين 25mg', caregiverPhone: '+201000000000' }]
]);

const registeredDevices = new Map();

/**
 * Google Account Authentication & Persistent DB Setup
 */
async function googleAuth(req, res) {
  const { email, displayName, photoUrl, googleId } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'بريد Google مطلوب لربط الحساب.' });
  }

  const patientId = `g-user-${googleId || Buffer.from(email).toString('hex').substring(0, 10)}`;
  let userProfile = await db.getUser(patientId);

  if (!userProfile) {
    userProfile = {
      patientId,
      patientName: displayName || email.split('@')[0],
      email,
      photoUrl: photoUrl || 'https://storage.teryaq.health/avatars/default.png',
      medication: 'كابوتين 25mg',
      caregiverPhone: '+966500000000',
      createdAt: new Date().toISOString()
    };
    await db.saveUser(userProfile);
  }

  return res.json({
    success: true,
    message: 'تم تسجيل الدخول ومزامنة حساب Google بنجاح.',
    token: `jwt-google-${patientId}-${Date.now()}`,
    user: userProfile
  });
}

/**
 * Validate Invite Code & Bind Device
 */
function validateInvite(req, res) {
  const { inviteCode, deviceUuid } = req.body;

  if (!inviteCode || !deviceUuid) {
    return res.status(400).json({ success: false, message: 'كود الدعوة ومعرف الجهاز مطلوبان.' });
  }

  const codeData = validInviteCodes.get(inviteCode.trim().toUpperCase());

  if (!codeData) {
    return res.status(401).json({ success: false, message: 'كود الدعوة غير صحيح أو منتهي الصلاحية.' });
  }

  if (registeredDevices.has(codeData.patientId)) {
    const boundDevice = registeredDevices.get(codeData.patientId);
    if (boundDevice !== deviceUuid) {
      return res.status(403).json({ success: false, message: 'هذا الحساب مرتبط بجهاز آخر بالفعل.' });
    }
  } else {
    registeredDevices.set(codeData.patientId, deviceUuid);
  }

  return res.json({
    success: true,
    message: 'تم تفعيل الحساب وربطه بالجهاز بنجاح.',
    token: `token-${codeData.patientId}-${Date.now()}`,
    user: codeData
  });
}

/**
 * Generate new invite code (Admin Only)
 */
function generateInviteCode(req, res) {
  const { patientName, medication, caregiverPhone } = req.body;
  const newCode = `TRQ-${Math.floor(1000 + Math.random() * 9000)}`;

  const patientId = `p-${Date.now()}`;
  validInviteCodes.set(newCode, { patientName, patientId, medication, caregiverPhone });

  return res.json({
    success: true,
    inviteCode: newCode,
    details: { patientName, medication, caregiverPhone }
  });
}

module.exports = {
  googleAuth,
  validateInvite,
  generateInviteCode
};
