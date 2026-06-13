/**
 * Safely parse a date value that could be a string, Date object, or Firestore Timestamp
 * @param {string|Date|object} value - Date value from various sources
 * @returns {Date|null} - Valid Date object or null if invalid
 */
export function safeParseDate(value) {
  if (!value) return null;
  
  try {
    // Handle Firestore Timestamp objects
    if (value?.toDate && typeof value.toDate === 'function') {
      return value.toDate();
    }
    
    // Handle Date objects
    if (value instanceof Date) {
      const time = value.getTime();
      return Number.isNaN(time) ? null : value;
    }
    
    // Handle string dates
    if (typeof value === 'string') {
      const date = new Date(value);
      const time = date.getTime();
      return Number.isNaN(time) ? null : date;
    }
    
    // Handle numbers (timestamps)
    if (typeof value === 'number') {
      const date = new Date(value);
      const time = date.getTime();
      return Number.isNaN(time) ? null : date;
    }
    
    return null;
  } catch (error) {
    console.warn('Failed to parse date:', value, error);
    return null;
  }
}

/**
 * Safely compare two date values for sorting
 * @param {string|Date|object} dateA 
 * @param {string|Date|object} dateB 
 * @returns {number} - -1, 0, or 1 for sorting
 */
export function compareDates(dateA, dateB) {
  const a = safeParseDate(dateA);
  const b = safeParseDate(dateB);
  
  if (!a && !b) return 0;
  if (!a) return 1; // a is null, b comes first
  if (!b) return -1; // b is null, a comes first
  
  const aTime = a.getTime();
  const bTime = b.getTime();
  
  if (aTime < bTime) return -1;
  if (aTime > bTime) return 1;
  return 0;
}

/**
 * Safely format a date for display
 * @param {string|Date|object} value - Date value
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} - Formatted date or fallback text
 */
export function formatDate(value, options = {}) {
  const date = safeParseDate(value);
  if (!date) return 'Unknown date';
  
  try {
    return date.toLocaleString(undefined, options);
  } catch (error) {
    console.warn('Failed to format date:', value, error);
    return 'Invalid date';
  }
}

/**
 * Get the date difference in a human-readable format
 * @param {string|Date|object} value - Date to compare with now
 * @returns {string} - "Today", "Yesterday", "2 days ago", etc.
 */
export function getRelativeDate(value) {
  const date = safeParseDate(value);
  if (!date) return 'Unknown';
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const dateToCheck = new Date(date);
  dateToCheck.setHours(0, 0, 0, 0);
  
  const diffTime = today - dateToCheck;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays > 1) return `${diffDays} days ago`;
  if (diffDays === -1) return 'Tomorrow';
  return `in ${Math.abs(diffDays)} days`;
}
