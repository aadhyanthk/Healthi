export const ConditionRegistry = {
  diabetes: {
    id: 'diabetes',
    name: 'Diabetes',
    description: 'Track your blood sugar levels.',
    metrics: [
      {
        id: 'blood_sugar',
        label: 'Blood Sugar (mg/dL)',
        type: 'number',
        placeholder: 'e.g., 105',
        chartConfig: {
          label: 'Blood Sugar Trend',
          color: '#fbbf24', // amber-400
          bgColor: 'rgba(251, 191, 36, 0.1)',
        }
      }
    ]
  },
  hypertension: {
    id: 'hypertension',
    name: 'Hypertension',
    description: 'Track your blood pressure.',
    metrics: [
      {
        id: 'systolic',
        label: 'Systolic (mmHg)',
        type: 'number',
        placeholder: 'e.g., 120',
        chartConfig: {
          label: 'Systolic Pressure',
          color: '#14b8a6', // teal-500
          bgColor: 'rgba(20, 184, 166, 0.1)',
        }
      },
      {
        id: 'diastolic',
        label: 'Diastolic (mmHg)',
        type: 'number',
        placeholder: 'e.g., 80',
        chartConfig: {
          label: 'Diastolic Pressure',
          color: '#2563eb', // blue-600
          bgColor: 'rgba(37, 99, 235, 0.1)',
        }
      }
    ]
  },
  temperature: {
    id: 'temperature',
    name: 'Body Temperature',
    description: 'Track body temperature.',
    metrics: [
      {
        id: 'temperature',
        label: 'Temperature (°F)',
        type: 'number',
        placeholder: 'e.g., 98.6',
        chartConfig: {
          label: 'Temperature Trend',
          color: '#ef4444', // red-500
          bgColor: 'rgba(239, 68, 68, 0.1)',
        }
      }
    ]
  },
  oxygen_level: {
    id: 'oxygen_level',
    name: 'Oxygen Level',
    description: 'Track blood oxygen saturation.',
    metrics: [
      {
        id: 'spo2',
        label: 'SpO2 (%)',
        type: 'number',
        placeholder: 'e.g., 98',
        chartConfig: {
          label: 'Oxygen Saturation',
          color: '#8b5cf6', // violet-500
          bgColor: 'rgba(139, 92, 246, 0.1)',
        }
      }
    ]
  },
  body_weight: {
    id: 'body_weight',
    name: 'Body Weight',
    description: 'Track your body weight.',
    metrics: [
      {
        id: 'weight',
        label: 'Weight (kg)',
        type: 'number',
        placeholder: 'e.g., 70',
        chartConfig: {
          label: 'Weight Trend',
          color: '#10b981', // emerald-500
          bgColor: 'rgba(16, 185, 129, 0.1)',
        }
      }
    ]
  }
};

/**
 * Returns the registry object for a given condition string (case-insensitive).
 */
export function getConditionConfig(conditionName) {
  const normalized = conditionName.trim().toLowerCase();
  for (const key in ConditionRegistry) {
    if (ConditionRegistry[key].name.toLowerCase() === normalized || key === normalized) {
      return ConditionRegistry[key];
    }
  }
  return null;
}
