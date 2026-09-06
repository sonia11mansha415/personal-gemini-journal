import { setOptions, importLibrary } from '@googlemaps/js-api-loader';

/**
 * Centralized Google Maps singleton loader and modern Places Autocomplete API.
 * Ensures setOptions is called exactly once across the application.
 */
let hasConfiguredMapsOptions = false;
let sessionTokenInstance: any = null;

function ensureMapsConfigured(): boolean {
  const apiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || '';
  if (!apiKey) {
    return false;
  }
  if (!hasConfiguredMapsOptions) {
    setOptions({
      key: apiKey,
      v: 'weekly',
    });
    hasConfiguredMapsOptions = true;
  }
  return true;
}

/**
 * Load Google Maps 'maps' library.
 */
export async function loadMapsLibrary(): Promise<any> {
  if (!ensureMapsConfigured()) return null;
  try {
    return await importLibrary('maps');
  } catch (err) {
    console.warn('Failed to load Google Maps maps library:', err);
    return null;
  }
}

/**
 * Load Google Maps 'places' library.
 */
export async function loadPlacesLibrary(): Promise<any> {
  if (!ensureMapsConfigured()) return null;
  try {
    return await importLibrary('places');
  } catch (err) {
    console.warn('Failed to load Google Maps places library:', err);
    return null;
  }
}

/**
 * Load Google Maps 'geocoding' library.
 */
export async function loadGeocodingLibrary(): Promise<any> {
  if (!ensureMapsConfigured()) return null;
  try {
    return await importLibrary('geocoding');
  } catch (err) {
    console.warn('Failed to load Google Maps geocoding library:', err);
    return null;
  }
}

export interface PlaceSuggestion {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText?: string;
  rawPrediction?: any;
}

/**
 * Session token management for modern Google Maps Autocomplete API.
 * Reuses a session token while user is typing; resets once a place is selected.
 */
function getOrCreateSessionToken(placesLib: any): any {
  if (!sessionTokenInstance && placesLib?.AutocompleteSessionToken) {
    sessionTokenInstance = new placesLib.AutocompleteSessionToken();
  }
  return sessionTokenInstance;
}

export function resetAutocompleteSessionToken(): void {
  sessionTokenInstance = null;
}

export interface ReverseGeocodeResult {
  placeName: string;
  formattedAddress: string;
  candidates: string[];
  status?: string;
  error?: string;
}

/**
 * Deterministic reverse geocoding via Google Maps Geocoder with candidate generation.
 * Resolves coordinates into a set of human-friendly location candidates:
 * - exact/street address
 * - neighborhood/area
 * - city/region
 * - recognizable nearby places (via modern Place.searchNearby if available)
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<ReverseGeocodeResult | null> {
  const geocodingLib = await loadGeocodingLibrary();
  if (!geocodingLib) {
    console.warn('[Google Geocoder] Geocoding library unavailable. Ensure Maps JavaScript & Geocoding APIs are enabled.');
    return {
      placeName: '',
      formattedAddress: '',
      candidates: [],
      error: 'Google Geocoding library unavailable',
      status: 'LIBRARY_UNAVAILABLE',
    };
  }

  try {
    const geocoder = new geocodingLib.Geocoder();
    const response = await geocoder.geocode({
      location: { lat: latitude, lng: longitude },
    });

    if (!response.results || response.results.length === 0) {
      console.warn('[Google Geocoder] Geocoder returned zero results for coordinates.');
      return {
        placeName: '',
        formattedAddress: '',
        candidates: [],
        error: 'No address results found for coordinates',
        status: 'ZERO_RESULTS',
      };
    }

    const candidateSet = new Set<string>();
    const firstResult = response.results[0];
    const bestFormattedAddress = firstResult.formatted_address || '';

    // 1. Exact address: cleaned formatted address from best result
    if (bestFormattedAddress) {
      // Remove trailing postal code / country if present for a cleaner primary label
      const cleanAddress = bestFormattedAddress
        .replace(/,?\s*\d{5,6}(?:-\d{4})?,?\s*/, ', ')
        .replace(/,\s*,/g, ',')
        .replace(/,\s*$/, '')
        .trim();
      if (cleanAddress) {
        candidateSet.add(cleanAddress);
      }
    }

    let exactStreet = '';
    let neighborhood = '';
    let cityRegion = '';

    for (const result of response.results) {
      const components = result.address_components || [];
      let streetNumber = '';
      let route = '';
      let sublocality = '';
      let locality = '';
      let adminArea = '';
      let country = '';

      for (const comp of components) {
        const types: string[] = comp.types || [];
        if (types.includes('street_number')) {
          streetNumber = comp.long_name || comp.short_name;
        } else if (types.includes('route')) {
          route = comp.long_name || comp.short_name;
        } else if (types.includes('sublocality') || types.includes('sublocality_level_1')) {
          sublocality = comp.long_name || comp.short_name;
        } else if (types.includes('locality')) {
          locality = comp.long_name || comp.short_name;
        } else if (types.includes('administrative_area_level_1')) {
          adminArea = comp.short_name || comp.long_name;
        } else if (types.includes('country')) {
          country = comp.short_name || comp.long_name;
        }
      }

      // 2. Street address candidate
      if (route && !exactStreet) {
        exactStreet = streetNumber ? `${streetNumber} ${route}` : route;
        if (locality) exactStreet += `, ${locality}`;
        else if (sublocality) exactStreet += `, ${sublocality}`;
      }

      // 3. Neighborhood/area candidate
      if (sublocality && !neighborhood) {
        neighborhood = locality ? `${sublocality}, ${locality}` : sublocality;
      }

      // 4. City/region candidate
      const primaryCity = locality || sublocality;
      if (primaryCity && !cityRegion) {
        cityRegion = adminArea ? `${primaryCity}, ${adminArea}` : country ? `${primaryCity}, ${country}` : primaryCity;
      }
    }

    if (exactStreet) candidateSet.add(exactStreet);
    if (neighborhood) candidateSet.add(neighborhood);
    if (cityRegion) candidateSet.add(cityRegion);

    // 5. Optional enhancement: modern Places API (New) Place.searchNearby()
    try {
      const placesLib = await loadPlacesLibrary();
      if (placesLib?.Place && typeof placesLib.Place.searchNearby === 'function') {
        const nearbyRes = await placesLib.Place.searchNearby({
          locationRestriction: {
            center: { lat: latitude, lng: longitude },
            radius: 150,
          },
          fields: ['displayName', 'formattedAddress'],
          maxResultCount: 3,
        });
        if (nearbyRes && Array.isArray(nearbyRes.places)) {
          for (const p of nearbyRes.places) {
            const rawName = p.displayName;
            const name = typeof rawName === 'string' ? rawName : rawName?.text;
            if (name && typeof name === 'string' && name.trim()) {
              candidateSet.add(name.trim());
            }
          }
        }
      }
    } catch {
      // Modern searchNearby optional enhancement, proceed without failing reverseGeocode
    }

    const candidates = Array.from(candidateSet).filter((c) => Boolean(c && c.trim() && c.length > 2));
    const primaryPlaceName = candidates[0] || bestFormattedAddress || '';

    return {
      placeName: primaryPlaceName,
      formattedAddress: bestFormattedAddress,
      candidates,
      status: 'OK',
    };
  } catch (err: any) {
    const status = String(err?.code || err?.message || 'UNKNOWN_ERROR');
    console.warn(`[Google Geocoder] Reverse geocoding failed with status: ${status}`);
    return {
      placeName: '',
      formattedAddress: '',
      candidates: [],
      error: status,
      status,
    };
  }
}

/**
 * Modern Places Autocomplete using AutocompleteSuggestion & AutocompleteSessionToken.
 */
export async function searchPlaces(query: string): Promise<PlaceSuggestion[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  const placesLib = await loadPlacesLibrary();
  if (!placesLib) return [];

  try {
    if (placesLib.AutocompleteSuggestion) {
      const sessionToken = getOrCreateSessionToken(placesLib);
      const request: any = {
        input: trimmed,
      };
      if (sessionToken) {
        request.sessionToken = sessionToken;
      }

      const { suggestions } = await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
      if (!Array.isArray(suggestions)) return [];

      return suggestions.slice(0, 5).map((s: any) => {
        const pred = s.placePrediction;
        const main = pred?.mainText?.toString() || pred?.text?.toString() || '';
        const secondary = pred?.secondaryText?.toString() || '';
        const desc = pred?.text?.toString() || (main && secondary ? `${main}, ${secondary}` : main || 'Place');
        return {
          placeId: pred?.placeId || '',
          description: desc,
          mainText: main,
          secondaryText: secondary,
          rawPrediction: pred,
        };
      });
    }

    return [];
  } catch (err) {
    console.warn('Google Places modern autocomplete search failed:', err);
    return [];
  }
}

/**
 * Fetch place details using modern Place.fetchFields() API with fallback to Geocoder.
 */
export async function getPlaceDetails(
  selected: PlaceSuggestion | string
): Promise<{ placeName: string; formattedAddress: string; latitude: number; longitude: number } | null> {
  const placesLib = await loadPlacesLibrary();

  // Modern Place API flow: prediction.toPlace() -> place.fetchFields()
  if (placesLib?.Place) {
    try {
      let placeInstance: any = null;
      if (typeof selected === 'object' && selected.rawPrediction && typeof selected.rawPrediction.toPlace === 'function') {
        placeInstance = selected.rawPrediction.toPlace();
      } else {
        const placeId = typeof selected === 'string' ? selected : selected.placeId;
        if (placeId) {
          placeInstance = new placesLib.Place({ id: placeId });
        }
      }

      if (placeInstance && typeof placeInstance.fetchFields === 'function') {
        await placeInstance.fetchFields({
          fields: ['displayName', 'formattedAddress', 'location', 'id'],
        });

        // Reset session token upon selection per Google Maps billing best practices
        resetAutocompleteSessionToken();

        const loc = placeInstance.location;
        if (loc) {
          const lat = typeof loc.lat === 'function' ? loc.lat() : Number(loc.lat);
          const lng = typeof loc.lng === 'function' ? loc.lng() : Number(loc.lng);
          const rawName = placeInstance.displayName;
          const placeName = typeof rawName === 'string' ? rawName : rawName?.text || placeInstance.formattedAddress?.split(',')[0] || 'Selected Place';

          return {
            placeName,
            formattedAddress: placeInstance.formattedAddress || placeName,
            latitude: lat,
            longitude: lng,
          };
        }
      }
    } catch (err) {
      console.warn('Modern Place.fetchFields failed, falling back to Geocoder:', err);
    }
  }

  // Graceful fallback to Geocoder by placeId
  const geocodingLib = await loadGeocodingLibrary();
  if (!geocodingLib) return null;

  try {
    const placeId = typeof selected === 'string' ? selected : selected.placeId;
    const geocoder = new geocodingLib.Geocoder();
    const response = await geocoder.geocode({ placeId });
    if (!response.results || response.results.length === 0) {
      return null;
    }

    const res = response.results[0];
    const loc = res.geometry?.location;
    if (!loc) return null;

    const lat = typeof loc.lat === 'function' ? loc.lat() : loc.lat;
    const lng = typeof loc.lng === 'function' ? loc.lng() : loc.lng;

    resetAutocompleteSessionToken();

    return {
      placeName: res.formatted_address?.split(',')[0] || 'Selected Place',
      formattedAddress: res.formatted_address || 'Selected Place',
      latitude: lat,
      longitude: lng,
    };
  } catch (err) {
    console.warn('Failed to retrieve place details via fallback geocoder:', err);
    return null;
  }
}
