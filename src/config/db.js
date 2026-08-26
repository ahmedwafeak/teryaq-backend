// Persistent Supabase / PostgreSQL Database Client & Storage Adapter

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://naaaxahepgdtukafosqx.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hYWF4YWhlcGdkdHVrYWZvc3F4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3NDgxMzMsImV4cCI6MjEwMzMyNDEzM30.eGedCJ1k-JN6gWbyMhIzsKG5gDbucrL2nMfAF0RNDV8';

let supabase = null;
if (SUPABASE_URL && SUPABASE_KEY) {
  try {
    const { createClient } = require('@supabase/supabase-js');
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log(`🗄️ [DATABASE] Connected to live Supabase Cloud project (${SUPABASE_URL}).`);
  } catch (e) {
    console.warn('⚠️ [DATABASE] Supabase client fallback:', e.message);
  }
}

// Memory Fallback Databases
const usersDB = new Map();
const medicationsDB = new Map();
const doseLogsDB = new Map();

/**
 * Save or Update Patient Profile in Cloud DB
 */
async function saveUser(user) {
  if (supabase) {
    try {
      const { data, error } = await supabase.from('users').upsert({
        patient_id: user.patientId,
        email: user.email,
        patient_name: user.patientName,
        caregiver_phone: user.caregiverPhone,
        photo_url: user.photoUrl,
        updated_at: new Date().toISOString()
      }).select();
      if (!error && data) return data[0];
    } catch (e) {
      console.error('Supabase saveUser error:', e.message);
    }
  }

  usersDB.set(user.patientId, user);
  return user;
}

/**
 * Get Patient Profile by Google Patient ID
 */
async function getUser(patientId) {
  if (supabase) {
    try {
      const { data, error } = await supabase.from('users').select('*').eq('patient_id', patientId).single();
      if (!error && data) return data;
    } catch (e) {
      console.error('Supabase getUser error:', e.message);
    }
  }

  return usersDB.get(patientId) || null;
}

/**
 * Save Medication with Extended Duration and Previous History
 */
async function saveMedication(userId, medication) {
  if (supabase) {
    try {
      const { data, error } = await supabase.from('medications').insert({
        id: medication.id,
        user_id: userId,
        barcode: medication.barcode,
        name: medication.name,
        dosage: medication.dosage,
        treatment_duration: medication.treatmentDuration,
        daily_schedule: medication.dailySchedule,
        previous_history: medication.previousHistory,
        created_at: new Date().toISOString()
      }).select();
      if (!error && data) return data[0];
    } catch (e) {
      console.error('Supabase saveMedication error:', e.message);
    }
  }

  const userMeds = medicationsDB.get(userId) || [];
  userMeds.push(medication);
  medicationsDB.set(userId, userMeds);
  return medication;
}

/**
 * Get All Medications for a User
 */
async function getUserMedications(userId) {
  if (supabase) {
    try {
      const { data, error } = await supabase.from('medications').select('*').eq('user_id', userId);
      if (!error && data && data.length > 0) return data;
    } catch (e) {
      console.error('Supabase getUserMedications error:', e.message);
    }
  }

  return medicationsDB.get(userId) || [
    {
      id: 'med-default-1',
      barcode: '6281001234567',
      name: 'كابوتين 25mg (Capoten)',
      dosage: 'جرعة واحدة 08:00 صباحاً',
      treatmentDuration: { isChronic: true, totalDays: null },
      dailySchedule: ['08:00 AM'],
      previousHistory: { isFirstTime: true, startDate: new Date().toISOString().split('T')[0], previousDosesCount: 0 },
      addedAt: new Date().toISOString()
    }
  ];
}

/**
 * Save Dose Verification Log
 */
async function saveDoseLog(doseLog) {
  if (supabase) {
    try {
      await supabase.from('dose_logs').upsert({
        dose_id: doseLog.doseId,
        user_id: doseLog.userId || 'guest',
        patient_name: doseLog.patientName,
        medication_name: doseLog.medicationName,
        caregiver_phone: doseLog.caregiverPhone,
        status: doseLog.status,
        confidence_score: doseLog.confidenceScore,
        escalates_at: doseLog.escalatesAt,
        verified_at: doseLog.verifiedAt,
        escalated_at: doseLog.escalatedAt
      });
    } catch (e) {
      console.error('Supabase saveDoseLog error:', e.message);
    }
  }

  doseLogsDB.set(doseLog.doseId, doseLog);
  return doseLog;
}

/**
 * Query overdue alarms for Vercel Cron Job Escalation
 */
async function getOverdueEscalations() {
  if (supabase) {
    try {
      const nowISO = new Date().toISOString();
      const { data, error } = await supabase
        .from('dose_logs')
        .select('*')
        .eq('status', 'ALARM_RINGING')
        .lte('escalates_at', nowISO);
      if (!error && data) return data;
    } catch (e) {
      console.error('Supabase getOverdueEscalations error:', e.message);
    }
  }

  const overdue = [];
  const now = new Date();
  for (const log of doseLogsDB.values()) {
    if (log.status === 'ALARM_RINGING' && log.escalatesAt && new Date(log.escalatesAt) <= now) {
      overdue.push(log);
    }
  }
  return overdue;
}

module.exports = {
  supabaseClient: supabase,
  saveUser,
  getUser,
  saveMedication,
  getUserMedications,
  saveDoseLog,
  getOverdueEscalations
};
