import {
  addAppointment,
  addVisit,
  clearAllData,
  getAppointments,
  getDoctorPatients,
  getPatientLogs,
  getPatientMetricLogs,
  getPatientProfile,
  getProfile,
  getVisits,
  linkPatientToDoctor,
  addMetricLog
} from '../services/storage.js';
import { getConditionConfig } from '../config/conditions.js';
import { showToast } from '../utils/toast.js';

let selectedPatientId = 'demo-patient';

export async function render() {
  const [patients, doctor] = await Promise.all([getDoctorPatients(), getProfile()]);
  const patient = patients[0];
  selectedPatientId = patient?.id || 'demo-patient';

  return `
    <main class="doctor-shell">
      <header class="doctor-header">
        <a class="brand" href="#/doctor-dashboard"><span class="brand-mark">H</span><span>Healthi Clinical</span></a>
        <div class="doctor-header-actions">
          <div><strong>${doctor?.name || 'Doctor'}</strong><div class="muted">${doctor?.specialty || 'Healthcare professional'}</div></div>
          <button id="logout-btn" class="btn btn-secondary">Sign out</button>
        </div>
      </header>

      <div class="topbar">
        <div><p class="eyebrow">Clinical workspace</p><h1>Good morning, Doctor.</h1><p class="muted">Review changes, update care plans, and keep patients moving forward.</p></div>
      </div>

      <section class="doctor-overview">
        <article class="overview-card"><span>Active patients</span><strong>${patients.length}</strong></article>
        <article class="overview-card"><span>Appointments this week</span><strong>3</strong></article>
        <article class="overview-card"><span>New health entries</span><strong>2</strong></article>
      </section>

      <section class="doctor-grid">
        <aside class="patient-panel">
          <p class="eyebrow">My patients</p><h2>Patient list</h2>
          <div class="patient-search">
            <input id="patient-code" maxlength="6" aria-label="Patient access code" placeholder="6-digit code">
            <button id="link-patient-btn" class="btn btn-primary">Add</button>
          </div>
          <div class="patient-list">
            ${patients.map((item, index) => `
              <button class="patient-item ${index === 0 ? 'active' : ''}" data-id="${item.id}">
                <strong>${item.name || `Patient ${item.patientCode}`}</strong>
                <small>${item.age || '--'} years · ${(item.conditions || []).join(', ')}</small>
              </button>`).join('') || '<p class="muted">Use a patient code to get started.</p>'}
          </div>
        </aside>
        <section class="patient-detail" id="patient-detail">
          ${patient ? await renderPatient(patient.id) : '<div class="centered-state"><p class="muted">Select a patient to view their ledger.</p></div>'}
        </section>
      </section>
    </main>`;
}

async function renderPatient(patientId) {
  const [profile, logs, metrics, visits, appointments] = await Promise.all([
    getPatientProfile(patientId),
    getPatientLogs(patientId),
    getPatientMetricLogs(patientId),
    getVisits(patientId),
    getAppointments(patientId)
  ]);
  const latestBp = metrics.filter((item) => item.condition === 'hypertension').at(-1);
  const latestSugar = metrics.filter((item) => item.condition === 'diabetes').at(-1);
  const latestTemp = metrics.filter((item) => item.condition === 'temperature').at(-1);
  const latestOxygen = metrics.filter((item) => item.condition === 'oxygen_level').at(-1);
  const latestWeight = metrics.filter((item) => item.condition === 'body_weight').at(-1);
  const sortedAppointments = [...appointments].sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));
  const nextAppointment = sortedAppointments.filter(a => new Date(a.scheduledDate) >= new Date())[0] || sortedAppointments.at(-1);

  if (!profile) {
    return `
      <div class="centered-state">
        <div class="card">
          <p class="eyebrow">Patient unavailable</p>
          <h2>We could not load this patient profile.</h2>
          <p class="muted">Try adding the patient again with their current access code.</p>
        </div>
      </div>`;
  }

  return `
    <div class="patient-detail-header">
      <div class="patient-identity"><span class="patient-avatar">${profile.name?.split(' ').map((word) => word[0]).join('') || 'P'}</span><div><p class="eyebrow">Patient ${profile.patientCode}</p><h2>${profile.name || 'Patient profile'}</h2><p class="muted">${profile.age} years · ${(profile.conditions || []).join(', ')}</p></div></div>
      <span class="status-pill" style="background:var(--sage);color:var(--green)"><i></i> Active care</span>
    </div>

    <div class="patient-tabs" role="tablist" aria-label="Patient detail sections">
      <button class="active" type="button" role="tab" aria-selected="true" data-tab="overview">Overview</button>
      <button type="button" role="tab" aria-selected="false" data-tab="timeline">Timeline</button>
      <button type="button" role="tab" aria-selected="false" data-tab="care-plan">Care plan</button>
    </div>

    <section data-tab-panel="overview">
      <div class="clinical-grid">
        <article class="clinical-card"><p class="eyebrow">Blood pressure</p><h3>${latestBp ? `${latestBp.metrics.systolic}/${latestBp.metrics.diastolic} mmHg` : 'No reading'}</h3><p>Latest recorded reading</p></article>
        <article class="clinical-card"><p class="eyebrow">Blood sugar</p><h3>${latestSugar ? `${latestSugar.metrics.blood_sugar} mg/dL` : 'No reading'}</h3><p>Latest recorded reading</p></article>
        <article class="clinical-card"><p class="eyebrow">Temperature</p><h3>${latestTemp ? `${latestTemp.metrics.temperature} °F` : 'No reading'}</h3><p>Latest recorded reading</p></article>
        <article class="clinical-card"><p class="eyebrow">Oxygen Level</p><h3>${latestOxygen ? `${latestOxygen.metrics.spo2} %` : 'No reading'}</h3><p>Latest recorded reading</p></article>
        <article class="clinical-card"><p class="eyebrow">Body Weight</p><h3>${latestWeight ? `${latestWeight.metrics.weight} lbs` : 'No reading'}</h3><p>Latest recorded reading</p></article>
        <article class="clinical-card"><p class="eyebrow">Next appointment</p><h3>${nextAppointment ? new Date(nextAppointment.scheduledDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Not scheduled'}</h3><p>${nextAppointment?.reason || 'Create a follow-up below'}</p></article>
        <article class="clinical-card" style="grid-column: 1 / -1;"><p class="eyebrow">Recent symptom</p><h3>${logs[0]?.parsed_data.summary || 'No recent symptoms'}</h3><p>${logs[0] ? new Date(logs[0].date).toLocaleDateString() : ''}</p></article>
      </div>
      <div class="action-form">
        <p class="eyebrow">Appointments</p>
        ${renderAppointmentList(appointments)}
      </div>
    </section>

    <section data-tab-panel="timeline" hidden>
      <div class="action-form">
        <p class="eyebrow">Health timeline</p>
        ${renderTimeline(logs, visits)}
      </div>
    </section>

    <section data-tab-panel="care-plan" hidden>
      <form id="clinical-form">
        <div class="action-form">
          <div class="section-heading"><div><p class="eyebrow">Readings</p><h2>Add a reading</h2></div></div>
          <div class="form-grid">
            ${renderReadingForms(profile)}
          </div>
        </div>

        <div class="action-form">
          <div class="section-heading"><div><p class="eyebrow">Clinical action</p><h2>Update care plan</h2></div></div>
          <div class="form-grid">
            <div class="field"><label for="diagnosis">Assessment / diagnosis</label><input id="diagnosis" name="diagnosis" placeholder="e.g. Blood pressure improving"></div>
            <div class="field"><label for="medicine">Medicine</label><input id="medicine" name="medicine" placeholder="e.g. Amlodipine 5mg"></div>
            <div class="field"><label for="test">Test or procedure</label><input id="test" name="test" placeholder="e.g. HbA1c"></div>
            <div class="field"><label for="appointment">Next appointment</label><input id="appointment" name="appointment" type="datetime-local"></div>
            <div class="field full"><label for="recommendation">Recommendation for patient</label><textarea id="recommendation" name="recommendation" rows="3" placeholder="Write a clear next step for the patient"></textarea></div>
            <div class="field full"><button class="btn btn-primary" type="submit">Save care plan & readings</button></div>
          </div>
        </div>
      </form>

      <div class="action-form">
        <p class="eyebrow">Visit history</p>
        ${renderVisitHistory(visits)}
      </div>
      <div class="action-form">
        <p class="eyebrow">Appointments</p>
        ${renderAppointmentList(appointments)}
      </div>
    </section>`;
}

function renderReadingForms(profile) {
  const requiredConditions = ['hypertension', 'diabetes', 'temperature', 'oxygen_level', 'body_weight'];
  const conditions = requiredConditions
    .map((condition) => getConditionConfig(condition))
    .filter(Boolean);

  if (!conditions.length) {
    return '<p class="muted">Patient has no conditions configured for structured readings.</p>';
  }

  return conditions.flatMap((condition) => 
    condition.metrics.map((metric) => `
      <div class="field">
        <label for="${condition.id}-${metric.id}">${metric.label}</label>
        <input id="${condition.id}-${metric.id}" name="metric-${condition.id}-${metric.id}" type="${metric.type}" min="0" placeholder="${metric.placeholder}">
      </div>
    `)
  ).join('');
}

function renderAppointmentList(appointments) {
  const sortedAppointments = [...appointments].sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));
  if (!sortedAppointments.length) return '<p class="muted">No appointments scheduled yet.</p>';

  return sortedAppointments.map((appointment) => `
    <article class="timeline-body" style="margin-top:12px">
      <div class="timeline-meta"><span class="severity low">${appointment.status || 'scheduled'}</span><time>${new Date(appointment.scheduledDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</time></div>
      <h3>${appointment.reason || 'Clinical follow-up'}</h3>
      <p>${appointment.notes || 'No appointment notes.'}</p>
    </article>`).join('');
}

function renderTimeline(logs, visits) {
  const events = [
    ...logs.map((log) => ({
      type: 'Health log',
      date: log.date,
      title: log.parsed_data?.summary || 'Patient health entry',
      body: log.raw_text || '',
      tags: [
        ...(log.parsed_data?.symptoms || []),
        log.parsed_data?.sleep ? `Sleep: ${log.parsed_data.sleep}` : ''
      ].filter(Boolean)
    })),
    ...visits.map((visit) => ({
      type: 'Visit',
      date: visit.date,
      title: visit.diagnosis || 'Clinical visit',
      body: visit.recommendations || visit.doctorNotes || '',
      tags: [
        ...(visit.prescriptions || []).map((item) => `${item.medicine} ${item.dosage || ''}`.trim()),
        ...(visit.testsOrdered || []).map((item) => `Test: ${item.name}`)
      ]
    }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  if (!events.length) return '<p class="muted">No timeline entries yet.</p>';

  return events.map((event) => `
    <article class="timeline-body" style="margin-top:12px">
      <div class="timeline-meta"><span class="severity low">${event.type}</span><time>${new Date(event.date).toLocaleDateString()}</time></div>
      <h3>${event.title}</h3>
      <p>${event.body}</p>
      <div class="tag-row">${event.tags.map((tag) => `<span>${tag}</span>`).join('')}</div>
    </article>`).join('');
}

function renderVisitHistory(visits) {
  const sortedVisits = [...visits].sort((a, b) => new Date(b.date) - new Date(a.date));
  if (!sortedVisits.length) return '<p class="muted">No care plans have been saved yet.</p>';

  return sortedVisits.map((visit) => `
    <article class="timeline-body" style="margin-top:12px">
      <div class="timeline-meta"><span class="severity low">Visit</span><time>${new Date(visit.date).toLocaleDateString()}</time></div>
      <h3>${visit.diagnosis}</h3><p>${visit.recommendations}</p>
      <div class="tag-row">${(visit.prescriptions || []).map((item) => `<span>${item.medicine} ${item.dosage || ''}</span>`).join('')}${(visit.testsOrdered || []).map((item) => `<span>Test: ${item.name}</span>`).join('')}</div>
    </article>`).join('');
}

export function init() {
  document.getElementById('logout-btn')?.addEventListener('click', async () => {
    await clearAllData();
    window.location.hash = '#/auth';
    window.dispatchEvent(new Event('healthi-session-change'));
  });

  document.getElementById('link-patient-btn')?.addEventListener('click', async () => {
    const input = document.getElementById('patient-code');
    try {
      await linkPatientToDoctor(input.value.trim().toUpperCase());
      showToast('Patient linked successfully.');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    } catch (error) {
      showToast(error.message);
    }
  });

  document.querySelectorAll('.patient-item').forEach((button) => {
    button.addEventListener('click', async () => {
      selectedPatientId = button.dataset.id;
      document.querySelectorAll('.patient-item').forEach((item) => item.classList.toggle('active', item === button));
      document.getElementById('patient-detail').innerHTML = await renderPatient(selectedPatientId);
      bindPatientDetail();
    });
  });

  bindPatientDetail();
}

function bindPatientDetail() {
  bindPatientTabs();
  bindClinicalForm();
}



function bindPatientTabs() {
  const detail = document.getElementById('patient-detail');
  detail?.querySelectorAll('[data-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      const tab = button.dataset.tab;
      detail.querySelectorAll('[data-tab]').forEach((item) => {
        const isActive = item === button;
        item.classList.toggle('active', isActive);
        item.setAttribute('aria-selected', String(isActive));
      });
      detail.querySelectorAll('[data-tab-panel]').forEach((panel) => {
        panel.hidden = panel.dataset.tabPanel !== tab;
      });
    });
  });
}

function bindClinicalForm() {
  document.getElementById('clinical-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const data = Object.fromEntries(new FormData(event.currentTarget));

      const metricGroups = {};
      for (const key in data) {
        if (key.startsWith('metric-') && data[key] !== '') {
          const parts = key.split('-');
          const conditionId = parts[1];
          const metricId = parts[2];
          
          if (!metricGroups[conditionId]) metricGroups[conditionId] = {};
          metricGroups[conditionId][metricId] = Number(data[key]);
        }
      }

      const metricPromises = Object.entries(metricGroups).map(([conditionId, metrics]) => {
        return addMetricLog({ patientId: selectedPatientId, condition: conditionId, metrics });
      });
      await Promise.all(metricPromises);

      const prescriptions = data.medicine ? [{ medicine: data.medicine, dosage: '', frequency: '', duration: '' }] : [];
      const testsOrdered = data.test ? [{ name: data.test, description: '', status: 'pending' }] : [];

      await addVisit({
        patientId: selectedPatientId,
        diagnosis: data.diagnosis || 'Follow-up review',
        prescriptions,
        testsOrdered,
        recommendations: data.recommendation || 'Continue the current care plan.',
        doctorNotes: data.recommendation || ''
      });

      if (data.appointment) {
        await addAppointment({
          patientId: selectedPatientId,
          scheduledDate: new Date(data.appointment).toISOString(),
          status: 'scheduled',
          reason: data.diagnosis || 'Clinical follow-up',
          notes: data.recommendation || ''
        });
      }

      showToast('Care plan saved and shared with the patient.');
      document.getElementById('patient-detail').innerHTML = await renderPatient(selectedPatientId);
      bindPatientDetail();
    } catch (error) {
      console.error('Error saving care plan:', error);
      showToast('Error saving care plan: ' + error.message);
    }
  });
}
