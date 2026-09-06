/**
 * Reusable, robust Firestore data sanitizer.
 * Recursively traverses objects and arrays to strip any property whose value is `undefined`.
 * 
 * Rules enforced:
 * - Omits undefined properties completely from plain objects.
 * - Preserves false, 0, "", null when intentionally valid.
 * - Preserves Firestore FieldValue sentinels (e.g. deleteField(), serverTimestamp()).
 * - Preserves Firestore Timestamps, Date instances, and other class objects.
 * - Does not corrupt arrays (filters out undefined items, recursively cleans elements).
 * - Never stringifies or mutates values unexpectedly.
 */
export function sanitizeFirestoreData<T>(input: T): T {
  if (input === null || input === undefined) {
    return input;
  }

  if (typeof input !== 'object') {
    return input;
  }

  // Preserve Date instances
  if (input instanceof Date) {
    return input;
  }

  // Preserve Firestore FieldValue sentinels (like deleteField(), serverTimestamp())
  if (
    typeof (input as any).isEqual === 'function' ||
    (input as any)._methodName ||
    (input as any).constructor?.name === 'FieldValue'
  ) {
    return input;
  }

  // Handle arrays: remove undefined items and sanitize children recursively
  if (Array.isArray(input)) {
    return input
      .filter((item) => item !== undefined)
      .map((item) => sanitizeFirestoreData(item)) as unknown as T;
  }

  // Handle plain objects: recursively omit undefined keys
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(input as Record<string, any>)) {
    if (value !== undefined) {
      cleaned[key] = sanitizeFirestoreData(value);
    }
  }

  return cleaned as T;
}

/**
 * Specific helper to sanitize an optional EntryLocation object.
 * Returns undefined if no location or placeName is present.
 * If valid, returns clean object with only defined fields (placeName, latitude, longitude, placeId).
 */
export function sanitizeEntryLocation(loc: any): any {
  if (!loc || typeof loc !== 'object') return undefined;
  const placeName = typeof loc.placeName === 'string' ? loc.placeName.trim() : '';
  const lat = typeof loc.latitude === 'number' ? loc.latitude : (loc.latitude !== undefined && loc.latitude !== null && loc.latitude !== '' ? Number(loc.latitude) : NaN);
  const lng = typeof loc.longitude === 'number' ? loc.longitude : (loc.longitude !== undefined && loc.longitude !== null && loc.longitude !== '' ? Number(loc.longitude) : NaN);
  const hasCoords = !isNaN(lat) && !isNaN(lng);

  if (!placeName && !hasCoords) return undefined;

  const cleanLoc: Record<string, any> = {
    placeName: placeName || (hasCoords ? `${lat.toFixed(3)}, ${lng.toFixed(3)}` : 'Saved Location'),
  };

  if (hasCoords) {
    cleanLoc.latitude = lat;
    cleanLoc.longitude = lng;
  }
  if (typeof loc.placeId === 'string' && loc.placeId.trim()) {
    cleanLoc.placeId = loc.placeId.trim();
  }

  return cleanLoc;
}
