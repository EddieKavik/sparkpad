// Orchestrator Cron Script
// Run with: node orchestrator-cron.js
// Requires: npm install node-cron node-fetch@2

const cron = require('node-cron');
const fetch = require('node-fetch');

const ORCHESTRATOR_URL = 'http://localhost:3000/api/orchestrator/auto'; // Change port if needed

async function runOrchestrator() {
  try {
    const res = await fetch(ORCHESTRATOR_URL, { method: 'POST' });
    const data = await res.json();
    console.log(`[${new Date().toLocaleString()}] Orchestrator run:`, data.status, data.timestamp);
    if (data.results) {
      const summary = data.results.map(r => `${r.action.action}: ${r.status}`).join(', ');
      console.log('  Actions:', summary);
    }
  } catch (err) {
    console.error(`[${new Date().toLocaleString()}] Orchestrator error:`, err.message);
  }
}

// Run every 5 minutes
cron.schedule('*/5 * * * *', () => {
  console.log(`[${new Date().toLocaleString()}] Running orchestrator...`);
  runOrchestrator();
});

// Run once on startup
runOrchestrator(); 