import { db, auth, isDemoMode } from './firebase.js';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where
} from 'firebase/firestore';
import { deleteUser } from 'firebase/auth';

const STORE_KEY = 'healthi-demo-v2';
const SESSION_KEY = 'healthi-demo-role';
const memoryStore = new Map();
const browserStorage = typeof localStorage !== 'undefined' ? localStorage : {
  getItem: (key) => memoryStore.get(key) ?? null,
  setItem: (key, value) => memoryStore.set(key, value),
  removeItem: (key) => memoryStore.delete(key)
};

const daysAgo = (days, hour = 9) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
};

function seedStore() {
  return {
    profiles: {
      patient: {
        id: 'demo-patient',
        role: 'patient',
        name: 'Maya Rao',
        age: 68,
        gender: 'Female',
        email: 'maya@example.com',
        patientCode: 'HLT729',
        conditions: ['hypertension', 'diabetes', 'temperature', 'oxygen_level', 'body_weight'],
        medications: ['Metformin 500mg', 'Amlodipine 5mg'],
        onboardingComplete: true
      },
      doctor: {
        id: 'demo-doctor',
        role: 'doctor',
        name: 'Dr. Arjun Mehta',
        specialty: 'Internal Medicine',
        email: 'arjun@example.com',
        patients: ['demo-patient'],
        onboardingComplete: true
      }
    },
    logs: [
      {
        id: 'log-1',
        patientId: 'demo-patient',
        date: daysAgo(0, 8),
        raw_text: 'Mild headache this morning after sleeping poorly.',
        parsed_data: {
          symptoms: ['headache'],
          sleep: '5 hours, restless',
          hydration: 'low',
          severity: 'medium',
          summary: 'Mild morning headache after poor sleep.'
        }
      },
      {
        id: 'log-2',
        patientId: 'demo-patient',
        date: daysAgo(2, 19),
        raw_text: 'Felt energetic today and walked for 30 minutes.',
        parsed_data: {
          symptoms: [],
          sleep: '7 hours, good',
          hydration: 'good',
          severity: 'low',
          summary: 'Good energy with a 30-minute walk.'
        }
      },
      {
        id: 'log-3',
        patientId: 'demo-patient',
        date: daysAgo(4, 16),
        raw_text: 'Dizzy briefly before lunch. I had skipped breakfast.',
        parsed_data: {
          symptoms: ['dizziness'],
          sleep: '6 hours',
          hydration: 'fair',
          severity: 'medium',
          summary: 'Brief dizziness after skipping breakfast.'
        }
      }
    ],
    metrics: [
      { id: 'm1', patientId: 'demo-patient', condition: 'hypertension', date: daysAgo(6), metrics: { systolic: 142, diastolic: 88 } },
      { id: 'm2', patientId: 'demo-patient', condition: 'hypertension', date: daysAgo(3), metrics: { systolic: 136, diastolic: 84 } },
      { id: 'm3', patientId: 'demo-patient', condition: 'hypertension', date: daysAgo(0), metrics: { systolic: 132, diastolic: 82 } },
      { id: 'm4', patientId: 'demo-patient', condition: 'diabetes', date: daysAgo(6), metrics: { blood_sugar: 128 } },
      { id: 'm5', patientId: 'demo-patient', condition: 'diabetes', date: daysAgo(3), metrics: { blood_sugar: 119 } },
      { id: 'm6', patientId: 'demo-patient', condition: 'diabetes', date: daysAgo(0), metrics: { blood_sugar: 112 } }
    ],
    appointments: [
      {
        id: 'apt-1',
        patientId: 'demo-patient',
        doctorId: 'demo-doctor',
        doctorName: 'Dr. Arjun Mehta',
        scheduledDate: daysAgo(-3, 10),
        status: 'scheduled',
        reason: 'Blood pressure follow-up',
        notes: 'Bring your latest readings.'
      }
    ],
    visits: [
      {
        id: 'visit-1',
        patientId: 'demo-patient',
        doctorId: 'demo-doctor',
        date: daysAgo(12, 11),
        diagnosis: 'Blood pressure improving',
        prescriptions: [{ medicine: 'Amlodipine', dosage: '5mg', frequency: 'Once daily', duration: '30 days' }],
        testsOrdered: [{ name: 'HbA1c', description: 'Routine diabetes monitoring', status: 'pending' }],
        recommendations: 'Continue morning walks and record blood pressure three times weekly.',
        doctorNotes: 'Review again in two weeks.'
      }
    ],
    insights: [
      {
        id: 'insight-1',
        patientId: 'demo-patient',
        text: 'Headaches appear more frequently after nights with less than six hours of sleep.',
        createdAt: daysAgo(0, 10)
      },
      {
        id: 'insight-2',
        patientId: 'demo-patient',
        text: 'Energy levels were better on days that included a walk.',
        createdAt: daysAgo(2, 20)
      }
    ],
    recommendations: [
      {
        id: 'recommendation-1',
        patientId: 'demo-patient',
        doctorId: 'demo-doctor',
        doctorName: 'Dr. Arjun Mehta',
        text: 'Continue tracking sleep quality and morning headaches.',
        createdAt: daysAgo(1, 11)
      }
    ]
  };
}

function readStore() {
  const raw = browserStorage.getItem(STORE_KEY);
  if (raw) return JSON.parse(raw);
  const store = seedStore();
  browserStorage.setItem(STORE_KEY, JSON.stringify(store));
  return store;
}

function writeStore(store) {
  browserStorage.setItem(STORE_KEY, JSON.stringify(store));
}

export function getDemoRole() {
  return browserStorage.getItem(SESSION_KEY);
}

export function startDemo(role) {
  browserStorage.setItem(SESSION_KEY, role);
}

export function endDemo() {
  browserStorage.removeItem(SESSION_KEY);
}

function currentDemoId() {
  return getDemoRole() === 'doctor' ? 'demo-doctor' : 'demo-patient';
}

export async function getProfile() {
  if (isDemoMode) {
    const role = getDemoRole();
    return role ? readStore().profiles[role] : null;
  }
  const user = auth.currentUser;
  if (!user) return null;
  try {
    const snap = await getDoc(doc(db, 'users', user.uid));
    if (!snap.exists()) return null;
    const profile = snap.data();
    if (!profile || typeof profile !== 'object') {
      console.error('Invalid profile data from Firestore:', profile);
      return null;
    }
    if (profile.role === 'patient' && profile.patientCode) {
      await setDoc(doc(db, 'patientCodes', profile.patientCode), {
        patientId: user.uid,
        createdAt: profile.createdAt || serverTimestamp()
      }, { merge: true });
    }
    if (profile.role === 'patient') {
      await setDoc(doc(db, 'patientUids', user.uid), {
        patientId: user.uid,
        createdAt: profile.createdAt || serverTimestamp()
      }, { merge: true });
    }
    return profile;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

export async function setProfile(data) {
  if (isDemoMode) {
    const role = getDemoRole() || data.role || 'patient';
    const store = readStore();
    store.profiles[role] = { ...store.profiles[role], ...data };
    writeStore(store);
    return;
  }
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const profile = { ...data, updatedAt: serverTimestamp() };
  await setDoc(doc(db, 'users', user.uid), profile, { merge: true });

  if (profile.role === 'patient' && profile.patientCode) {
    await setDoc(doc(db, 'patientCodes', profile.patientCode), {
      patientId: user.uid,
      createdAt: serverTimestamp()
    });
  }
  if (profile.role === 'patient') {
    await setDoc(doc(db, 'patientUids', user.uid), {
      patientId: user.uid,
      createdAt: serverTimestamp()
    }, { merge: true });
  }
}

export async function createUserProfile(data) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const profile = {
    name: user.displayName || data.name || 'Healthi user',
    email: user.email || data.email || '',
    phone: user.phoneNumber || '',
    conditions: [],
    medications: [],
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  await setDoc(doc(db, 'users', user.uid), profile);
  if (profile.role === 'patient' && profile.patientCode) {
    await setDoc(doc(db, 'patientCodes', profile.patientCode), {
      patientId: user.uid,
      createdAt: serverTimestamp()
    });
  }
  if (profile.role === 'patient') {
    await setDoc(doc(db, 'patientUids', user.uid), {
      patientId: user.uid,
      createdAt: serverTimestamp()
    });
  }
  return profile;
}

export async function getLogs() {
  if (isDemoMode) return readStore().logs.filter((log) => log.patientId === 'demo-patient');
  const user = auth.currentUser;
  if (!user) return [];
  return getPatientLogs(user.uid);
}

export async function addLog(logData) {
  if (isDemoMode) {
    const store = readStore();
    const log = { ...logData, id: crypto.randomUUID(), patientId: 'demo-patient', date: new Date().toISOString() };
    store.logs.push(log);
    writeStore(store);
    return log.id;
  }
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const ref = await addDoc(collection(db, 'healthEntries'), {
    ...logData,
    patientId: user.uid,
    date: new Date().toISOString(),
    createdAt: serverTimestamp()
  });
  return ref.id;
}

export async function getLogsByDateRange(startDate, endDate) {
  return (await getLogs()).filter((log) => {
    const date = new Date(log.date);
    return date >= startDate && date <= endDate;
  });
}

export async function getMetricLogs() {
  if (isDemoMode) return readStore().metrics.filter((log) => log.patientId === 'demo-patient');
  const user = auth.currentUser;
  if (!user) return [];
  return getPatientMetricLogs(user.uid);
}

export async function addMetricLog(metricData) {
  if (isDemoMode) {
    const store = readStore();
    store.metrics.push({
      ...metricData,
      id: crypto.randomUUID(),
      patientId: metricData.patientId || 'demo-patient',
      date: new Date().toISOString()
    });
    writeStore(store);
    return;
  }
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  await addDoc(collection(db, 'metricLogs'), {
    ...metricData,
    patientId: metricData.patientId || user.uid,
    date: new Date().toISOString(),
    createdAt: serverTimestamp()
  });
}

export async function getAppointments(patientId) {
  if (isDemoMode) return readStore().appointments.filter((item) => item.patientId === (patientId || 'demo-patient'));
  const resolvedPatientId = patientId || auth.currentUser?.uid;
  if (!resolvedPatientId) return [];
  const q = query(collection(db, 'appointments'), where('patientId', '==', resolvedPatientId));
  return snapshotToArray(await getDocs(q));
}

export async function updateAppointment(id, updates) {
  if (isDemoMode) {
    const store = readStore();
    const index = store.appointments.findIndex((item) => item.id === id);
    store.appointments[index] = { ...store.appointments[index], ...updates };
    writeStore(store);
    return;
  }
  await setDoc(doc(db, 'appointments', id), { ...updates, updatedAt: serverTimestamp() }, { merge: true });
}

export async function addAppointment(data) {
  if (isDemoMode) {
    const store = readStore();
    store.appointments.push({ ...data, id: crypto.randomUUID(), doctorId: currentDemoId() });
    writeStore(store);
    return;
  }
  const doctor = auth.currentUser;
  if (!doctor) throw new Error('Not authenticated');
  const doctorProfile = await getProfile();
  await addDoc(collection(db, 'appointments'), {
    ...data,
    doctorId: doctor.uid,
    doctorName: doctorProfile?.name || 'Your doctor',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function getVisits(patientId) {
  if (isDemoMode) return readStore().visits.filter((item) => item.patientId === (patientId || 'demo-patient'));
  const resolvedPatientId = patientId || auth.currentUser?.uid;
  if (!resolvedPatientId) return [];
  const q = query(collection(db, 'doctorVisits'), where('patientId', '==', resolvedPatientId));
  return snapshotToArray(await getDocs(q));
}

export async function addVisit(data) {
  if (isDemoMode) {
    const store = readStore();
    store.visits.push({
      ...data,
      id: crypto.randomUUID(),
      doctorId: 'demo-doctor',
      date: new Date().toISOString()
    });
    writeStore(store);
    return;
  }
  const doctor = auth.currentUser;
  if (!doctor) throw new Error('Not authenticated');
  const doctorProfile = await getProfile();
  await addDoc(collection(db, 'doctorVisits'), {
    ...data,
    doctorId: doctor.uid,
    doctorName: doctorProfile?.name || '',
    date: new Date().toISOString(),
    createdAt: serverTimestamp()
  });
}

export async function clearAllData() {
  if (isDemoMode) {
    browserStorage.removeItem(STORE_KEY);
    endDemo();
    return;
  }
  await auth.signOut();
}

export async function deleteAccount() {
  if (isDemoMode) {
    await clearAllData();
    return;
  }
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const profileSnap = await getDoc(doc(db, 'users', user.uid));
  const profile = profileSnap.data();

  if (profile?.role === 'patient') {
    const ownedCollections = ['healthEntries', 'metricLogs', 'appointments', 'doctorVisits', 'aiInsights'];
    for (const collectionName of ownedCollections) {
      const ownedQuery = query(collection(db, collectionName), where('patientId', '==', user.uid));
      const ownedDocs = await getDocs(ownedQuery);
      await Promise.all(ownedDocs.docs.map((item) => deleteDoc(item.ref)));
    }

    const assignmentsQuery = query(
      collection(db, 'doctorAssignments'),
      where('patientId', '==', user.uid)
    );
    const assignments = await getDocs(assignmentsQuery);
    await Promise.all(assignments.docs.map((item) => deleteDoc(item.ref)));

    if (profile.patientCode) {
      await deleteDoc(doc(db, 'patientCodes', profile.patientCode));
    }
    await deleteDoc(doc(db, 'patientUids', user.uid));
  } else if (profile?.role === 'doctor') {
    const assignmentsQuery = query(
      collection(db, 'doctorAssignments'),
      where('doctorId', '==', user.uid)
    );
    const assignments = await getDocs(assignmentsQuery);
    await Promise.all(assignments.docs.map((item) => deleteDoc(item.ref)));
  }

  await deleteDoc(doc(db, 'users', user.uid));
  await deleteUser(user);
}

export async function linkPatientToDoctor(patientCode) {
  if (isDemoMode) {
    if (patientCode !== readStore().profiles.patient.patientCode) throw new Error('No patient found with that code.');
    return { ...readStore().profiles.patient };
  }
  const doctor = auth.currentUser;
  if (!doctor) throw new Error('Not authenticated');
  const codeSnap = await getDoc(doc(db, 'patientCodes', patientCode));
  if (!codeSnap.exists()) throw new Error('No patient found with that code.');
  const patientId = codeSnap.data().patientId;
  await setDoc(doc(db, 'doctorAssignments', `${doctor.uid}_${patientId}`), {
    doctorId: doctor.uid,
    patientId,
    patientCode,
    createdAt: serverTimestamp()
  });
  const patient = await getDoc(doc(db, 'users', patientId));
  return { id: patient.id, ...patient.data() };
}

export async function accessPatientByUid(patientUid) {
  const normalizedUid = patientUid.trim();
  if (!normalizedUid || normalizedUid.length > 128 || normalizedUid.includes('/')) {
    throw new Error('Enter a valid patient UID.');
  }

  if (isDemoMode) {
    const patient = readStore().profiles.patient;
    if (normalizedUid !== patient.id) throw new Error('No patient was found with that UID.');
    return { ...patient };
  }

  const doctor = auth.currentUser;
  if (!doctor) throw new Error('Not authenticated');
  const uidSnap = await getDoc(doc(db, 'patientUids', normalizedUid));
  if (!uidSnap.exists()) throw new Error('No patient was found with that UID.');

  await setDoc(doc(db, 'doctorAssignments', `${doctor.uid}_${normalizedUid}`), {
    doctorId: doctor.uid,
    patientId: normalizedUid,
    accessMethod: 'uid',
    createdAt: serverTimestamp()
  });

  const patient = await getPatientProfile(normalizedUid);
  if (!patient || patient.role !== 'patient') {
    await deleteDoc(doc(db, 'doctorAssignments', `${doctor.uid}_${normalizedUid}`));
    throw new Error('No patient was found with that UID.');
  }
  return patient;
}

export async function getDoctorPatients() {
  if (isDemoMode) return [{ ...readStore().profiles.patient }];
  const doctor = auth.currentUser;
  if (!doctor) return [];
  const assignmentsQuery = query(
    collection(db, 'doctorAssignments'),
    where('doctorId', '==', doctor.uid)
  );
  const assignments = await getDocs(assignmentsQuery);
  return Promise.all(assignments.docs.map(async (assignment) => {
    const id = assignment.data().patientId;
    const patient = await getDoc(doc(db, 'users', id));
    return patient.exists() ? { id, ...patient.data() } : null;
  })).then((patients) => patients.filter(Boolean));
}

export async function getPatientProfile(patientUid) {
  if (isDemoMode) return readStore().profiles.patient;
  const snap = await getDoc(doc(db, 'users', patientUid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function getPatientLogs(patientUid) {
  if (isDemoMode) return readStore().logs.filter((log) => log.patientId === 'demo-patient');
  const q = query(collection(db, 'healthEntries'), where('patientId', '==', patientUid));
  return snapshotToArray(await getDocs(q)).sort((a, b) => new Date(b.date) - new Date(a.date));
}

export async function getPatientMetricLogs(patientUid) {
  if (isDemoMode) return readStore().metrics.filter((log) => log.patientId === 'demo-patient');
  const q = query(collection(db, 'metricLogs'), where('patientId', '==', patientUid));
  return snapshotToArray(await getDocs(q)).sort((a, b) => new Date(a.date) - new Date(b.date));
}

export async function saveInsight(text) {
  const normalizedText = text?.trim();
  if (!normalizedText) return;

  if (isDemoMode) {
    const store = readStore();
    store.insights ||= [];
    const duplicate = store.insights.some((item) => item.patientId === 'demo-patient' && item.text === normalizedText);
    if (!duplicate) {
      store.insights.push({
        id: crypto.randomUUID(),
        patientId: 'demo-patient',
        text: normalizedText,
        createdAt: new Date().toISOString()
      });
      writeStore(store);
    }
    return;
  }

  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  await addDoc(collection(db, 'aiInsights'), {
    patientId: user.uid,
    text: normalizedText,
    createdAt: serverTimestamp()
  });
}

export async function getPatientInsights(patientUid) {
  if (isDemoMode) {
    return (readStore().insights || [])
      .filter((item) => item.patientId === 'demo-patient')
      .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
  }
  const q = query(collection(db, 'aiInsights'), where('patientId', '==', patientUid));
  return snapshotToArray(await getDocs(q)).sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
}

export async function addDoctorRecommendation({ patientId, text, doctorName }) {
  const normalizedText = text?.trim();
  if (!normalizedText) throw new Error('Enter a recommendation before saving.');

  if (isDemoMode) {
    const store = readStore();
    store.recommendations ||= [];
    store.recommendations.push({
      id: crypto.randomUUID(),
      patientId,
      doctorId: 'demo-doctor',
      doctorName: doctorName || store.profiles.doctor.name,
      text: normalizedText,
      createdAt: new Date().toISOString()
    });
    writeStore(store);
    return;
  }

  const doctor = auth.currentUser;
  if (!doctor) throw new Error('Not authenticated');
  await addDoc(collection(db, 'doctorRecommendations'), {
    patientId,
    doctorId: doctor.uid,
    doctorName: doctorName?.trim() || '',
    text: normalizedText,
    createdAt: serverTimestamp()
  });
}

export async function getDoctorRecommendations(patientUid) {
  if (isDemoMode) {
    return (readStore().recommendations || [])
      .filter((item) => item.patientId === 'demo-patient')
      .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
  }
  const q = query(collection(db, 'doctorRecommendations'), where('patientId', '==', patientUid));
  return snapshotToArray(await getDocs(q)).sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
}

function snapshotToArray(snapshot) {
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

function toMillis(value) {
  if (value?.toMillis) return value.toMillis();
  const millis = new Date(value || 0).getTime();
  return Number.isNaN(millis) ? 0 : millis;
}
