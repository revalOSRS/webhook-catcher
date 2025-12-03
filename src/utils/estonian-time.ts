/**
 * Estonian Time Utilities
 * 
 * Event dates in the database are stored as Estonian time (Europe/Tallinn)
 * in a TIMESTAMP column (without timezone). This means the stored values
 * appear to be UTC but are actually Estonian time.
 * 
 * These utilities help convert between stored Estonian time and actual UTC
 * for proper comparisons with current time or external APIs (like WiseOldMan).
 * 
 * Estonian timezone:
 * - EET (Eastern European Time, Winter): UTC+2
 * - EEST (Eastern European Summer Time): UTC+3
 * 
 * DST transitions:
 * - Starts: Last Sunday of March at 3:00 AM EET → 4:00 AM EEST
 * - Ends: Last Sunday of October at 4:00 AM EEST → 3:00 AM EET
 */

/**
 * Check if a given date falls within Estonian DST (Summer Time)
 * 
 * @param date - Date to check (in UTC representation)
 * @returns true if date is in EEST (DST), false if in EET (standard time)
 */
export const isEstonianDST = (date: Date): boolean => {
  const year = date.getUTCFullYear();
  
  // Find last Sunday of March (DST starts at 3:00 AM EET = 1:00 AM UTC)
  const marchLast = new Date(Date.UTC(year, 2, 31)); // March 31
  const marchLastSunday = 31 - marchLast.getUTCDay();
  const dstStart = new Date(Date.UTC(year, 2, marchLastSunday, 1, 0, 0));
  
  // Find last Sunday of October (DST ends at 4:00 AM EEST = 1:00 AM UTC)
  const octLast = new Date(Date.UTC(year, 9, 31)); // October 31
  const octLastSunday = 31 - octLast.getUTCDay();
  const dstEnd = new Date(Date.UTC(year, 9, octLastSunday, 1, 0, 0));
  
  return date >= dstStart && date < dstEnd;
};

/**
 * Get the Estonian UTC offset in hours for a given date
 * 
 * @param date - Date to check
 * @returns 3 during DST (EEST), 2 during standard time (EET)
 */
export const getEstonianOffset = (date: Date): number => {
  return isEstonianDST(date) ? 3 : 2;
};

/**
 * Convert a date stored as "Estonian time in UTC column" to actual UTC
 * 
 * Use this when you have a date from the database that was stored as Estonian time
 * but needs to be compared with actual UTC times (like NOW() or WiseOldMan dates).
 * 
 * Example:
 * - Database stores: 2025-12-07 12:00:00 (meant to be Estonian noon)
 * - Actual UTC would be: 2025-12-07 10:00:00 (in winter, EET = UTC+2)
 * 
 * @param storedDate - Date from database (Estonian time stored as if UTC)
 * @returns Actual UTC Date
 */
export const estonianToUtc = (storedDate: Date): Date => {
  const offsetHours = getEstonianOffset(storedDate);
  return new Date(storedDate.getTime() - (offsetHours * 60 * 60 * 1000));
};

/**
 * Convert an actual UTC date to Estonian time representation
 * 
 * Use this when you need to display a UTC time as Estonian time,
 * or when storing a time that should be interpreted as Estonian.
 * 
 * @param utcDate - Actual UTC date
 * @returns Date shifted to Estonian time representation
 */
export const utcToEstonian = (utcDate: Date): Date => {
  const offsetHours = getEstonianOffset(utcDate);
  return new Date(utcDate.getTime() + (offsetHours * 60 * 60 * 1000));
};

/**
 * Get the current time in Estonian timezone
 * 
 * @returns Current time as if it were stored in Estonian format
 */
export const nowInEstonian = (): Date => {
  return utcToEstonian(new Date());
};

/**
 * Check if current time is within the given Estonian date range
 * 
 * @param startDate - Event start date (stored as Estonian time)
 * @param endDate - Event end date (stored as Estonian time)
 * @returns true if current UTC time is within the range
 */
export const isWithinEstonianDateRange = (
  startDate: Date | null,
  endDate: Date | null
): boolean => {
  const now = new Date(); // Current UTC time
  
  if (startDate) {
    const startUtc = estonianToUtc(startDate);
    if (now < startUtc) return false;
  }
  
  if (endDate) {
    const endUtc = estonianToUtc(endDate);
    if (now >= endUtc) return false;
  }
  
  return true;
};

