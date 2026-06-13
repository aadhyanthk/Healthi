import { beforeEach, describe, expect, it } from 'vitest';
import {
  addAppointment,
  addLog,
  addMetricLog,
  addDoctorRecommendation,
  addVisit,
  clearAllData,
  getAppointments,
  getLogs,
  getMetricLogs,
  getDoctorRecommendations,
  getPatientInsights,
  getProfile,
  getVisits,
  setProfile,
  saveInsight,
  startDemo
} from '../src/services/storage.js';

describe('Healthi storage service', () => {
  beforeEach(async () => {
    await clearAllData();
    startDemo('patient');
  });

  it('updates and retrieves a patient profile', async () => {
    await setProfile({ age: 70, conditions: ['hypertension'] });
    const profile = await getProfile();
    expect(profile.age).toBe(70);
    expect(profile.conditions).toEqual(['hypertension']);
    expect(profile.role).toBe('patient');
  });

  it('adds a health ledger entry', async () => {
    const initialCount = (await getLogs()).length;
    await addLog({ raw_text: 'Feeling good', parsed_data: { symptoms: [], severity: 'low', summary: 'Feeling good' } });
    const logs = await getLogs();
    expect(logs).toHaveLength(initialCount + 1);
    expect(logs.at(-1).patientId).toBe('demo-patient');
  });

  it('adds structured metric readings', async () => {
    const initialCount = (await getMetricLogs()).length;
    await addMetricLog({ condition: 'hypertension', metrics: { systolic: 120, diastolic: 80 } });
    const readings = await getMetricLogs();
    expect(readings).toHaveLength(initialCount + 1);
    expect(readings.at(-1).metrics.systolic).toBe(120);
  });

  it('shares appointments and visit plans across roles', async () => {
    await addAppointment({ patientId: 'demo-patient', scheduledDate: new Date().toISOString(), status: 'scheduled' });
    await addVisit({ patientId: 'demo-patient', diagnosis: 'Routine follow-up', recommendations: 'Continue walking.' });
    expect((await getAppointments()).at(-1).status).toBe('scheduled');
    expect((await getVisits()).at(-1).diagnosis).toBe('Routine follow-up');
  });

  it('stores generated insights and doctor recommendations', async () => {
    await saveInsight('Sleep and headache patterns were observed.');
    expect((await getPatientInsights('demo-patient'))[0].text).toBe('Sleep and headache patterns were observed.');

    startDemo('doctor');
    await addDoctorRecommendation({
      patientId: 'demo-patient',
      text: 'Monitor sleep quality.',
      doctorName: 'Dr. Test'
    });
    expect((await getDoctorRecommendations('demo-patient'))[0].text).toBe('Monitor sleep quality.');
  });
});
