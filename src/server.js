try {
  require('dotenv').config();
} catch (e) {
  // Ignore if dotenv is not present in serverless environment
}
const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health Check
app.get('/', (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'Teryaq Express Backend API Gateway & Escalation Engine',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api', apiRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint not found' });
});

// Start Server if executed directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 Teryaq Express Backend running on http://localhost:${PORT}`);
    console.log(`=======================================================`);
  });
}

module.exports = app;
