// Pharmacy Barcode & Medication Management Controller

// Pharmacy Barcode Registry Database (SFDA & Pharmacy API Mock)
const pharmacyBarcodeDB = new Map([
  [
    '6281001234567',
    {
      barcode: '6281001234567',
      name: 'كابوتين 25mg (Capoten)',
      genericName: 'Captopril',
      dosage: '25 ملجم - قرص واحد',
      imageUrl: 'https://storage.teryaq.health/meds/capoten25.jpg',
      category: 'ضغط الدم (Hypertension)'
    }
  ],
  [
    '6281007654321',
    {
      barcode: '6281007654321',
      name: 'بندول إكسترا 500mg (Panadol Extra)',
      genericName: 'Paracetamol / Caffeine',
      dosage: '500 ملجم - قرصان عند الحاجة',
      imageUrl: 'https://storage.teryaq.health/meds/panadol.jpg',
      category: 'مسكن آلام ومسكن حرارة'
    }
  ],
  [
    '6281009999999',
    {
      barcode: '6281009999999',
      name: 'جلوكوفاج 500mg (Glucophage)',
      genericName: 'Metformin HCl',
      dosage: '500 ملجم - قرص واحد بعد الأكل',
      imageUrl: 'https://storage.teryaq.health/meds/glucophage.jpg',
      category: 'مرض السكري (Diabetes Type 2)'
    }
  ]
]);

// Per-User Dynamic Medication Schedule Database (Keyed by Google ID / Patient ID)
const userMedicationsDB = new Map();

/**
 * Lookup medication details by Pharmacy Barcode
 */
function lookupBarcode(req, res) {
  const { code } = req.params;
  if (!code) {
    return res.status(400).json({ success: false, message: 'رمز الباركود مطلوب.' });
  }

  const cleanCode = code.trim();
  const medData = pharmacyBarcodeDB.get(cleanCode);

  if (!medData) {
    // Dynamic fallback for non-registered barcode for testing
    return res.json({
      success: true,
      found: false,
      barcode: cleanCode,
      message: 'لم يتم العثور على الدواء بالباركود الممسوح، يمكنك إدخاله يدوياً.',
      suggestedMedication: {
        barcode: cleanCode,
        name: `دواء مخصص (باركود: ${cleanCode})`,
        dosage: 'جرعة يومية واحدة',
        imageUrl: 'https://storage.teryaq.health/meds/custom.jpg'
      }
    });
  }

  return res.json({
    success: true,
    found: true,
    medication: medData
  });
}

/**
 * Get all active medications for a Google user
 */
function getUserMedications(req, res) {
  const { userId } = req.params;
  if (!userId) {
    return res.status(400).json({ success: false, message: 'معرف المستخدم مطلوب.' });
  }

  const medications = userMedicationsDB.get(userId) || [
    // Default initial prescribed medicine if none added yet
    {
      id: 'med-default-1',
      barcode: '6281001234567',
      name: 'كابوتين 25mg (Capoten)',
      dosage: 'جرعة واحدة 08:00 صباحاً',
      time: '08:00 AM',
      category: 'دواء الضغط'
    }
  ];

  return res.json({
    success: true,
    userId,
    medications
  });
}

/**
 * Add a new medication via barcode scan to user schedule
 */
function addMedication(req, res) {
  const { userId, barcode, name, dosage, time } = req.body;

  if (!userId || !name) {
    return res.status(400).json({ success: false, message: 'بيانات الدواء غير مكتملة.' });
  }

  const userMeds = userMedicationsDB.get(userId) || [];
  const newMed = {
    id: `med-${Date.now()}`,
    barcode: barcode || 'N/A',
    name,
    dosage: dosage || 'جرعة يومية واحدة',
    time: time || '08:00 AM',
    addedAt: new Date().toISOString()
  };

  userMeds.push(newMed);
  userMedicationsDB.set(userId, userMeds);

  return res.json({
    success: true,
    message: `تمت إضافة دواء (${name}) بنجاح لقائمة أدوية الحساب.`,
    medication: newMed,
    totalMedications: userMeds.length
  });
}

module.exports = {
  lookupBarcode,
  getUserMedications,
  addMedication
};
