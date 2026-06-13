import { clearAllData, getProfile, setProfile } from '../services/storage.js';
import { ConditionRegistry, getConditionConfig } from '../config/conditions.js';
import { showToast } from '../utils/toast.js';

export async function render() {
  const profile = await getProfile();
  
  const registryHtml = Object.values(ConditionRegistry).map(cond => {
    const isChecked = profile?.conditions?.includes(cond.id) ? 'checked' : '';
    return `
      <label style="display: flex; align-items: center; margin-bottom: 8px;">
        <input type="checkbox" name="setting-condition" value="${cond.id}" ${isChecked} style="width: 20px; height: 20px; margin-right: 12px;">
        <span style="font-size: 1.1rem;">${cond.name}</span>
      </label>
    `;
  }).join('');

  const otherConds = profile?.conditions?.filter(c => !getConditionConfig(c)) || [];

  const patientCodeHtml = profile?.role === 'patient' ? `
    <div class="card" style="margin-bottom: 16px;">
      <h3 style="margin-bottom: 12px;">Your Patient Code</h3>
      <p style="color: var(--text-secondary); margin-bottom: 16px;">Share this code with your doctor so they can view your health data.</p>
      <div style="background: var(--slate-200); padding: 16px; border-radius: var(--radius-button); text-align: center; font-size: 1.5rem; font-weight: 700; letter-spacing: 4px; color: var(--slate-900);">
        ${profile.patientCode || 'N/A'}
      </div>
    </div>
  ` : '';

  return `
    <div style="margin-top: 20px;">
      <h1>Settings</h1>
      <p style="color: var(--text-secondary); margin-bottom: 24px;">Manage your preferences and data.</p>
      
      ${patientCodeHtml}
      
      <div class="card" style="margin-bottom: 16px;">
        <h3 style="margin-bottom: 16px;">Manage Conditions</h3>
        <form id="conditions-form">
          <div style="margin-bottom: 16px;">
            ${registryHtml}
          </div>
          <label for="other-setting" style="display: block; font-weight: 500; margin-bottom: 8px;">Other Conditions</label>
          <input type="text" id="other-setting" value="${otherConds.join(', ')}" placeholder="e.g., Asthma" style="width: 100%; padding: 12px; border: 1px solid var(--border-color); border-radius: var(--radius-button); font-size: 1rem; margin-bottom: 16px;">
          <button type="submit" class="btn-primary" style="width: 100%;">Save Conditions</button>
        </form>
      </div>

      <div class="card" style="margin-bottom: 16px;">
        <h3 style="margin-bottom: 12px;">Account Access</h3>
        <p style="color: var(--text-secondary); margin-bottom: 16px;">Sign out of your account on this device.</p>
        <button id="logout-btn" class="btn-primary" style="background-color: var(--slate-700); width: 100%;">
          Log Out
        </button>
      </div>

      <div class="card">
        <h3 style="margin-bottom: 12px; color: var(--amber-700);">Danger Zone</h3>
        <p style="color: var(--text-secondary); margin-bottom: 16px;">This will permanently delete your profile, health logs, and account. This cannot be undone.</p>
        <button id="delete-btn" class="btn-primary" style="background-color: var(--amber-700); width: 100%;">
          Delete Account & Data
        </button>
      </div>
      
      <a href="#/dashboard" style="display: block; text-align: center; margin-top: 24px; color: var(--blue-600); text-decoration: none; font-weight: 600;">
        &larr; Back to Dashboard
      </a>
    </div>
  `;
}

export function init() {
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      logoutBtn.disabled = true;
      logoutBtn.textContent = 'Logging out...';
      try {
        await clearAllData();
        window.location.hash = '#/auth';
      } catch (error) {
        showToast(error.message);
        logoutBtn.disabled = false;
        logoutBtn.textContent = 'Log Out';
      }
    });
  }

  const deleteBtn = document.getElementById('delete-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      const confirmDelete = confirm("Are you sure you want to PERMANENTLY delete your account and all data? This cannot be undone.");
      if (confirmDelete) {
        deleteBtn.disabled = true;
        deleteBtn.textContent = 'Deleting...';
        try {
          await import('../services/storage.js').then(m => m.deleteAccount());
          window.location.hash = '#/auth';
        } catch (err) {
          console.error(err);
          // If it's a recent login requirement error:
          if (err.code === 'auth/requires-recent-login') {
             alert('For security reasons, you must log out and log back in before deleting your account.');
          } else {
             alert('Failed to delete account: ' + err.message);
          }
          deleteBtn.disabled = false;
          deleteBtn.textContent = 'Delete Account & Data';
        }
      }
    });
  }

  const form = document.getElementById('conditions-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const button = form.querySelector('button[type="submit"]');
      if (!button) {
        console.error('Submit button not found');
        return;
      }
      button.disabled = true;
      button.textContent = 'Saving...';
      try {
        const profile = await getProfile();
        if (!profile) {
          showToast('Profile not found. Please try again.');
          return;
        }
        const selected = Array.from(document.querySelectorAll('input[name="setting-condition"]:checked')).map(cb => cb.value);
        const otherInput = document.getElementById('other-setting');
        const other = otherInput ? otherInput.value.split(',').map(c => c.trim()).filter(c => c) : [];
        const newConditions = [...new Set([...selected, ...other])];

        await setProfile({ ...profile, conditions: newConditions });
        showToast('Conditions updated!');
      } catch (error) {
        showToast(error.message);
      } finally {
        button.disabled = false;
        button.textContent = 'Save Conditions';
      }
    });
  }
}
