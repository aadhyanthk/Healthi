import { getLogs, saveInsight } from '../services/storage.js';
import { getPredictiveInsights } from '../services/gemini.js';

export async function render() {
  return `
    <div style="margin-top: 20px;">
      <h1>Smart Insights</h1>
      <p style="color: var(--text-secondary); margin-bottom: 24px;">AI pattern recognition based on your logs.</p>
      
      <div id="insights-container" class="card" style="min-height: 150px; display: flex; align-items: center; justify-content: center;">
        <p style="color: var(--text-secondary);">Analyzing your recent logs...</p>
      </div>
    </div>
    
    ${getBottomNav()}
  `;
}

function getBottomNav() {
  return `
    <nav class="bottom-nav">
      <a href="#/dashboard" class="nav-item">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
        Home
      </a>
      <a href="#/log" class="nav-item">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
        Log
      </a>
      <a href="#/insights" class="nav-item active">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 16 16 12 12 8"></polyline><line x1="8" y1="12" x2="16" y2="12"></line></svg>
        Insights
      </a>
      <a href="#/export" class="nav-item">
        <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
        Export
      </a>
    </nav>
  `;
}

export async function init() {
  const container = document.getElementById('insights-container');
  
  try {
    const logs = await getLogs();
    // Only take the last 14 days for analysis to keep context window small
    logs.sort((a, b) => new Date(b.date) - new Date(a.date));
    const recentLogs = logs.slice(0, 14);
    
    const insightText = await getPredictiveInsights(recentLogs);
    try {
      await saveInsight(insightText);
    } catch (error) {
      console.warn('Insight could not be saved, but it will still be shown:', error);
    }
    
    container.innerHTML = `
      <div>
        <h3 style="margin-bottom: 12px; color: var(--blue-800);">Our Observations</h3>
        <p style="font-size: 1.1rem; line-height: 1.6;">${insightText}</p>
        <p style="margin-top: 16px; font-size: 0.85rem; color: var(--text-secondary);">
          Note: This is pattern recognition, not medical advice.
        </p>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `
      <p style="color: var(--amber-700);">Could not load insights at this time.</p>
    `;
  }
}
