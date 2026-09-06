import React, { useEffect, useRef, useState } from 'react';
import { loadMapsLibrary, reverseGeocode } from '../utils/mapsLoader';
import { 
  MapPin, 
  Clock, 
  Compass, 
  Sparkles, 
  Info, 
  ChevronRight,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { JournalEntry, MemoryReceipt } from '../types';
import { getMoodTheme } from '../theme/moodThemes';

interface MemoryMapViewProps {
  entries: JournalEntry[];
  onSelectEntry: (entry: JournalEntry) => void;
  onOpenReceipt: (receipt: MemoryReceipt) => void;
}

function isGenericPlaceName(name?: string | null): boolean {
  if (!name) return true;
  const trimmed = name.trim().toLowerCase();
  return (
    trimmed === 'current location' ||
    trimmed === 'saved location' ||
    trimmed === 'saved coordinates' ||
    trimmed === 'coordinates'
  );
}

export const MemoryMapView: React.FC<MemoryMapViewProps> = ({
  entries,
  onSelectEntry,
  onOpenReceipt,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [resolvedPlaceNames, setResolvedPlaceNames] = useState<Record<string, string>>({});

  // Dynamic place name resolver: backfills generic "Current Location" with real reverse-geocoded address
  const getDisplayPlaceName = (entry: JournalEntry | null | undefined): string => {
    if (!entry) return 'Saved Location';
    if (resolvedPlaceNames[entry.id]) {
      return resolvedPlaceNames[entry.id];
    }
    const raw = entry.location?.placeName?.trim();
    if (raw && !isGenericPlaceName(raw)) {
      return raw;
    }
    if (typeof entry.location?.latitude === 'number' && typeof entry.location?.longitude === 'number') {
      return `GPS (${entry.location.latitude.toFixed(2)}, ${entry.location.longitude.toFixed(2)})`;
    }
    return raw || 'Saved Location';
  };

  // Filter entries that have valid location coordinates
  const entriesWithLocation = entries.filter(
    (e) => e.location && typeof e.location.latitude === 'number' && typeof e.location.longitude === 'number'
  );

  // Automatically resolve generic "Current Location" entries to real addresses for display
  useEffect(() => {
    const genericEntries = entriesWithLocation.filter(
      (e) => isGenericPlaceName(e.location?.placeName) && !resolvedPlaceNames[e.id]
    );
    if (genericEntries.length === 0) return;

    let isMounted = true;
    for (const entry of genericEntries) {
      reverseGeocode(entry.location!.latitude!, entry.location!.longitude!)
        .then((res) => {
          if (isMounted && res?.placeName) {
            setResolvedPlaceNames((prev) => ({
              ...prev,
              [entry.id]: res.placeName,
            }));
          }
        })
        .catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, [entries]);

  // Filter entries that have a place name but no GPS coordinates
  const entriesWithPlaceOnly = entries.filter(
    (e) => e.location?.placeName && (typeof e.location.latitude !== 'number' || typeof e.location.longitude !== 'number')
  );

  // PRIVACY CONTRACT ENFORCEMENT:
  // Only MAY_CONNECT and IMPORTANT_MEMORY entries are allowed to participate in cross-entry
  // multi-visit location linking ("You Were Here Before"). STORE_ONLY and PAGE_ONLY are excluded.
  const connectableLocationEntries = entriesWithLocation.filter(
    (e) => e.memoryContract === 'MAY_CONNECT' || e.memoryContract === 'IMPORTANT_MEMORY'
  );

  const locationClusters: Record<string, JournalEntry[]> = {};
  for (const entry of connectableLocationEntries) {
    const placeKey = getDisplayPlaceName(entry).toLowerCase().trim();
    if (!locationClusters[placeKey]) locationClusters[placeKey] = [];
    locationClusters[placeKey].push(entry);
  }

  const multiVisitPlaces = Object.entries(locationClusters).filter(([_, items]) => items.length >= 2);

  // Initialize Google Maps with strict singleton option setting and safe fallback
  useEffect(() => {
    const apiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || '';

    if (!apiKey) {
      setMapError('The map is temporarily unavailable. Your journal and saved places are still safe.');
      return;
    }

    if (mapInstanceRef.current) {
      // Map is already initialized; do not re-create
      return;
    }

    try {
      loadMapsLibrary()
        .then((mapsLib: any) => {
          if (!mapsLib) {
            setMapError('The map is temporarily unavailable. Your journal and saved places are still safe.');
            return;
          }
          if (!mapContainerRef.current) return;
          if (mapInstanceRef.current) return; // Prevent duplicate instantiation if promise resolved after map was set

          // Compute initial center without hardcoded artificial coordinates
          let initialCenter = { lat: 20, lng: 0 };
          let initialZoom = 2;

          if (entriesWithLocation.length > 0) {
            initialCenter = {
              lat: entriesWithLocation[0].location!.latitude!,
              lng: entriesWithLocation[0].location!.longitude!,
            };
            initialZoom = 12;
          }

          // Initialize Map exactly once with mandatory solution attribution id
          const map = new mapsLib.Map(mapContainerRef.current, {
            center: initialCenter,
            zoom: initialZoom,
            styles: [
              {
                featureType: 'all',
                elementType: 'geometry',
                stylers: [{ lightness: 10 }],
              },
              {
                featureType: 'poi',
                elementType: 'labels',
                stylers: [{ visibility: 'off' }],
              },
            ],
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
            // Mandatory setting per Google Maps Platform Skill guidelines
            internalUsageAttributionIds: ['gmp_git_agentskills_v1'],
          });

          mapInstanceRef.current = map;
          setIsMapLoaded(true);
        })
        .catch((err) => {
          console.warn('Google Maps loader failed:', err);
          setMapError('The map is temporarily unavailable. Your journal and saved places are still safe.');
        });
    } catch (err) {
      console.warn('Failed to configure Google Maps:', err);
      setMapError('The map is temporarily unavailable. Your journal and saved places are still safe.');
    }

    return () => {
      // Cleanup on unmount
      markersRef.current.forEach((m) => m.setMap && m.setMap(null));
      markersRef.current = [];
      mapInstanceRef.current = null;
      setIsMapLoaded(false);
    };
  }, []);

  // Update markers when entries change or when map finishes loading
  useEffect(() => {
    if (mapInstanceRef.current && isMapLoaded) {
      renderMarkers(mapInstanceRef.current);
    }
  }, [entries, isMapLoaded]);

  const renderMarkers = (map: any) => {
    // Clear old markers
    markersRef.current.forEach((m) => m.setMap && m.setMap(null));
    markersRef.current = [];

    if (!window.google?.maps) return;

    const bounds = new window.google.maps.LatLngBounds();
    let hasCoords = false;

    entriesWithLocation.forEach((entry) => {
      const pos = {
        lat: entry.location!.latitude!,
        lng: entry.location!.longitude!,
      };

      const marker = new window.google.maps.Marker({
        position: pos,
        map,
        title: entry.title,
        // @ts-ignore
        internalUsageAttributionIds: ['gmp_git_agentskills_v1'],
      });

      marker.addListener('click', () => {
        setSelectedEntry(entry);
      });

      markersRef.current.push(marker);
      bounds.extend(pos);
      hasCoords = true;
    });

    if (hasCoords && entriesWithLocation.length > 1) {
      map.fitBounds(bounds);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 text-stone-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-amber-400 font-medium text-sm">
            <Compass className="w-5 h-5" />
            <span>Spatial Journal Archive</span>
          </div>
          <h2 className="text-2xl font-serif text-white tracking-tight">
            Memory Map
          </h2>
          <p className="text-stone-400 text-sm max-w-xl">
            Explore your memories geographically. Location is always strictly optional and user-controlled.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3 py-1.5 rounded-xl bg-stone-800 text-stone-300 text-xs font-mono font-medium border border-stone-700">
            {entriesWithLocation.length} Geotagged Moments
          </span>
        </div>
      </div>

      {/* Main Map & Sidebar Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* MAP CONTAINER (8 Cols on Desktop, Full Width on Mobile) */}
        <div className="w-full min-w-0 lg:col-span-8 space-y-4">
          <div className="relative w-full h-[360px] sm:h-[440px] lg:h-[520px] rounded-2xl overflow-hidden border border-stone-200 shadow-xs bg-stone-100">
            {/* Real Google Map element */}
            <div ref={mapContainerRef} className="w-full h-full min-w-0" />

            {/* Fallback Presentation when API Key is missing or Maps failed */}
            {mapError && (
              <div className="absolute inset-0 p-6 bg-stone-900/90 text-stone-200 backdrop-blur-xs flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
                    <Info className="w-4 h-4" />
                    <span>Spatial View Active</span>
                  </div>
                  <p className="text-xs text-stone-400 max-w-lg">
                    {mapError} You can inspect all your geotagged memories and "You Were Here Before" connections below.
                  </p>
                </div>

                {/* Interactive Fallback Map Grid */}
                <div className="flex-1 my-4 border border-stone-800 rounded-xl p-4 bg-stone-950/60 overflow-y-auto space-y-3">
                  <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider block">
                    Recorded Places & Coordinates
                  </span>
                  {entriesWithLocation.length === 0 ? (
                    <div className="py-8 text-center text-xs text-stone-500">
                      No memories have GPS coordinates attached yet. Use "Add Place" in the Journal Editor!
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {entriesWithLocation.map((entry) => {
                        const theme = getMoodTheme(entry.mood);
                        return (
                          <div
                            key={entry.id}
                            onClick={() => setSelectedEntry(entry)}
                            className="p-3 rounded-lg border border-stone-800 hover:border-stone-600 bg-stone-900/80 cursor-pointer transition space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-stone-200 flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                                {getDisplayPlaceName(entry)}
                              </span>
                              <span className={`w-2 h-2 rounded-full ${theme.dotColor}`} />
                            </div>
                            <p className="text-xs text-stone-400 line-clamp-1">{entry.title}</p>
                            <div className="text-[10px] font-mono text-stone-500">
                              {entry.location!.latitude!.toFixed(3)}, {entry.location!.longitude!.toFixed(3)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="text-[11px] text-stone-500">
                  Tip: Provide <code className="text-stone-300">VITE_GOOGLE_MAPS_API_KEY</code> to enable full satellite and vector rendering.
                </div>
              </div>
            )}
          </div>

          {/* "You Were Here Before" Highlight Banner (Respecting Privacy Contracts) */}
          {multiVisitPlaces.length > 0 && (
            <div className="p-5 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-900">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>You Were Here Before (Then → Now Place Connections)</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-emerald-800 font-medium bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-200">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Privacy Filtered: Only Connected Memories</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {multiVisitPlaces.map(([place, placeEntries]) => (
                  <div
                    key={place}
                    className="p-3 rounded-xl bg-white border border-amber-200/80 space-y-2 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-stone-900 capitalize">
                        {place}
                      </span>
                      <span className="text-[10px] font-mono text-amber-700 font-medium">
                        {placeEntries.length} reflections
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 line-clamp-2">
                      Earliest reflection on {placeEntries[placeEntries.length - 1].createdAt.slice(0, 10)}: "{placeEntries[placeEntries.length - 1].title}"
                    </p>
                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      {placeEntries.map((pe) => (
                        <button
                          key={pe.id}
                          type="button"
                          onClick={() => setSelectedEntry(pe)}
                          className="px-2 py-0.5 rounded bg-stone-100 text-[10px] text-stone-700 hover:bg-stone-200 transition cursor-pointer"
                        >
                          {pe.createdAt.slice(0, 10)}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* SIDEBAR: LOCATION DETAILS & PLACED MEMORIES LIST (4 Cols on Desktop, Stacks below Map on Mobile) */}
        <div className="w-full min-w-0 lg:col-span-4 space-y-5">
          {/* Selected Entry Detail Card */}
          {selectedEntry ? (
            <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-start justify-between gap-2 border-b border-stone-100 pb-3">
                <div>
                  <span className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider block">
                    Selected Location
                  </span>
                  <h4 className="text-base font-semibold text-stone-900 mt-0.5">
                    {selectedEntry.title}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedEntry(null)}
                  className="text-xs text-stone-400 hover:text-stone-600 cursor-pointer"
                >
                  Clear
                </button>
              </div>

              <div className="space-y-2 text-xs text-stone-600">
                <div className="flex items-center gap-2 text-stone-500">
                  <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  <span>{getDisplayPlaceName(selectedEntry)}</span>
                </div>
                <div className="flex items-center gap-2 text-stone-500">
                  <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  <span>{selectedEntry.createdAt.slice(0, 10)}</span>
                </div>
                <div className="bg-stone-50 dark:bg-stone-800/60 p-3.5 rounded-xl border border-stone-100 dark:border-stone-800 overflow-hidden">
                  <p className="text-xs text-stone-700 dark:text-stone-300 font-sans leading-relaxed line-clamp-3 break-words overflow-hidden text-ellipsis m-0 select-text">
                    {selectedEntry.content.trim()}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onSelectEntry(selectedEntry)}
                className="w-full py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-xs font-medium rounded-lg shadow-2xs hover:bg-stone-800 dark:hover:bg-stone-200 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Open in Journal</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-2 text-center py-8">
              <MapPin className="w-8 h-8 text-stone-300 mx-auto" />
              <h4 className="text-xs font-medium text-stone-700">
                Select a marker on the map
              </h4>
              <p className="text-[11px] text-stone-400 max-w-xs mx-auto leading-relaxed">
                Click any pin or place card to inspect the journal moment recorded at that sanctuary.
              </p>
            </div>
          )}

          {/* Place-Tagged Memories Without GPS */}
          {entriesWithPlaceOnly.length > 0 && (
            <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-800 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-stone-500" />
                  Place Names (No GPS)
                </span>
                <span className="text-[10px] font-mono text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
                  {entriesWithPlaceOnly.length}
                </span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {entriesWithPlaceOnly.map((entry) => (
                  <div
                    key={entry.id}
                    onClick={() => setSelectedEntry(entry)}
                    className="p-2.5 rounded-xl border border-stone-100 hover:border-stone-200 bg-[#faf8f5] cursor-pointer transition text-xs space-y-1"
                  >
                    <div className="font-medium text-stone-800 truncate">
                      {entry.location?.placeName}
                    </div>
                    <div className="text-[11px] text-stone-500 truncate">
                      {entry.title || 'Untitled'} • {entry.createdAt.slice(0, 10)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
