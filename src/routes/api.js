const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const alarmController = require('../controllers/alarmController');
const medicationController = require('../controllers/medicationController');

// Auth Routes (Invite Code & Google Auth)
router.post('/auth/google', authController.googleAuth);
router.post('/auth/verify-invite', authController.validateInvite);
router.post('/admin/generate-invite', authController.generateInviteCode);

// Dynamic Medication & Barcode Scanning Routes
router.get('/medication/barcode/:code', medicationController.lookupBarcode);
router.get('/medication/user/:userId', medicationController.getUserMedications);
router.post('/medication/add', medicationController.addMedication);

// Alarm & Verification Routes
router.post('/alarm/trigger', alarmController.handleAlarmTriggered);
router.post('/alarm/verify-dose', alarmController.handleVerifyDose);
router.get('/alarm/status/:doseId', alarmController.getLogStatus);
router.get('/admin/logs', alarmController.getAllLogs);

// Vercel Cron Job Endpoint
router.get('/cron/escalate', alarmController.handleCronEscalations);

module.exports = router;
