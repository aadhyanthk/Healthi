import { setProfile } from '../services/storage.js';
import { ConditionRegistry } from '../config/conditions.js';
import { showToast } from '../utils/toast.js';

export async function render() {
  const conditionsHtml = Object.values(ConditionRegistry).map(cond => `
    <label style="display: flex; align-items: center; margin-bottom: 8px;">
      <input type="checkbox" name="condition" value="${cond.id}" style="width: 20px; height: 20px; margin-right: 12px;">
      <span style="font-size: 1.1rem;">${cond.name}</span>
    </label>
  `).join('');

  return `
    <div class="card" style="margin-top: 40px; animation: slideDown 0.4s ease-out;">
      <h2>Welcome to Healthi</h2>
      <p style="margin-top: 16px; color: var(--text-secondary);">
        Let's set up your profile. It only takes a few seconds.
      </p>
      
      <form id="onboarding-form" style="margin-top: 24px;">
        <label for="age" style="display: block; font-weight: 500; margin-bottom: 8px;">Your Age (Optional)</label>
        <input type="number" id="age" style="width: 100%; padding: 12px; border: 1px solid var(--border-color); border-radius: var(--radius-button); font-size: 1rem; margin-bottom: 24px;">
        
        <label style="display: block; font-weight: 500; margin-bottom: 12px;">Pre-existing Conditions</label>
        <div style="margin-bottom: 16px;">
          ${conditionsHtml}
        </div>
        
        <label for="other-conditions" style="display: block; font-weight: 500; margin-bottom: 8px;">Other Conditions (Comma separated)</label>
        <input type="text" id="other-conditions" placeholder="e.g., Asthma, Arthritis" style="width: 100%; padding: 12px; border: 1px solid var(--border-color); border-radius: var(--radius-button); font-size: 1rem; margin-bottom: 24px;">
        
        <button type="submit" class="btn-primary" style="width: 100%; font-size: 1.1rem; padding: 16px;">
          Continue
        </button>
      </form>
    </div>
  `;
}

export function init() {
  const form = document.getElementById('onboarding-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = 'Saving...';
    const age = document.getElementById('age').value;
    
    const selectedConditions = Array.from(document.querySelectorAll('input[name="condition"]:checked')).map(cb => cb.value);
    
    const otherConditions = document.getElementById('other-conditions').value.split(',')
      .map(c => c.trim())
      .filter(c => c);
      
    const conditions = [...new Set([...selectedConditions, ...otherConditions])];
    
    try {
      await setProfile({
        age: age ? parseInt(age) : null,
        conditions,
        createdAt: new Date().toISOString(),
        onboardingComplete: true
      });
      window.location.hash = '#/dashboard';
    } catch (error) {
      showToast(error.message);
      button.disabled = false;
      button.textContent = 'Continue';
    }
  });
}
