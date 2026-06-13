import { addMetricLog, getAppointments, getLogs, getMetricLogs, getProfile, getVisits, updateAppointment } from '../services/storage.js';
import { getConditionConfig } from '../config/conditions.js';
import { showToast } from '../utils/toast.js';

const icon = (name) => {
  const icons = {
    home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/><path d="M9.5 20v-6h5v6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    spark: '<path d="m12 3 1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7L12 3Z"/><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z"/>',
    file: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v5h5M10 13h5M10 17h5"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1-2.9 2.9-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5v.1h-4v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1-2.9-2.9.1-.1a1.7 1.7 0 0 0 .3-1.8A1.7 1.7 0 0 0 3.1 14H3v-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1 2.9-2.9.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.5V3h4v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1 2.9 2.9-.1.1a1.7 1.7 0 0 0-.3 1.8 1.7 1.7 0 0 0 1.5 1h.1v4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>'
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name]}</svg>`;
};

function nav() {
  return `<nav class="app-nav" aria-label="Primary navigation">
    <a class="nav-link active" href="#/dashboard">${icon('home')}<span>Home</span></a>
    <a class="nav-link" href="#/log">${icon('plus')}<span>Log</span></a>
    <a class="nav-link" href="#/insights">${icon('spark')}<span>Insights</span></a>
    <a class="nav-link" href="#/export">${icon('file')}<span>Report</span></a>
  </nav>`;
}



function renderDoctorCare(visits, appointments, doctorName, doctorInitials) {
  const sortedVisits = [...visits].sort((a, b) => new Date(b.date) - new Date(a.date));
  const sortedAppointments = [...appointments].sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));

  return `
    <section class="section-block">
      <div class="section-heading"><div><p class="eyebrow">Shared by your doctor</p><h2>Care updates</h2></div></div>
      <div class="clinical-grid">
        <article class="doctor-note card">
          <p class="eyebrow">From your doctor</p>
          ${sortedVisits[0] ? `
            <h3>${sortedVisits[0].recommendations || sortedVisits[0].diagnosis || 'Follow-up review'}</h3>
            <p>${sortedVisits[0].doctorNotes || sortedVisits[0].diagnosis || ''}</p>
            <div class="doctor-signoff"><span>${doctorInitials}</span><div><strong>${doctorName}</strong><small>Healthcare Provider</small></div></div>
          ` : '<p class="muted">No doctor recommendations yet.</p>'}
        </article>
        <article class="doctor-note card">
          <p class="eyebrow">Appointments</p>
          ${sortedAppointments.length ? sortedAppointments.map((appointment) => `
            <div style="margin-top:12px">
              <h3>${appointment.doctorName || 'Your doctor'}</h3>
              <p>${new Date(appointment.scheduledDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })} · ${appointment.reason || 'Clinical follow-up'} · ${appointment.status || 'scheduled'}</p>
            </div>
          `).join('') : '<p class="muted">No appointments shared yet.</p>'}
        </article>
      </div>
    </section>`;
}

export async function render() {
  const [profile, logs, metrics, appointments, visits] = await Promise.all([
    getProfile(), getLogs(), getMetricLogs(), getAppointments(), getVisits()
  ]);
  const nextAppointment = appointments
    .filter((item) => ['scheduled', 'rescheduled'].includes(item.status))
    .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate))[0];
  const latestVisit = visits.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  const recentLogs = logs.sort((a, b) => new Date(b.date) - new Date(a.date));
  const latestBp = metrics.filter((item) => item.condition === 'hypertension').at(-1);
  const latestSugar = metrics.filter((item) => item.condition === 'diabetes').at(-1);
  const latestTemp = metrics.filter((item) => item.condition === 'temperature').at(-1);
  const latestOxygen = metrics.filter((item) => item.condition === 'oxygen_level').at(-1);
  const latestWeight = metrics.filter((item) => item.condition === 'body_weight').at(-1);
  const firstName = profile?.name?.split(' ')[0] || 'there';
  const doctorName = appointments.find(a => a.doctorName)?.doctorName || 'Your doctor';
  const doctorInitials = doctorName.split(' ').filter(w => w !== 'Dr.').map(word => word[0]).join('').slice(0, 2).toUpperCase() || 'MD';

  return `
    <div class="app-layout">
      <aside class="sidebar">
        <a class="brand" href="#/dashboard"><span class="brand-mark">H</span><span>Healthi</span></a>
        ${nav()}
        <div class="sidebar-help"><span>?</span><div><strong>Need help?</strong><small>Call a trusted contact</small></div></div>
      </aside>
      <main class="main-content">
        <header class="topbar">
          <div>
            <p class="eyebrow">${new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            <h1>Good ${new Date().getHours() < 12 ? 'morning' : 'afternoon'}, ${firstName}.</h1>
            <p class="muted">Here is your health at a glance.</p>
          </div>
          <a class="icon-button" href="#/settings" aria-label="Open settings">${icon('settings')}</a>
        </header>

        <section class="hero-grid">
          <article class="insight-card">
            <div class="insight-icon">${icon('spark')}</div>
            <p class="eyebrow light">Healthi insight</p>
            <h2>Poor sleep may be linked to your headaches.</h2>
            <p>You mentioned a headache on two days after sleeping less than six hours. Try winding down 30 minutes earlier tonight.</p>
            <a href="#/insights">See all insights →</a>
          </article>
          <a class="quick-log-card" href="#/log">
            <span class="quick-log-icon">${icon('plus')}</span>
            <div><strong>How are you feeling?</strong><small>Record symptoms, sleep, medicines, or anything else.</small></div>
            <span aria-hidden="true">→</span>
          </a>
        </section>

        <section class="section-block">
          <div class="section-heading"><div><p class="eyebrow">Today</p><h2>Your care plan</h2></div></div>
          <div class="care-grid">
            <article class="metric-card">
              <div class="metric-label"><span class="metric-dot coral"></span>Blood pressure</div>
              <strong>${latestBp ? `${latestBp.metrics.systolic}/${latestBp.metrics.diastolic}` : '--/--'}</strong>
              <span>mmHg</span><small class="trend positive">↓ Improving</small>
            </article>
            <article class="metric-card">
              <div class="metric-label"><span class="metric-dot gold"></span>Blood sugar</div>
              <strong>${latestSugar?.metrics.blood_sugar || '--'}</strong>
              <span>mg/dL</span><small class="trend">In your usual range</small>
            </article>
            <article class="metric-card">
              <div class="metric-label"><span class="metric-dot" style="background-color: #10b981"></span>Body Weight</div>
              <strong>${latestWeight?.metrics.weight || '--'}</strong>
              <span>lbs</span><small class="trend">Steady</small>
            </article>
            <article class="metric-card">
              <div class="metric-label"><span class="metric-dot" style="background-color: #8b5cf6"></span>Oxygen Level</div>
              <strong>${latestOxygen?.metrics.spo2 || '--'}</strong>
              <span>%</span><small class="trend">Normal range</small>
            </article>
            <article class="metric-card">
              <div class="metric-label"><span class="metric-dot" style="background-color: #ef4444"></span>Temperature</div>
              <strong>${latestTemp?.metrics.temperature || '--'}</strong>
              <span>°F</span><small class="trend">Normal range</small>
            </article>
            <article class="appointment-card">
              ${nextAppointment ? `
                <div class="appointment-date"><strong>${new Date(nextAppointment.scheduledDate).getDate()}</strong><span>${new Date(nextAppointment.scheduledDate).toLocaleDateString(undefined, { month: 'short' })}</span></div>
                <div><p class="eyebrow">Next appointment</p><h3>${nextAppointment.doctorName}</h3><p>${new Date(nextAppointment.scheduledDate).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} · ${nextAppointment.reason}</p></div>
                <button class="text-button" id="reschedule-btn" data-id="${nextAppointment.id}">Reschedule</button>
              ` : '<p class="muted">No upcoming appointments.</p>'}
            </article>
          </div>

        </section>

        ${renderDoctorCare(visits, appointments, doctorName, doctorInitials)}

        <section class="content-grid">
          <div>
            <div class="section-heading"><div><p class="eyebrow">Health ledger</p><h2>Your recent story</h2></div><a href="#/export">View report</a></div>
            <div class="timeline">
          ${recentLogs.map((log) => `
                <article class="timeline-item">
                  <div class="timeline-date"><strong>${new Date(log.date).getDate()}</strong><span>${new Date(log.date).toLocaleDateString(undefined, { month: 'short' })}</span></div>
                  <div class="timeline-body">
                    <div class="timeline-meta"><span class="severity ${log.parsed_data?.severity || 'medium'}">${log.parsed_data?.severity || 'medium'}</span><time>${new Date(log.date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</time></div>
                    <h3>${log.parsed_data?.summary || log.raw_text.substring(0, 100)}</h3>
                    <p>${log.raw_text}</p>
                    <div class="tag-row">${(log.parsed_data?.symptoms || []).map((item) => `<span>${item}</span>`).join('')}${log.parsed_data?.sleep ? `<span>Sleep: ${log.parsed_data.sleep}</span>` : ''}</div>
                  </div>
                </article>`).join('')}
            </div>
          </div>

        </section>
      </main>
      ${nav()}
    </div>`;
}

export function init() {


  document.getElementById('reschedule-btn')?.addEventListener('click', async (event) => {
    const button = event.currentTarget;
    if (!button) {
      console.error('Reschedule button not found');
      return;
    }
    button.disabled = true;
    button.textContent = 'Rescheduling...';
    try {
      const date = new Date();
      date.setDate(date.getDate() + 7);
      date.setHours(10, 0, 0, 0);
      await updateAppointment(button.dataset.id, { scheduledDate: date.toISOString(), status: 'scheduled' });
      showToast('Appointment moved to next week.');
      window.dispatchEvent(new Event('hashchange'));
    } catch (error) {
      showToast(error.message);
      button.disabled = false;
      button.textContent = 'Reschedule';
    }
  });
}
