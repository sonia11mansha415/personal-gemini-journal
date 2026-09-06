import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Save, 
  Sparkles, 
  Trash2, 
  Star, 
  Tag as TagIcon, 
  ShieldCheck, 
  AlertCircle, 
  RefreshCw, 
  Plus, 
  X, 
  Info,
  Clock,
  Heart,
  Briefcase,
  Flower2,
  Compass,
  HelpCircle,
  ArrowRight,
  Mic,
  MicOff,
  MapPin,
  Square,
  Navigation,
  Eye,
  Smile,
  Trophy,
  Check
} from 'lucide-react';
import { 
  JournalEntry, 
  ReflectionLens, 
  MemoryContract, 
  JournalMood, 
  UserPreferences, 
  OpeningQuestion, 
  MemoryReceipt,
  EntryLocation
} from '../types';
import { getMoodTheme } from '../theme/moodThemes';
import { authenticatedFetch } from '../api/authClient';
import { sanitizeEntryLocation } from '../utils/firestoreSanitizer';
import { EmojiPicker } from './EmojiPicker';
import { reverseGeocode, searchPlaces, getPlaceDetails, PlaceSuggestion } from '../utils/mapsLoader';

interface JournalEditorProps {
  entry: Partial<JournalEntry>;
  preferences: UserPreferences;
  onSave: (entryData: Partial<JournalEntry>) => Promise<boolean>;
  onDelete: (id: string) => Promise<void>;
  onTriggerReflect: (draft?: Partial<JournalEntry>) => void;
  isSaving: boolean;
  saveError: string | null;
  saveSuccess: boolean;
  onClearSaveError: () => void;
  onNewEntry: () => void;
  isReflecting: boolean;
  openingQuestions?: OpeningQuestion[];
  onOpenReceipt?: (receipt: MemoryReceipt) => void;
}

export const JournalEditor: React.FC<JournalEditorProps> = ({
  entry,
  preferences,
  onSave,
  onDelete,
  onTriggerReflect,
  isSaving,
  saveError,
  saveSuccess,
  onClearSaveError,
  onNewEntry,
  isReflecting,
  openingQuestions = [],
  onOpenReceipt,
}) => {
  const [title, setTitle] = useState(entry.title || '');
  const [content, setContent] = useState(entry.content || '');
  const [lens, setLens] = useState<ReflectionLens>(entry.lens || preferences.defaultLens || 'PERSONAL');
  const [memoryContract, setMemoryContract] = useState<MemoryContract>(
    entry.memoryContract || preferences.defaultMemoryContract || 'MAY_CONNECT'
  );
  const [tags, setTags] = useState<string[]>(entry.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [favorite, setFavorite] = useState<boolean>(Boolean(entry.favorite));
  const [mood, setMood] = useState<JournalMood>(entry.mood || 'peaceful');
  const [showContractInfo, setShowContractInfo] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Phase 3 Extensions: Location, Inferred Tone, Voice
  const [location, setLocation] = useState<EntryLocation | undefined>(entry.location);
  const [showLocationPopover, setShowLocationPopover] = useState(false);
  const [placeNameInput, setPlaceNameInput] = useState(entry.location?.placeName || '');
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationCandidates, setLocationCandidates] = useState<string[]>([]);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationConnection, setLocationConnection] = useState<any>(null);

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [isVoice, setIsVoice] = useState(Boolean(entry.isVoice));

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const cancelledRef = useRef(false);

  // Places Autocomplete predictions
  const [placePredictions, setPlacePredictions] = useState<PlaceSuggestion[]>([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);

  // Emoji picker & cursor insertion state
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const lastFocusedFieldRef = useRef<'title' | 'content'>('content');
  const titleInputRef = useRef<HTMLInputElement>(null);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Smooth autogrow textarea effect
  const adjustTextareaHeight = useCallback(() => {
    if (!contentTextareaRef.current) return;
    const el = contentTextareaRef.current;
    requestAnimationFrame(() => {
      el.style.height = 'auto';
      const newHeight = Math.min(Math.max(el.scrollHeight, 220), 560);
      el.style.height = `${newHeight}px`;
    });
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [content, adjustTextareaHeight]);

  // Career Wins review modal state
  const [showWinModal, setShowWinModal] = useState(false);
  const [isDraftingWin, setIsDraftingWin] = useState(false);
  const [isSavingWin, setIsSavingWin] = useState(false);
  const [winSavedNotice, setWinSavedNotice] = useState<string | null>(null);
  const [winFormData, setWinFormData] = useState({
    title: '',
    description: '',
    userNotes: '',
  });

  const handleInsertEmoji = (emoji: string) => {
    if (lastFocusedFieldRef.current === 'title' && titleInputRef.current) {
      const el = titleInputRef.current;
      const start = el.selectionStart ?? title.length;
      const end = el.selectionEnd ?? title.length;
      const updated = title.slice(0, start) + emoji + title.slice(end);
      setTitle(updated);
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 0);
    } else if (contentTextareaRef.current) {
      const el = contentTextareaRef.current;
      const start = el.selectionStart ?? content.length;
      const end = el.selectionEnd ?? content.length;
      const updated = content.slice(0, start) + emoji + content.slice(end);
      setContent(updated);
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 0);
    } else {
      setContent((prev) => prev + emoji);
    }
  };

  const handlePlaceInputChange = (val: string) => {
    setPlaceNameInput(val);
    if (val.trim().length >= 3) {
      setIsSearchingPlaces(true);
      searchPlaces(val)
        .then((preds) => {
          setPlacePredictions(preds);
        })
        .catch(() => {
          setPlacePredictions([]);
        })
        .finally(() => {
          setIsSearchingPlaces(false);
        });
    } else {
      setPlacePredictions([]);
    }
  };

  const handleSelectPrediction = async (pred: PlaceSuggestion) => {
    try {
      const details = await getPlaceDetails(pred);
      const newLoc: EntryLocation = {
        placeName: details?.placeName || pred.description,
        placeId: pred.placeId,
        latitude: details?.latitude,
        longitude: details?.longitude,
      };
      setLocation(newLoc);
      setPlaceNameInput(newLoc.placeName);
    } catch {
      setLocation({
        placeName: pred.description,
        placeId: pred.placeId,
      });
      setPlaceNameInput(pred.description);
    } finally {
      setPlacePredictions([]);
      setShowLocationPopover(false);
    }
  };

  const handleOpenWinModal = async () => {
    if (!content.trim()) return;

    // Strict privacy & safety: STORE_ONLY opens manual form without AI
    if (memoryContract === 'STORE_ONLY') {
      setWinFormData({
        title: title.trim() || 'Career Milestone',
        description: content.slice(0, 300).trim(),
        userNotes: '',
      });
      setShowWinModal(true);
      return;
    }

    // Unsaved entry: save first through existing secure flow to obtain real entryId
    let effectiveEntryId = entry.id;
    if (!effectiveEntryId) {
      const cleanLocation = sanitizeEntryLocation(location);
      const cleanDraft: Partial<JournalEntry> = {
        title: title.trim(),
        content: content.trim(),
        lens,
        memoryContract,
        tags,
        favorite,
        mood,
        isVoice,
        messages: entry.messages || [],
      };
      if (cleanLocation) {
        cleanDraft.location = cleanLocation;
      }
      const saved = await onSave(cleanDraft);
      if (!saved) {
        // Fall back to manual form without calling AI
        setWinFormData({
          title: title.trim() || 'Career Milestone',
          description: content.slice(0, 300).trim(),
          userNotes: '',
        });
        setShowWinModal(true);
        return;
      }
      effectiveEntryId = entry.id;
    }

    if (!effectiveEntryId) {
      setWinFormData({
        title: title.trim() || 'Career Milestone',
        description: content.slice(0, 300).trim(),
        userNotes: '',
      });
      setShowWinModal(true);
      return;
    }

    setIsDraftingWin(true);
    try {
      // Server is authoritative: send entryId only. Server loads stored entry and validates contract.
      const res = await authenticatedFetch('/api/journal/wins/candidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryId: effectiveEntryId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setWinFormData({
          title: data?.candidate?.title || title.trim() || 'Career Milestone',
          description: data?.candidate?.description || content.slice(0, 300).trim(),
          userNotes: '',
        });
      } else {
        setWinFormData({
          title: title.trim() || 'Career Milestone',
          description: content.slice(0, 300).trim(),
          userNotes: '',
        });
      }
    } catch {
      setWinFormData({
        title: title.trim() || 'Career Milestone',
        description: content.slice(0, 300).trim(),
        userNotes: '',
      });
    } finally {
      setIsDraftingWin(false);
      setShowWinModal(true);
    }
  };

  const handleConfirmWin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!winFormData.title.trim()) return;

    setIsSavingWin(true);
    try {
      const res = await authenticatedFetch('/api/journal/wins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: winFormData.title.trim(),
          description: winFormData.description.trim(),
          userNotes: winFormData.userNotes.trim() || undefined,
          sourceEntryIds: entry.id ? [entry.id] : [],
          date: new Date().toISOString().slice(0, 10),
          confirmed: true,
        }),
      });

      if (res.ok) {
        setShowWinModal(false);
        setWinSavedNotice('Added to your Career Wins vault.');
        setTimeout(() => setWinSavedNotice(null), 5000);
      }
    } catch (err) {
      console.error('Failed to save career win:', err);
    } finally {
      setIsSavingWin(false);
    }
  };

  // Acoustic speech activity detection constants (Web Audio AnalyserNode)
  // Minimum RMS amplitude required to count as human speech above noise floor
  const SPEECH_RMS_THRESHOLD = 0.035;
  // Minimum cumulative milliseconds of human voice energy required
  const MIN_SPEECH_DURATION_MS = 350;

  function deriveFallbackTitle(transcript: string): string {
    if (!transcript || !transcript.trim()) return 'Personal Reflection';
    const words = transcript.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return 'Personal Reflection';
    const phrase = words.slice(0, 5).join(' ');
    const title = phrase.charAt(0).toUpperCase() + phrase.slice(1);
    return title.length > 35 ? title.slice(0, 32) + '...' : title;
  }

  // Web Audio API visualizer & speech detection state
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const speechDurationMsRef = useRef<number>(0);
  const lastAudioSampleTimeRef = useRef<number>(Date.now());
  const [audioLevels, setAudioLevels] = useState<number[]>([0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15]);

  const cleanupAudioVisualizer = useCallback(() => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current) {
      if (audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevels([0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15]);
  }, []);

  const setupAudioVisualizer = useCallback((stream: MediaStream) => {
    try {
      cleanupAudioVisualizer();
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      const audioCtx = new AudioContextClass();
      audioContextRef.current = audioCtx;
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.4;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const freqData = new Uint8Array(bufferLength);
      const timeData = new Float32Array(analyser.fftSize);

      speechDurationMsRef.current = 0;
      lastAudioSampleTimeRef.current = Date.now();

      const updateWaveform = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(freqData);

        // Acoustic speech detection via RMS amplitude calculation
        if (typeof analyserRef.current.getFloatTimeDomainData === 'function') {
          analyserRef.current.getFloatTimeDomainData(timeData);
          let sumSquares = 0;
          for (let i = 0; i < timeData.length; i++) {
            sumSquares += timeData[i] * timeData[i];
          }
          const rms = Math.sqrt(sumSquares / timeData.length);
          const now = Date.now();
          const deltaMs = Math.min(100, Math.max(0, now - lastAudioSampleTimeRef.current));
          lastAudioSampleTimeRef.current = now;

          if (rms >= SPEECH_RMS_THRESHOLD) {
            speechDurationMsRef.current += deltaMs;
          }
        } else {
          let sum = 0;
          for (let i = 0; i < freqData.length; i++) sum += freqData[i];
          const avg = sum / freqData.length;
          const now = Date.now();
          const deltaMs = Math.min(100, Math.max(0, now - lastAudioSampleTimeRef.current));
          lastAudioSampleTimeRef.current = now;
          if (avg > 25) {
            speechDurationMsRef.current += deltaMs;
          }
        }

        const barCount = 8;
        const step = Math.max(1, Math.floor(bufferLength / barCount));
        const levels: number[] = [];

        for (let i = 0; i < barCount; i++) {
          let sum = 0;
          let count = 0;
          for (let j = 0; j < step && i * step + j < bufferLength; j++) {
            sum += freqData[i * step + j];
            count++;
          }
          const avg = count > 0 ? sum / count : 0;
          const normalized = Math.max(0.15, Math.min(1.0, avg / 160));
          levels.push(normalized);
        }

        setAudioLevels(levels);
        animFrameRef.current = requestAnimationFrame(updateWaveform);
      };

      animFrameRef.current = requestAnimationFrame(updateWaveform);
    } catch (err) {
      console.warn('Microphone visualizer initialization failed:', err);
    }
  }, [cleanupAudioVisualizer]);

  // Clean up all audio hardware, context, and animation frame on unmount
  useEffect(() => {
    return () => {
      cleanupAudioVisualizer();
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stream?.getTracks().forEach((track) => track.stop());
        mediaRecorderRef.current = null;
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [cleanupAudioVisualizer]);

  // Sync state when entry changes (e.g. from history drawer)
  useEffect(() => {
    if (mediaRecorderRef.current) {
      cancelRecording();
    }
    setVoiceNotice(null);
    setIsRecording(false);
    setIsTranscribing(false);
    setRecordingSeconds(0);
    speechDurationMsRef.current = 0;
    setTitle(entry.title || '');
    setContent(entry.content || '');
    setLens(entry.lens || preferences.defaultLens || 'PERSONAL');
    setMemoryContract(entry.memoryContract || preferences.defaultMemoryContract || 'MAY_CONNECT');
    setTags(entry.tags || []);
    setFavorite(Boolean(entry.favorite));
    setMood(entry.mood || 'peaceful');
    setLocation(entry.location);
    setPlaceNameInput(entry.location?.placeName || '');
    setIsVoice(Boolean(entry.isVoice));
    setLocationConnection(null);
  }, [entry.id]);

  // Check for "You Were Here Before" connection when location changes
  useEffect(() => {
    const isConnectableContract = memoryContract === 'MAY_CONNECT' || memoryContract === 'IMPORTANT_MEMORY';
    const hasCoordinates = typeof location?.latitude === 'number' && typeof location?.longitude === 'number';

    if (Boolean(entry.id) && hasCoordinates && isConnectableContract) {
      authenticatedFetch('/api/journal/location/connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId: entry.id, location }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data?.connection) {
            setLocationConnection(data.connection);
          } else {
            setLocationConnection(null);
          }
        })
        .catch(() => {});
    } else {
      setLocationConnection(null);
    }
  }, [entry.id, location?.latitude, location?.longitude, memoryContract]);

  // Voice Recording Functions
  const startRecording = async () => {
    if (memoryContract === 'STORE_ONLY') {
      setVoiceNotice('Voice notes use Gemini transcription and are disabled under the Store Only privacy contract.');
      return;
    }
    cancelledRef.current = false;
    speechDurationMsRef.current = 0;
    setVoiceNotice(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      setupAudioVisualizer(stream);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        cleanupAudioVisualizer();
        // Stop all audio tracks immediately to release hardware
        stream.getTracks().forEach((track) => track.stop());

        if (cancelledRef.current) {
          audioChunksRef.current = [];
          speechDurationMsRef.current = 0;
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        audioChunksRef.current = []; // Wipe temporary buffer immediately

        // Guard 1: Acoustic speech activity detection check
        const hasAcousticSpeech = speechDurationMsRef.current >= MIN_SPEECH_DURATION_MS;
        speechDurationMsRef.current = 0;

        if (!hasAcousticSpeech || audioBlob.size < 400) {
          setVoiceNotice("No speech was detected. Try again when you're ready.");
          return;
        }

        // Convert to base64
        setIsTranscribing(true);
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          if (cancelledRef.current) {
            setIsTranscribing(false);
            return;
          }
          const base64Audio = (reader.result as string).split(',')[1];
          const isNewVoice = !entry.id;
          try {
            const res = await authenticatedFetch('/api/journal/voice-transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                audioBase64: base64Audio,
                mimeType: mediaRecorder.mimeType || 'audio/webm',
                entryId: entry.id || undefined,
                isNewVoiceEntry: isNewVoice,
                memoryContract,
                lens,
              }),
            });

            if (cancelledRef.current) return;

            if (res.ok) {
              const data = await res.json();
              if (data.speechDetected && data.transcript && data.transcript.trim()) {
                const transcribedText = data.transcript.trim();
                const suggestedTitle = data.suggestedTitle || deriveFallbackTitle(transcribedText);

                if (isNewVoice && data.entry) {
                  // Voice-first entry successfully created and promoted on server
                  setTitle(data.entry.title || suggestedTitle);
                  setContent(data.entry.content || transcribedText);
                  setIsVoice(true);
                  setVoiceNotice('Voice note saved · Audio transcript added to your moment');
                  if (onSave) {
                    await onSave(data.entry);
                  }
                } else {
                  // Existing entry update
                  setContent((prev) => (prev ? `${prev}\n\n${transcribedText}` : transcribedText));
                  if (!title.trim() && suggestedTitle) {
                    setTitle(suggestedTitle);
                  }
                  setIsVoice(true);
                  setVoiceNotice('Voice note saved · Audio transcript added to your moment');
                }

                setTimeout(() => {
                  setVoiceNotice((curr) =>
                    curr === 'Voice note saved · Audio transcript added to your moment' ? null : curr
                  );
                }, 6000);
              } else {
                setVoiceNotice("No speech was detected. Try again when you're ready.");
              }
            } else {
              const errData = await res.json().catch(() => ({}));
              setVoiceNotice(
                errData.error ||
                  'Gemini transcription is temporarily unavailable. Your journal is still safe. Try again later or continue typing.'
              );
            }
          } catch (err) {
            if (!cancelledRef.current) {
              setVoiceNotice('Gemini transcription is temporarily unavailable. Your journal is still safe. Try again later or continue typing.');
            }
          } finally {
            setIsTranscribing(false);
          }
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.warn('Microphone access rejected or unavailable:', err);
      setVoiceNotice('Microphone access was not granted. You can still type freely.');
    }
  };

  const stopRecording = () => {
    cleanupAudioVisualizer();
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  };

  const cancelRecording = () => {
    cancelledRef.current = true;
    cleanupAudioVisualizer();
    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      } catch {}
      mediaRecorderRef.current.stream?.getTracks().forEach((track) => track.stop());
      mediaRecorderRef.current = null;
    }
    audioChunksRef.current = [];
    speechDurationMsRef.current = 0;
    setIsRecording(false);
    setIsTranscribing(false);
    setRecordingSeconds(0);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  // Location Geolocation Request (strictly on user click) with Reverse Geocoding
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    setIsDetectingLocation(true);
    setLocationError(null);
    setLocationCandidates([]);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        try {
          const res = await reverseGeocode(lat, lng);
          if (res && res.candidates && res.candidates.length > 0) {
            const chosenName = res.candidates[0] || res.placeName;
            const newLoc: EntryLocation = {
              latitude: lat,
              longitude: lng,
              placeName: chosenName,
            };
            setLocation(newLoc);
            setPlaceNameInput(chosenName);
            setLocationCandidates(res.candidates);
            setLocationError(null);
          } else {
            const status = res?.status || res?.error || '';
            console.warn('[Geolocation] Reverse geocoding failed or returned empty candidates. Status:', status);
            if (status.includes('REQUEST_DENIED')) {
              setLocationError('Google Maps Geocoding API returned REQUEST_DENIED. Please ensure the Geocoding API is enabled on your API key in Google Cloud Console.');
            } else {
              setLocationError("We found your position, but couldn't identify the place name. You can try again or save a custom label.");
            }
          }
        } catch (e: any) {
          console.warn('[Geolocation] Reverse geocoding exception:', e?.message || e);
          setLocationError("We found your position, but couldn't identify the place name. You can try again or save a custom label.");
        } finally {
          setIsDetectingLocation(false);
        }
      },
      (err) => {
        console.warn('[Geolocation] Geolocation denied or failed:', err?.message || err);
        setIsDetectingLocation(false);
        setLocationError('Location permission was denied or unavailable. You can enter a custom label above.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSaveClick = async () => {
    if (!content.trim()) return;
    const cleanLocation = sanitizeEntryLocation(location);
    const cleanDraft: Partial<JournalEntry> = {
      id: entry.id,
      title: title.trim(),
      content: content.trim(),
      lens,
      memoryContract,
      tags,
      favorite,
      mood,
      isVoice,
      messages: entry.messages || [],
      createdAt: entry.createdAt,
    };
    if (cleanLocation) {
      cleanDraft.location = cleanLocation;
    }
    await onSave(cleanDraft);
  };

  const handleReflectClick = () => {
    if (!content.trim()) return;
    const cleanLocation = sanitizeEntryLocation(location);
    const cleanDraft: Partial<JournalEntry> = {
      id: entry.id,
      title: title.trim(),
      content: content.trim(),
      lens,
      memoryContract,
      tags,
      favorite,
      mood,
      isVoice,
      messages: entry.messages || [],
      createdAt: entry.createdAt,
    };
    if (cleanLocation) {
      cleanDraft.location = cleanLocation;
    }
    onTriggerReflect(cleanDraft);
  };

  const handleAddTag = (e: React.KeyboardEvent | React.MouseEvent) => {
    if (e.type === 'keydown' && (e as React.KeyboardEvent).key !== 'Enter') return;
    e.preventDefault();
    const clean = tagInput.trim().replace(/^#/, '');
    if (clean && !tags.includes(clean) && tags.length < 10) {
      setTags([...tags, clean]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const formattedDate = entry.createdAt
    ? new Date(entry.createdAt).toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : new Date().toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });

  const moods: { id: JournalMood; label: string; emoji: string }[] = [
    { id: 'peaceful', label: 'Peaceful', emoji: '🌿' },
    { id: 'energized', label: 'Energized', emoji: '⚡' },
    { id: 'thoughtful', label: 'Thoughtful', emoji: '💭' },
    { id: 'grateful', label: 'Grateful', emoji: '✨' },
    { id: 'stressed', label: 'Stressed', emoji: '🌧️' },
  ];

  const getLensPlaceholder = (activeLens: ReflectionLens): string => {
    switch (activeLens) {
      case 'PROFESSIONAL':
        return "Reflect on a decision, a challenge, a win, or something you learned today...";
      case 'IDENTITY_AND_GROWTH':
        return "How did you see yourself today? What did you notice about your habits or values?";
      case 'WOMEN_AND_LIFE':
        return "Take a quiet moment. What held meaning, required strength, or brought joy today?";
      case 'PERSONAL':
      default:
        return "What's on your mind today? A thought, a feeling, or something that happened...";
    }
  };

  const contractExplanations: Record<MemoryContract, { title: string; desc: string }> = {
    STORE_ONLY: {
      title: 'Private Only',
      desc: 'Saved securely. Never used for AI reflections or connected to other moments.',
    },
    PAGE_ONLY: {
      title: 'One-Time Reflection',
      desc: 'You can reflect on this page, but it will never be linked to future memories.',
    },
    MAY_CONNECT: {
      title: 'Connect With Memories',
      desc: 'Can connect with your life threads, patterns, and living memory.',
    },
    IMPORTANT_MEMORY: {
      title: 'Core Memory',
      desc: 'High priority for your story and long-term reflection.',
    },
  };

  return (
    <div className="bg-white border border-[#e5dfd6] rounded-2xl shadow-xs overflow-hidden transition-all">
      {/* Top Banner: How do you want to reflect today? */}
      <div className="bg-[#fcfaf7] border-b border-[#e9e3da] px-4 sm:px-6 py-3.5 sm:py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-900/80 block mb-0.5">
              Reflection Perspective
            </span>
            <h3 className="font-serif text-base font-medium text-stone-900">
              How do you want to reflect today?
            </h3>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-stone-500 font-sans">
            <Clock className="w-3.5 h-3.5" />
            <span>{formattedDate}</span>
          </div>
        </div>

        {/* Quick Lens Switcher Pills */}
        <div className="flex flex-wrap gap-2 pt-1">
          {preferences.enabledLenses.map((l) => {
            const isSelected = lens === l;
            return (
              <button
                key={l}
                id={`btn-select-lens-${l.toLowerCase()}`}
                onClick={() => setLens(l)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  isSelected
                    ? l === 'PERSONAL'
                      ? 'bg-amber-100/80 text-amber-950 border-amber-300 ring-1 ring-amber-400/30 font-semibold'
                      : l === 'PROFESSIONAL'
                      ? 'bg-indigo-100/80 text-indigo-950 border-indigo-300 ring-1 ring-indigo-400/30 font-semibold'
                      : l === 'WOMEN_AND_LIFE'
                      ? 'bg-rose-100/80 text-rose-950 border-rose-300 ring-1 ring-rose-400/30 font-semibold'
                      : 'bg-emerald-100/80 text-emerald-950 border-emerald-300 ring-1 ring-emerald-400/30 font-semibold'
                    : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50 hover:text-stone-900'
                }`}
              >
                {l === 'PERSONAL' && <Heart className="w-3.5 h-3.5 text-amber-700" />}
                {l === 'PROFESSIONAL' && <Briefcase className="w-3.5 h-3.5 text-indigo-700" />}
                {l === 'WOMEN_AND_LIFE' && <Flower2 className="w-3.5 h-3.5 text-rose-700" />}
                {l === 'IDENTITY_AND_GROWTH' && <Compass className="w-3.5 h-3.5 text-emerald-700" />}
                <span>
                  {l === 'PERSONAL' && 'Personal'}
                  {l === 'PROFESSIONAL' && 'Professional'}
                  {l === 'WOMEN_AND_LIFE' && 'Women & Life'}
                  {l === 'IDENTITY_AND_GROWTH' && 'Identity & Growth'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Personalized Opening Question Banner */}
      {openingQuestions.length > 0 && !entry.id && (
        <div className="bg-gradient-to-r from-amber-50/70 via-[#fdfbf7] to-white border-b border-[#ece5da] px-4 sm:px-6 py-3 text-xs">
          {(() => {
            const activeQuestion = openingQuestions[currentQuestionIndex % openingQuestions.length];
            if (!activeQuestion) return null;

            return (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-amber-800 mt-0.5 shrink-0" />
                  <div>
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="font-semibold text-amber-950 uppercase tracking-wider text-[10px]">
                        {activeQuestion.isPersonalized ? 'Personalized Opening Question' : 'Opening Reflection'}
                      </span>
                      {activeQuestion.receipt && onOpenReceipt && (
                        <button
                          type="button"
                          onClick={() => onOpenReceipt(activeQuestion.receipt!)}
                          className="inline-flex items-center gap-1 text-[10px] text-amber-800 hover:text-amber-950 font-medium underline"
                        >
                          <ShieldCheck className="w-3 h-3" />
                          <span>Why this question?</span>
                        </button>
                      )}
                    </div>
                    <p className="font-serif text-stone-800 text-xs sm:text-sm italic">
                      "{activeQuestion.question}"
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={() => {
                      if (!title) setTitle(activeQuestion.question);
                      else setContent((prev) => (prev ? `${prev}\n\n${activeQuestion.question}\n` : `${activeQuestion.question}\n`));
                    }}
                    className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 hover:bg-amber-200 font-medium text-[11px] transition-all flex items-center gap-1"
                  >
                    <span>Reflect on this</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                  {openingQuestions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
                      className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
                      title="Next question prompt"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Persistent Error / Safety Notification */}
      {saveError && (
        <div className="bg-red-50/90 border-b border-red-200 px-4 sm:px-6 py-3 flex items-center justify-between text-xs text-red-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>
              <strong>Save failed:</strong> {saveError}. Your written text has been safely preserved.
            </span>
          </div>
          <button
            id="btn-retry-save"
            onClick={handleSaveClick}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-red-600 text-white font-semibold hover:bg-red-700 shadow-xs"
          >
            <RefreshCw className={`w-3 h-3 ${isSaving ? 'animate-spin' : ''}`} />
            Retry Save
          </button>
        </div>
      )}

      {saveSuccess && (
        <div className="bg-emerald-50/90 dark:bg-emerald-950/30 border-b border-emerald-200 dark:border-emerald-800 px-4 sm:px-6 py-2.5 flex items-center gap-2 text-xs text-emerald-900 dark:text-emerald-200 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Saved to your private journal.</span>
        </div>
      )}

      {/* Main Journal Writing Canvas */}
      <div className="p-4 sm:p-6 md:p-8">
        {/* Title Input */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <input
            ref={titleInputRef}
            id="input-entry-title"
            type="text"
            value={title}
            autoComplete="off"
            data-lpignore="true"
            onFocus={() => {
              lastFocusedFieldRef.current = 'title';
            }}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title of this moment (optional)"
            className="w-full font-serif text-xl sm:text-2xl font-medium text-stone-900 dark:text-stone-100 placeholder:text-stone-400 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 px-4 py-3 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all tracking-tight"
          />

          <button
            id="btn-toggle-favorite"
            onClick={() => setFavorite(!favorite)}
            title={favorite ? 'Unfavorite' : 'Mark as favorite'}
            className={`p-3 rounded-xl border transition-colors shrink-0 ${
              favorite
                ? 'bg-amber-50 border-amber-300 text-amber-600'
                : 'bg-stone-50 dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-400 hover:text-stone-600'
            }`}
          >
            <Star className={`w-5 h-5 ${favorite ? 'fill-amber-500' : ''}`} />
          </button>
        </div>

        {/* Voice Recording Controls & Notice */}
        <div className="mb-4">
          {isRecording ? (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex flex-wrap items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                {/* Recording indicator */}
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping motion-reduce:animate-none absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600" />
                  </span>
                  <span className="text-xs font-semibold text-rose-900 dark:text-rose-200 tracking-wide">
                    Recording
                  </span>
                </div>

                {/* Lightweight Live Audio Waveform / Level Bars */}
                <div
                  className="flex items-center gap-1 h-5 px-2 bg-rose-100/70 dark:bg-rose-900/40 rounded-md border border-rose-200/80 dark:border-rose-800/50"
                  aria-label="Live audio input levels"
                  title="Microphone input level"
                >
                  {audioLevels.map((lvl, idx) => (
                    <span
                      key={idx}
                      className="w-1 bg-rose-600 dark:bg-rose-400 rounded-full transition-[height,opacity] duration-75 motion-reduce:transition-none"
                      style={{
                        height: `${Math.max(3, Math.round(lvl * 16))}px`,
                        opacity: Math.max(0.35, lvl),
                      }}
                    />
                  ))}
                </div>

                {/* Elapsed Recording Time */}
                <span className="font-mono text-xs font-medium text-rose-800 dark:text-rose-300">
                  {String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:
                  {String(recordingSeconds % 60).padStart(2, '0')}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={stopRecording}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
                  id="btn-stop-voice"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Stop & Transcribe</span>
                </button>
                <button
                  type="button"
                  onClick={cancelRecording}
                  className="p-1.5 text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 rounded-lg hover:bg-rose-100/50 dark:hover:bg-rose-900/30 text-xs transition cursor-pointer"
                  title="Cancel Recording"
                  aria-label="Cancel recording"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : isTranscribing ? (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-200">
              <RefreshCw className="w-4 h-4 animate-spin text-amber-600 dark:text-amber-400" />
              <span className="font-medium">Transcribing…</span>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={startRecording}
                  disabled={memoryContract === 'STORE_ONLY'}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition cursor-pointer ${
                    memoryContract === 'STORE_ONLY'
                      ? 'bg-stone-100 dark:bg-stone-800 text-stone-400 dark:text-stone-500 border-stone-200 dark:border-stone-800 cursor-not-allowed opacity-60'
                      : 'bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700'
                  }`}
                  title={
                    memoryContract === 'STORE_ONLY'
                      ? 'Voice transcription is disabled under Store Only contract'
                      : 'Record a voice reflection'
                  }
                  id="btn-start-voice"
                >
                  <Mic className="w-3.5 h-3.5 text-rose-500" />
                  <span>Voice Note</span>
                </button>

                {/* Emoji Picker Button */}
                <div className="relative">
                  <button
                    type="button"
                    id="btn-toggle-emoji"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition cursor-pointer ${
                      showEmojiPicker
                        ? 'bg-amber-100/80 border-amber-300 text-stone-900 font-semibold'
                        : 'bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700'
                    }`}
                    title="Insert emoji"
                  >
                    <Smile className="w-3.5 h-3.5 text-amber-600" />
                    <span>Emoji</span>
                  </button>

                  {showEmojiPicker && (
                    <div className="absolute left-0 mt-2 z-30">
                      <EmojiPicker
                        isOpen={showEmojiPicker}
                        onSelectEmoji={handleInsertEmoji}
                        onClose={() => setShowEmojiPicker(false)}
                      />
                    </div>
                  )}
                </div>

                {isVoice && (
                  <span className="text-[11px] text-stone-400 font-mono flex items-center gap-1">
                    <Mic className="w-3 h-3 text-emerald-500" />
                    <span>Voice Transcribed</span>
                  </span>
                )}
              </div>

              {/* Location Selector Button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowLocationPopover(!showLocationPopover)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition cursor-pointer ${
                    location
                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 text-amber-900 dark:text-amber-200'
                      : 'bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700'
                  }`}
                  id="btn-toggle-location"
                >
                  <MapPin className={`w-3.5 h-3.5 ${location ? 'text-amber-600' : 'text-stone-400'}`} />
                  <span>{location?.placeName || 'Add Location'}</span>
                  {location && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLocation(undefined);
                        setLocationConnection(null);
                      }}
                      className="ml-1 hover:text-rose-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </button>

                {/* Location Popover */}
                {showLocationPopover && (
                  <div className="absolute right-0 mt-2 w-72 p-3 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl shadow-lg z-20 space-y-3">
                    <div className="flex items-center justify-between pb-1 border-b border-stone-100 dark:border-stone-800">
                      <span className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                        Memory Location
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowLocationPopover(false)}
                        className="text-stone-400 hover:text-stone-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <input
                      type="text"
                      value={placeNameInput}
                      autoComplete="off"
                      data-lpignore="true"
                      onChange={(e) => handlePlaceInputChange(e.target.value)}
                      placeholder="e.g. Kyoto Garden, Home Office, SF"
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-transparent text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />

                    {/* Error display */}
                    {locationError && (
                      <div className="p-2 rounded-lg bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-[11px] text-amber-900 dark:text-amber-200 flex items-start gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                        <span className="leading-snug">{locationError}</span>
                      </div>
                    )}

                    {/* Places Autocomplete Predictions */}
                    {placePredictions.length > 0 && (
                      <div className="max-h-36 overflow-y-auto rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 shadow-xs divide-y divide-stone-100 dark:divide-stone-800">
                        {placePredictions.map((pred) => (
                          <button
                            key={pred.placeId}
                            type="button"
                            onClick={() => handleSelectPrediction(pred)}
                            className="w-full text-left px-2.5 py-1.5 hover:bg-amber-50 dark:hover:bg-stone-800 text-[11px] text-stone-700 dark:text-stone-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <MapPin className="w-3 h-3 text-amber-600 shrink-0" />
                            <span className="truncate">{pred.description}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Detected Location Candidates (from fresh GPS reverse-geocoding) */}
                    {locationCandidates.length > 0 && (
                      <div className="space-y-1 pt-1">
                        <span className="text-[10px] font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider block">
                          Detected Location Options:
                        </span>
                        <div className="flex flex-col gap-1 max-h-32 overflow-y-auto pr-0.5">
                          {locationCandidates.map((cand, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setPlaceNameInput(cand);
                                setLocation((prev) => ({
                                  ...prev,
                                  placeName: cand,
                                }));
                              }}
                              className={`text-left px-2.5 py-1 rounded-lg text-xs transition cursor-pointer flex items-center justify-between gap-1.5 ${
                                placeNameInput === cand
                                  ? 'bg-amber-100/90 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 font-medium'
                                  : 'bg-stone-50 dark:bg-stone-800/60 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                              }`}
                            >
                              <span className="truncate">{cand}</span>
                              {placeNameInput === cand && <Check className="w-3 h-3 text-amber-700 dark:text-amber-400 shrink-0" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleDetectLocation}
                        disabled={isDetectingLocation}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
                        id="btn-detect-location"
                      >
                        <Navigation className={`w-3 h-3 ${isDetectingLocation ? 'animate-spin' : ''}`} />
                        <span>{isDetectingLocation ? 'Locating...' : 'Use Current Location'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const trimmed = placeNameInput.trim();
                          if (trimmed) {
                            setLocation((prev) => ({
                              ...prev,
                              placeName: trimmed,
                            }));
                          }
                          setShowLocationPopover(false);
                        }}
                        className="px-3 py-1 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-xs font-medium rounded-lg cursor-pointer"
                        title="Save custom label without requiring GPS coordinates"
                        id="btn-save-location-label"
                      >
                        Save Custom Label
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {voiceNotice && (
            <div className="mt-2.5 p-2.5 rounded-lg bg-stone-100 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700/80 flex items-center justify-between gap-2 text-xs text-stone-700 dark:text-stone-300">
              <span className="leading-relaxed">{voiceNotice}</span>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setVoiceNotice(null)}
                  className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-0.5 cursor-pointer"
                  title="Dismiss"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* "You Were Here Before" Connection Notice */}
          {locationConnection && (
            <div className="mt-3 p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 flex items-start justify-between gap-3 text-xs text-amber-900 dark:text-amber-200">
              <div className="space-y-0.5">
                <span className="font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>You Were Here Before:</span>
                </span>
                <p className="leading-relaxed">{locationConnection.reflection}</p>
              </div>
              {locationConnection.receipt && onOpenReceipt && (
                <button
                  type="button"
                  onClick={() => onOpenReceipt(locationConnection.receipt)}
                  className="text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 font-medium shrink-0 flex items-center gap-1 text-[11px]"
                >
                  <Eye className="w-3 h-3" />
                  <span>Receipt</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Content Area with dynamic autogrow */}
        <textarea
          ref={contentTextareaRef}
          id="textarea-entry-content"
          value={content}
          onFocus={() => {
            lastFocusedFieldRef.current = 'content';
          }}
          onChange={(e) => setContent(e.target.value)}
          placeholder={getLensPlaceholder(lens)}
          className="w-full font-serif text-base sm:text-lg leading-relaxed text-stone-800 dark:text-stone-200 placeholder:text-stone-400 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white/70 dark:bg-stone-900/60 p-5 shadow-xs focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 min-h-[220px] sm:min-h-[240px] max-h-[560px] resize-y overflow-y-auto transition-[border-color,box-shadow]"
        />

        {/* Mood & Tags Toolbar */}
        <div className="pt-4 border-t border-[#f0ebe3] flex flex-wrap items-center justify-between gap-4">
          {/* Mood Selector */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-stone-400 mr-1 font-medium">Mood:</span>
            {moods.map((m) => (
              <button
                key={m.id}
                onClick={() => setMood(m.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all flex items-center gap-1 ${
                  mood === m.id
                    ? 'bg-amber-100/70 border-amber-300 text-stone-900 font-semibold'
                    : 'bg-white border-stone-200 text-stone-500 hover:bg-stone-50'
                }`}
              >
                <span>{m.emoji}</span>
                <span className="hidden sm:inline">{m.label}</span>
              </button>
            ))}
          </div>

          {/* Tags Chips & Input */}
          <div className="flex items-center flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-stone-100 border border-stone-200 text-xs font-medium text-stone-700"
              >
                #{tag}
                <button onClick={() => handleRemoveTag(tag)} className="hover:text-stone-950">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}

            {tags.length < 10 && (
              <div className="inline-flex items-center gap-1 bg-[#faf8f5] border border-stone-200 rounded-full px-2.5 py-0.5">
                <TagIcon className="w-3 h-3 text-stone-400 shrink-0" />
                <input
                  type="text"
                  value={tagInput}
                  autoComplete="off"
                  data-lpignore="true"
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  placeholder="Add tag + Enter"
                  className="text-xs bg-transparent border-none focus:outline-none w-32 sm:w-36 min-w-[120px] text-stone-700 placeholder:text-stone-400"
                />
              </div>
            )}
          </div>
        </div>

        {/* Bottom Configuration Toolbar: Memory Contract, Reflect With & Action Buttons */}
        <div className="mt-6 p-3 sm:p-5 rounded-2xl bg-[#faf7f2] border border-[#e8e2d8] shadow-2xs space-y-4 w-full max-w-full overflow-hidden box-border">
          {/* Tier 1: Perspective & Privacy Scope Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full min-w-0">
            {/* Reflect with selector */}
            <div className="flex flex-col gap-1 w-full min-w-0 overflow-hidden">
              <label htmlFor="select-active-lens" className="text-[11px] font-semibold uppercase tracking-wider text-stone-600 block truncate">
                Reflect with:
              </label>
              <select
                id="select-active-lens"
                value={lens}
                onChange={(e) => setLens(e.target.value as ReflectionLens)}
                className="w-full max-w-full min-w-0 bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-stone-800 shadow-2xs focus:outline-none focus:ring-1 focus:ring-amber-800 cursor-pointer truncate box-border"
              >
                {preferences.enabledLenses.map((l) => (
                  <option key={l} value={l}>
                    {l === 'PERSONAL' && 'Personal Lens'}
                    {l === 'PROFESSIONAL' && 'Professional Lens'}
                    {l === 'WOMEN_AND_LIFE' && 'Women & Life Lens'}
                    {l === 'IDENTITY_AND_GROWTH' && 'Identity & Growth Lens'}
                  </option>
                ))}
              </select>
            </div>

            {/* Memory Contract Selector */}
            <div className="flex flex-col gap-1 w-full min-w-0 overflow-hidden relative">
              <div className="flex items-center justify-between gap-1">
                <label htmlFor="select-memory-contract" className="text-[11px] font-semibold uppercase tracking-wider text-stone-600 truncate">
                  Memory Scope:
                </label>
                <button
                  type="button"
                  onClick={() => setShowContractInfo(!showContractInfo)}
                  className="text-stone-400 hover:text-stone-700 p-0.5 rounded-full shrink-0"
                  title="What is Memory Scope?"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
              </div>

              <select
                id="select-memory-contract"
                value={memoryContract}
                onChange={(e) => setMemoryContract(e.target.value as MemoryContract)}
                className="w-full max-w-full min-w-0 bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-stone-800 shadow-2xs focus:outline-none focus:ring-1 focus:ring-amber-800 cursor-pointer truncate box-border"
              >
                <option value="STORE_ONLY">Private only (No AI)</option>
                <option value="PAGE_ONLY">One-time reflection only</option>
                <option value="MAY_CONNECT">Connect with memories (Recommended)</option>
                <option value="IMPORTANT_MEMORY">Core memory</option>
              </select>

              {showContractInfo && (
                <div className="absolute bottom-full left-0 sm:left-auto right-0 mb-2 w-72 max-w-[calc(100vw-2.5rem)] p-3 bg-stone-900 text-stone-100 text-xs rounded-xl shadow-lg z-30 font-sans border border-stone-700">
                  <div className="font-semibold mb-1 text-amber-300">
                    {contractExplanations[memoryContract].title}
                  </div>
                  <div className="text-stone-300 text-[11px] leading-relaxed">
                    {contractExplanations[memoryContract].desc}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowContractInfo(false)}
                    className="mt-2 text-[10px] text-stone-400 underline block"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Word count & draft status bar */}
          <div className="flex items-center justify-between text-[11px] text-stone-500 font-sans">
            <span>{content.trim() ? `${content.trim().split(/\s+/).length} words written` : 'Draft empty'}</span>
            <span className="text-[10px] text-stone-400">{content.trim() ? 'Draft saved in memory' : 'Ready to write'}</span>
          </div>

          {/* Win Saved Confirmation Notice */}
          {winSavedNotice && (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-2 text-xs text-emerald-800 font-medium animate-fadeIn">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{winSavedNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setWinSavedNotice(null)}
                className="text-stone-400 hover:text-stone-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Subtle Divider */}
          <div className="border-t border-[#e8e2d8]" />

          {/* Tier 2: Action Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-0.5">
            {entry.id ? (
              <button
                id="btn-delete-entry"
                onClick={() => onDelete(entry.id!)}
                title="Delete this moment"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-stone-500 hover:text-red-700 hover:bg-red-50 rounded-xl border border-stone-200 hover:border-red-200 text-xs font-medium transition-colors cursor-pointer w-full sm:w-auto"
              >
                <Trash2 className="w-3.5 h-3.5 text-stone-400" />
                <span>Delete</span>
              </button>
            ) : (
              <div className="hidden sm:block" />
            )}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <button
                id="btn-add-to-wins"
                type="button"
                onClick={handleOpenWinModal}
                disabled={!content.trim() || isDraftingWin}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:py-2 rounded-xl bg-indigo-50/80 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 text-xs font-semibold disabled:opacity-50 transition-all shadow-2xs cursor-pointer w-full sm:w-auto"
                title="Extract or review a Career Win from this moment"
              >
                <Trophy className={`w-3.5 h-3.5 text-indigo-600 ${isDraftingWin ? 'animate-spin' : ''}`} />
                <span>{isDraftingWin ? 'Drafting Win...' : 'Add to Wins Vault'}</span>
              </button>

              <button
                id="btn-save-moment"
                onClick={handleSaveClick}
                disabled={isSaving || !content.trim()}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 rounded-xl bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800 disabled:opacity-50 transition-all shadow-xs cursor-pointer w-full sm:w-auto"
              >
                <Save className={`w-3.5 h-3.5 ${isSaving ? 'animate-spin' : ''}`} />
                <span>{isSaving ? 'Saving...' : 'Save This Moment'}</span>
              </button>

              {memoryContract !== 'STORE_ONLY' && (
                <button
                  id="btn-trigger-reflect"
                  onClick={handleReflectClick}
                  disabled={isReflecting || !content.trim()}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 rounded-xl bg-amber-900 text-amber-50 text-xs font-semibold hover:bg-amber-800 disabled:opacity-50 transition-all shadow-xs cursor-pointer w-full sm:w-auto"
                >
                  <Sparkles className={`w-3.5 h-3.5 text-amber-300 ${isReflecting ? 'animate-spin' : ''}`} />
                  <span>{isReflecting ? 'Reflecting...' : 'Reflect with Gemini'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Review Career Win Modal */}
      {showWinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between bg-stone-50/50 dark:bg-stone-900/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 flex items-center justify-center">
                  <Trophy className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif text-base font-semibold text-stone-900 dark:text-stone-100">
                    Review Career Win
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Verify and polish before preserving to your private Wins Vault
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowWinModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmWin} className="p-5 space-y-4 overflow-y-auto">
              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-900 flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  AI proposals are tentative drafts. Review the title and details to ensure accomplishments and impact reflect your authentic experience.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Win Title *
                </label>
                <input
                  type="text"
                  required
                  autoComplete="off"
                  data-lpignore="true"
                  value={winFormData.title}
                  onChange={(e) => setWinFormData({ ...winFormData, title: e.target.value })}
                  placeholder="e.g., Led architecture review for real-time indexing"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Impact & Achievement Summary
                </label>
                <textarea
                  rows={3}
                  value={winFormData.description}
                  onChange={(e) => setWinFormData({ ...winFormData, description: e.target.value })}
                  placeholder="What was the challenge, what did you do, and what was the meaningful outcome?"
                  className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Personal Notes / Context (Optional)
                </label>
                <textarea
                  rows={2}
                  value={winFormData.userNotes}
                  onChange={(e) => setWinFormData({ ...winFormData, userNotes: e.target.value })}
                  placeholder="Any private reminders or lessons learned..."
                  className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="text-[11px] text-stone-500 flex items-center gap-1.5 pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-stone-400" />
                <span>
                  {entry.id ? `Provenanced to journal moment: "${title || 'Current Moment'}"` : 'Will be saved with your current moment'}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
                <button
                  type="button"
                  onClick={() => setShowWinModal(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingWin || !winFormData.title.trim()}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold disabled:opacity-50 flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Check className={`w-3.5 h-3.5 ${isSavingWin ? 'animate-spin' : ''}`} />
                  <span>{isSavingWin ? 'Saving to Vault...' : 'Confirm & Save to Vault'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
