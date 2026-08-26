const http = require('http');
const app = require('../src/server');

const PORT = process.env.PORT || 3000;
const BASE_URL = `http://localhost:${PORT}/api`;

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTestFlow() {
  console.log('🧪 [TEST SUITE] Starting Teryaq Extended Medication & History Verification...\n');
  const server = app.listen(PORT);

  try {
    // 1. Google Account Authentication
    console.log('1️⃣ Testing Google Account Sign-In...');
    const googleRes = await makeRequest('POST', '/auth/google', {
      email: 'patient.test@gmail.com',
      displayName: 'الشيخ أحمد',
      googleId: '10987654321'
    });
    console.log('Google Auth Response:', googleRes.body);
    if (!googleRes.body.success) throw new Error('Google Auth failed');
    const userId = googleRes.body.user.patientId;

    // 2. Pharmacy Barcode Lookup & Extended Medication Addition
    console.log('\n2️⃣ Testing Pharmacy Barcode Lookup (6281001234567)...');
    const barcodeRes = await makeRequest('GET', '/medication/barcode/6281001234567');
    console.log('Barcode Lookup Result:', barcodeRes.body);
    if (!barcodeRes.body.found) throw new Error('Barcode lookup failed');

    console.log('\n3️⃣ Adding Medication with Duration & Previous History...');
    const addMedRes = await makeRequest('POST', '/medication/add', {
      userId,
      barcode: barcodeRes.body.medication.barcode,
      name: barcodeRes.body.medication.name,
      dosage: barcodeRes.body.medication.dosage,
      time: '08:00 AM',
      treatmentDuration: { isChronic: false, totalDays: 14 },
      dailySchedule: ['08:00 AM', '08:00 PM'],
      previousHistory: {
        isFirstTime: false,
        startDate: '2026-08-01',
        previousDosesCount: 20
      }
    });
    console.log('Add Extended Medication Response:', addMedRes.body);

    console.log('\n4️⃣ Fetching Patient Medications Schedule...');
    const userMedsRes = await makeRequest('GET', `/medication/user/${userId}`);
    console.log('User Medications List:', JSON.stringify(userMedsRes.body, null, 2));

    // 3. Trigger Alarm & Verification Flow (Success scenario)
    console.log('\n5️⃣ Testing Alarm Trigger & AI Photo Verification...');
    const doseId1 = `dose-test-${Date.now()}`;
    const triggerRes = await makeRequest('POST', '/alarm/trigger', {
      doseId: doseId1,
      patientName: googleRes.body.user.patientName,
      medicationName: barcodeRes.body.medication.name,
      caregiverPhone: '+966500000000',
      timeoutMs: 5000
    });
    console.log('Alarm Triggered Response:', triggerRes.body);

    console.log('Submitting AI Photo Verification...');
    const verifyRes = await makeRequest('POST', '/alarm/verify-dose', {
      doseId: doseId1,
      confidenceScore: 0.96,
      detectedText: 'CAPOTEN 25MG'
    });
    console.log('AI Verification Response:', verifyRes.body);

    // 4. Testing 10-Minute Timeout Escalation Scenario
    console.log('\n6️⃣ Testing Emergency Escalation Timeout Scenario (Fast 3s timeout)...');
    const doseId2 = `dose-timeout-${Date.now()}`;
    await makeRequest('POST', '/alarm/trigger', {
      doseId: doseId2,
      patientName: googleRes.body.user.patientName,
      medicationName: barcodeRes.body.medication.name,
      caregiverPhone: '+966500000000',
      timeoutMs: 3000
    });

    console.log('Waiting 4 seconds for timeout escalation trigger...');
    await new Promise(r => setTimeout(r, 4000));

    const statusRes = await makeRequest('GET', `/alarm/status/${doseId2}`);
    console.log('Status after timeout:', statusRes.body);

    if (statusRes.body.log && statusRes.body.log.status === 'ESCALATED') {
      console.log('\n✅ ALL EXTENDED INTEGRATION TESTS PASSED SUCCESSFULLY!');
    } else {
      console.error('\n❌ Escalation timeout test failed!');
      process.exitCode = 1;
    }

  } catch (err) {
    console.error('❌ Test failed with error:', err.message);
    process.exitCode = 1;
  } finally {
    server.close();
  }
}

runTestFlow();
