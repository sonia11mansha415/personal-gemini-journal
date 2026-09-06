/**
 * Automated Security & Phase 3 Test Suite
 * Tests Authentication, Cryptographic User Isolation, Memory Contracts,
 * Phase 3 Feature Endpoints, Abuse Guards, and Lens Sovereignty.
 */

import { spawn, ChildProcess } from 'child_process';
import http from 'http';
import { sanitizeFirestoreData, sanitizeEntryLocation } from '../src/utils/firestoreSanitizer.ts';
import { cleanReflectionProse, parseGeminiReflectionOutput, deduplicateMessages } from '../src/utils/reflectionSanitizer.ts';

const TEST_PORT = 3848;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

let serverProcess: ChildProcess | null = null;

// Helper to make HTTP requests
async function request(
  path: string,
  options: {
    method?: string;
    token?: string | null;
    body?: any;
  } = {}
): Promise<{ status: number; data: any; text: string; headers: http.IncomingHttpHeaders }> {

  const method = options.method || 'GET';
  const headers: Record<string, string> = {};

  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  } else if (options.token === null) {
    // Explicitly send null or omit
  }

  let bodyStr: string | undefined;
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    bodyStr = JSON.stringify(options.body);
    headers['Content-Length'] = Buffer.byteLength(bodyStr).toString();
  }

  return new Promise((resolve, reject) => {
    const req = http.request(
      `${BASE_URL}${path}`,
      { method, headers },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          let data: any = raw;
          try {
            data = JSON.parse(raw);
          } catch {
            // retain raw string
          }
          resolve({ status: res.statusCode || 0, data, text: raw, headers: res.headers });
        });

      }
    );
    req.on('error', reject);
    if (bodyStr) {
      req.write(bodyStr);
    }
    req.end();
  });
}

// Polling helper to wait for server readiness
async function waitForServer(retries = 30, interval = 500): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await request('/api/health');
      if (res.status === 200 && res.data?.status === 'ok') {
        return;
      }
    } catch {
      // wait and retry
    }
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error(`Server failed to start on port ${TEST_PORT} after ${retries * interval}ms`);
}

// Test runner state
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ ${testName}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
  }
}

async function runTests() {
  console.log('Starting Personal Gemini Journal in-process test server...');
  process.env.PORT = String(TEST_PORT);
  process.env.NODE_ENV = 'test';
  process.env.ALLOW_TEST_AUTH = 'true';
  process.env.DISABLE_HMR = 'true';

  await import('../server.ts');

  try {
    await waitForServer();
    console.log(`Test server is ready at ${BASE_URL}\n`);

    // =========================================================================
    // 1. HEALTH & METADATA TESTS
    // =========================================================================
    console.log('--- 1. Health & Challenge Label Tests ---');
    {
      const res = await request('/api/health');
      assert(res.status === 200, 'GET /api/health returns 200 OK');
      assert(res.data?.status === 'ok', 'Health status is "ok"');
      assert(
        res.data?.cloudRunChallengeLabel === 'dev-tutorial=cloud-run-ai-challenge',
        'Health response includes required Cloud Run challenge label'
      );
    }

    // =========================================================================
    // 2. AUTHENTICATION MIDDLEWARE TESTS
    // =========================================================================
    console.log('\n--- 2. Authentication Tests ---');
    {
      // Missing auth header
      const noAuth = await request('/api/journal/entries');
      assert(noAuth.status === 401, 'Request without Authorization header is rejected (401)');

      // Malformed auth header (no Bearer)
      const badHeader = await new Promise<any>((resolve) => {
        const req = http.request(`${BASE_URL}/api/journal/entries`, { headers: { Authorization: 'Basic xyz' } }, (res) => {
          resolve({ status: res.statusCode });
        });
        req.end();
      });
      assert(badHeader.status === 401, 'Request with non-Bearer Authorization header is rejected (401)');

      // Invalid token (not 3-part JWT and not test token)
      const badToken = await request('/api/journal/entries', { token: 'invalid_dummy_token' });
      assert(badToken.status === 401, 'Malformed token string is rejected (401)');

      // Test auth hook accepts test-token-<uid> in test environment
      const testAuthA = await request('/api/journal/entries', { token: 'test-token-user_alpha' });
      assert(testAuthA.status === 200, 'Test token test-token-user_alpha succeeds (200)');
    }

    // =========================================================================
    // 3. CRYPTOGRAPHIC USER ISOLATION TESTS (User A vs User B)
    // =========================================================================
    console.log('\n--- 3. Cryptographic User Isolation Tests ---');
    const userA = 'test-token-isolated_user_A';
    const userB = 'test-token-isolated_user_B';

    let entryAId = '';
    {
      // User A creates an entry
      const createRes = await request('/api/journal/entries', {
        method: 'POST',
        token: userA,
        body: {
          title: 'Secret Plans for Alpha Project',
          content: 'This contains confidential reflections that only User A should see.',
          lens: 'PROFESSIONAL',
          memoryContract: 'MAY_CONNECT',
        },
      });
      assert(createRes.status === 201, 'User A creates private entry (201 Created)');
      entryAId = createRes.data?.entry?.id;
      assert(Boolean(entryAId), 'User A entry has a generated ID');

      // User A sees their own entry
      const listA = await request('/api/journal/entries', { token: userA });
      const foundInA = (listA.data?.entries || []).some((e: any) => e.id === entryAId);
      assert(foundInA, 'User A can view their created entry in their own collection');

      // User B lists their entries - MUST NOT see User A's entry
      const listB = await request('/api/journal/entries', { token: userB });
      const foundInB = (listB.data?.entries || []).some((e: any) => e.id === entryAId);
      assert(!foundInB, 'User B CANNOT see User A entry in their collection (Owner-Bound Isolation)');

      // User B attempts to overwrite User A's entry via ID spoofing
      const updateAttempt = await request(`/api/journal/entries/${entryAId}`, {
        method: 'PUT',
        token: userB,
        body: {
          title: 'Hacked by User B',
          content: 'Attempting to overwrite User A data.',
        },
      });
      // In a properly isolated system, User B's update either doesn't find User A's entry or writes only to User B's scope
      // Check that User A's entry was completely unaffected:
      const verifyA = await request('/api/journal/entries', { token: userA });
      const entryAfter = (verifyA.data?.entries || []).find((e: any) => e.id === entryAId);
      assert(
        entryAfter?.title === 'Secret Plans for Alpha Project',
        'User A entry content was NOT modified by User B attempt'
      );
    }

    // =========================================================================
    // 4. MEMORY CONTRACT PRIVACY TESTS
    // =========================================================================
    console.log('\n--- 4. Memory Contract Privacy Tests ---');
    {
      // Create STORE_ONLY entry
      const storeOnlyRes = await request('/api/journal/entries', {
        method: 'POST',
        token: userA,
        body: {
          title: 'Deeply Private Note',
          content: 'This note must NEVER be analyzed by AI or processed for embeddings.',
          lens: 'PERSONAL',
          memoryContract: 'STORE_ONLY',
        },
      });
      assert(storeOnlyRes.status === 201, 'STORE_ONLY entry created successfully');
      const storeOnlyId = storeOnlyRes.data?.entry?.id;

      // Tone analysis on STORE_ONLY entry MUST return 403
      const toneRes = await request(`/api/journal/entries/${storeOnlyId}/tone`, {
        method: 'POST',
        token: userA,
        body: {
          content: 'This note must NEVER be analyzed by AI.',
          memoryContract: 'STORE_ONLY',
        },
      });
      assert(toneRes.status === 403, 'Tone observation on STORE_ONLY returns 403 Forbidden');
      assert(
        toneRes.data?.error?.includes('STORE_ONLY entries must not be analyzed by AI'),
        'Tone 403 error clearly states STORE_ONLY restriction'
      );

      // Location connection on STORE_ONLY must return null
      const locRes = await request('/api/journal/location/connection', {
        method: 'POST',
        token: userA,
        body: {
          entryId: storeOnlyId,
          location: { latitude: 37.7749, longitude: -122.4194, placeName: 'San Francisco' },
          memoryContract: 'STORE_ONLY',
        },
      });
      assert(locRes.status === 403, 'Location connection call rejects STORE_ONLY entry with 403 Forbidden');
      assert(locRes.data?.connection === null, 'STORE_ONLY entry is excluded from location connections (returns null)');
    }

    // =========================================================================
    // 5. PHASE 3: CAREER WINS CRUD & ISOLATION TESTS
    // =========================================================================
    console.log('\n--- 5. Phase 3: Career Wins CRUD & Isolation ---');
    let winId = '';
    {
      // User A creates a Career Win
      const createWin = await request('/api/journal/wins', {
        method: 'POST',
        token: userA,
        body: {
          title: 'Delivered GenAI Academy Capstone',
          description: 'Architected and validated full production personal journal with Gemini 3.',
          date: '2026-09-05',
          confirmed: true,
          userNotes: 'Earned Google Cloud GenAI badge.',
        },
      });
      assert(createWin.status === 201, 'Create Career Win returns 201 Created');
      winId = createWin.data?.win?.id;
      assert(Boolean(winId), 'Career Win has valid ID');
      assert(createWin.data?.win?.confirmed === true, 'Career Win marked confirmed');

      // User A lists wins
      const listWinsA = await request('/api/journal/wins', { token: userA });
      const foundWinA = (listWinsA.data?.wins || []).some((w: any) => w.id === winId);
      assert(foundWinA, 'User A can view their created Career Win');

      // User B lists wins - MUST NOT see User A's win
      const listWinsB = await request('/api/journal/wins', { token: userB });
      const foundWinB = (listWinsB.data?.wins || []).some((w: any) => w.id === winId);
      assert(!foundWinB, 'User B CANNOT see User A Career Win (Owner Isolation)');

      // User A updates their win
      const updateWin = await request(`/api/journal/wins/${winId}`, {
        method: 'PATCH',
        token: userA,
        body: {
          userNotes: 'Updated note: Awarded top project recognition.',
        },
      });
      assert(updateWin.status === 200, 'Update Career Win returns 200 OK');
      assert(
        updateWin.data?.win?.userNotes === 'Updated note: Awarded top project recognition.',
        'Career Win note was updated'
      );

      // User A deletes their win
      const deleteWin = await request(`/api/journal/wins/${winId}`, {
        method: 'DELETE',
        token: userA,
      });
      assert(deleteWin.status === 200, 'Delete Career Win returns 200 OK');

      // Confirm win is gone
      const verifyWinList = await request('/api/journal/wins', { token: userA });
      const stillExists = (verifyWinList.data?.wins || []).some((w: any) => w.id === winId);
      assert(!stillExists, 'Deleted Career Win is no longer returned in wins list');
    }

    // =========================================================================
    // 6. PHASE 3: INSIGHTS SUMMARY & POSITIVE NON-SHAMING STREAKS
    // =========================================================================
    console.log('\n--- 6. Phase 3: Insights Summary & Non-Shaming Streaks ---');
    {
      const insightsRes = await request('/api/journal/insights/summary', { token: userA });
      assert(insightsRes.status === 200, 'GET /api/journal/insights/summary returns 200 OK');
      assert(insightsRes.data?.streak !== undefined, 'Summary includes streak object');
      assert(
        typeof insightsRes.data?.streak?.encouragingMessage === 'string',
        'Summary provides encouraging streak message'
      );
      // Verify encouraging message has NO shaming/guilt words
      const msg = (insightsRes.data?.streak?.encouragingMessage || '').toLowerCase();
      assert(
        !msg.includes('lost') && !msg.includes('broken') && !msg.includes('failed') && !msg.includes('shame'),
        'Streak message contains zero guilt, loss, or shame vocabulary'
      );
      assert(typeof insightsRes.data?.moodCounts === 'object', 'Summary includes moodCounts distribution');
      assert(Array.isArray(insightsRes.data?.topThemes), 'Summary includes topThemes array');
    }

    // =========================================================================
    // 7. PHASE 3: WEEKLY REFLECTION ("WRAP UP MY WEEK")
    // =========================================================================
    console.log('\n--- 7. Phase 3: Weekly Reflection ---');
    {
      // Request with fresh user with 0 entries -> returns sparse: true without error
      const userSparse = 'test-token-sparse_user';
      const sparseRes = await request('/api/journal/weekly-reflection', {
        method: 'POST',
        token: userSparse,
        body: {},
      });
      assert(sparseRes.status === 200, 'POST /api/journal/weekly-reflection returns 200');
      assert(sparseRes.data?.sparse === true, 'Under-populated history returns sparse: true gracefully');

      // GET /api/journal/weekly-reflections
      const listReflections = await request('/api/journal/weekly-reflections', { token: userA });
      assert(listReflections.status === 200, 'GET /api/journal/weekly-reflections returns 200 OK');
      assert(Array.isArray(listReflections.data?.reflections), 'Weekly reflections returned as array');
    }

    // =========================================================================
    // 8. PHASE 3: VOICE TRANSCRIPTION VALIDATION & GUARDS
    // =========================================================================
    console.log('\n--- 8. Phase 3: Voice Transcription Abuse & Format Guards ---');
    {
      // Missing audio data
      const missingAudio = await request('/api/journal/voice-transcribe', {
        method: 'POST',
        token: userA,
        body: { mimeType: 'audio/webm' },
      });
      assert(missingAudio.status === 400, 'Missing audioBase64 returns 400 Bad Request');

      // Unsupported MIME type
      const badMime = await request('/api/journal/voice-transcribe', {
        method: 'POST',
        token: userA,
        body: { audioBase64: 'AAAA', mimeType: 'application/x-executable' },
      });
      assert(badMime.status === 400, 'Unsupported MIME type returns 400 Bad Request');

      // Oversized payload (> 14,000,000 chars)
      const hugeString = 'A'.repeat(14_000_001);
      const hugeAudio = await request('/api/journal/voice-transcribe', {
        method: 'POST',
        token: userA,
        body: { audioBase64: hugeString, mimeType: 'audio/webm' },
      });
      assert(hugeAudio.status === 400, 'Oversized audio payload (> 10MB limit) is rejected with 400');
    }

    // =========================================================================
    // 9. USER PREFERENCES & OPT-IN LENSES
    // =========================================================================
    console.log('\n--- 9. User Profile Preferences & Lens Controls ---');
    {
      const freshUserToken = `test-token-fresh_user_${Date.now()}`;
      const profileRes = await request('/api/user/profile', { token: freshUserToken });
      assert(profileRes.status === 200, 'GET /api/user/profile returns 200 OK');
      const prefs = profileRes.data?.preferences;
      assert(Boolean(prefs), 'Default preferences generated for new user');
      // WOMEN_AND_LIFE must NOT be enabled by default (mandatory opt-in)
      assert(
        !prefs?.enabledLenses?.includes('WOMEN_AND_LIFE'),
        'Women & Life Lens is strictly opt-in (NOT in enabledLenses by default)'
      );
      assert(prefs?.defaultLens === 'PERSONAL', 'Default lens is PERSONAL');

      // User explicitly opts into Women & Life
      const updatePrefs = await request('/api/user/profile', {
        method: 'PATCH',
        token: freshUserToken,
        body: {
          preferences: {
            enabledLenses: ['PERSONAL', 'PROFESSIONAL', 'IDENTITY_AND_GROWTH', 'WOMEN_AND_LIFE'],
            defaultLens: 'PERSONAL',
          },
        },
      });
      assert(updatePrefs.status === 200, 'PATCH /api/user/profile returns 200 OK');
      assert(
        updatePrefs.data?.preferences?.enabledLenses?.includes('WOMEN_AND_LIFE'),
        'User can explicitly opt into Women & Life Lens'
      );
    }

    // =========================================================================
    // 10. LIVING MEMORY OVERVIEW TEST
    // =========================================================================
    console.log('\n--- 10. Living Memory Overview ---');
    {
      const lmRes = await request('/api/journal/living-memory', { token: userA });
      assert(lmRes.status === 200, 'GET /api/journal/living-memory returns 200 OK');
      assert(Array.isArray(lmRes.data?.overview?.lifeThreads), 'Overview includes lifeThreads array');
      assert(Array.isArray(lmRes.data?.overview?.unfinishedLoops), 'Overview includes unfinishedLoops array');
      assert(Array.isArray(lmRes.data?.overview?.aiMemories), 'Overview includes aiMemories array');
      assert(Array.isArray(lmRes.data?.overview?.thenNowComparisons), 'Overview includes thenNowComparisons array');
    }

    // =========================================================================
    // 11. FIRESTORE SANITIZATION & LOCATION LIFECYCLE TESTS (FLOWS A, B, C, D)
    // =========================================================================
    console.log('\n--- 11. Firestore Data Sanitization & Location Lifecycle (Flows A, B, C, D) ---');
    {
      // 11.1 Unit Test: sanitizeFirestoreData Helper
      const testSentinel = { _methodName: 'deleteField' };
      const rawInput = {
        title: 'Valid Title',
        undefProp: undefined,
        zeroVal: 0,
        falseVal: false,
        emptyStr: '',
        nullVal: null,
        sentinelVal: testSentinel,
        nested: {
          innerUndef: undefined,
          innerValid: 'present',
        },
        arr: ['item1', undefined, 0, false, { deepUndef: undefined, deepOk: 42 }],
      };

      const cleaned = sanitizeFirestoreData(rawInput);
      assert(!('undefProp' in cleaned), 'Sanitizer removes top-level undefined properties');
      assert(cleaned.zeroVal === 0, 'Sanitizer preserves number 0');
      assert(cleaned.falseVal === false, 'Sanitizer preserves boolean false');
      assert(cleaned.emptyStr === '', 'Sanitizer preserves empty string ""');
      assert(cleaned.nullVal === null, 'Sanitizer preserves null');
      assert(!('innerUndef' in cleaned.nested), 'Sanitizer removes nested undefined properties');
      assert(cleaned.nested.innerValid === 'present', 'Sanitizer preserves nested valid properties');
      assert(cleaned.sentinelVal._methodName === 'deleteField', 'Sanitizer preserves FieldValue sentinels');
      assert(Array.isArray(cleaned.arr) && cleaned.arr.length === 4, 'Sanitizer filters undefined elements from arrays');
      assert(!('deepUndef' in (cleaned.arr[3] as any)), 'Sanitizer removes undefined inside array object items');
      assert((cleaned.arr[3] as any).deepOk === 42, 'Sanitizer preserves valid values inside array object items');

      // 11.2 Unit Test: sanitizeEntryLocation Helper
      assert(sanitizeEntryLocation(undefined) === undefined, 'sanitizeEntryLocation(undefined) returns undefined');
      assert(sanitizeEntryLocation(null) === undefined, 'sanitizeEntryLocation(null) returns undefined');
      assert(sanitizeEntryLocation({}) === undefined, 'sanitizeEntryLocation({}) returns undefined');
      assert(sanitizeEntryLocation({ placeName: '' }) === undefined, 'sanitizeEntryLocation with empty string returns undefined');
      const cleanLocOnlyName = sanitizeEntryLocation({ placeName: 'Kyoto, Japan' });
      assert(cleanLocOnlyName?.placeName === 'Kyoto, Japan', 'sanitizeEntryLocation preserves valid placeName');
      assert(!('latitude' in cleanLocOnlyName), 'sanitizeEntryLocation omits undefined latitude');
      const cleanLocWithCoords = sanitizeEntryLocation({ placeName: 'Paris', latitude: 48.8566, longitude: 2.3522 });
      assert(cleanLocWithCoords?.latitude === 48.8566 && cleanLocWithCoords?.longitude === 2.3522, 'sanitizeEntryLocation parses and keeps numeric coordinates');

      // 11.3 Flow A: Entry WITHOUT location
      // Create entry: title + text, Thoughtful mood, Personal Lens, MAY_CONNECT
      const flowAUser = `test-token-flowA_${Date.now()}`;
      const entryNoLocRes = await request('/api/journal/entries', {
        method: 'POST',
        token: flowAUser,
        body: {
          title: 'Thoughtful Twilight',
          content: 'A quiet evening walking home, contemplating next steps in life.',
          mood: 'Thoughtful',
          lens: 'PERSONAL',
          memoryContract: 'MAY_CONNECT',
        },
      });
      assert(entryNoLocRes.status === 201, 'Flow A: Save This Moment without location returns 201 Created');
      const savedEntryA = entryNoLocRes.data?.entry;
      assert(Boolean(savedEntryA?.id), 'Flow A: Entry received generated id');
      assert(!('location' in savedEntryA), 'Flow A: location field is strictly OMITTED from entry without location');
      assert(savedEntryA?.mood === 'Thoughtful', 'Flow A: Mood "Thoughtful" saved correctly');
      assert(savedEntryA?.lens === 'PERSONAL', 'Flow A: Lens "PERSONAL" saved correctly');

      // Flow A: Reflect with Gemini on entry without location (MUST NOT throw Firestore undefined error)
      const reflectNoLocRes = await request('/api/journal/reflect', {
        method: 'POST',
        token: flowAUser,
        body: {
          entryId: savedEntryA.id,
          entryTitle: savedEntryA.title,
          entryContent: savedEntryA.content,
          lens: savedEntryA.lens,
          memoryContract: savedEntryA.memoryContract,
        },
      });
      assert(
        reflectNoLocRes.status === 200 || reflectNoLocRes.status === 429,
        `Flow A: Reflect with Gemini on entry without location succeeds without Firestore error (status: ${reflectNoLocRes.status})`
      );
      if (reflectNoLocRes.status === 200) {
        assert(Boolean(reflectNoLocRes.data?.assistantMessage), 'Flow A: Reflection assistant message received');
      }

      // 11.4 Flow B: Entry WITH valid location
      const flowBUser = `test-token-flowB_${Date.now()}`;
      const entryWithLocRes = await request('/api/journal/entries', {
        method: 'POST',
        token: flowBUser,
        body: {
          title: 'Harbor Breeze',
          content: 'Watching the boats arrive at the marina.',
          mood: 'peaceful',
          lens: 'PERSONAL',
          memoryContract: 'MAY_CONNECT',
          location: {
            placeName: 'Sydney Harbor',
            latitude: -33.8568,
            longitude: 151.2153,
          },
        },
      });
      assert(entryWithLocRes.status === 201, 'Flow B: Save entry with location returns 201 Created');
      const savedEntryB = entryWithLocRes.data?.entry;
      assert(savedEntryB?.location?.placeName === 'Sydney Harbor', 'Flow B: Place name saved');
      assert(savedEntryB?.location?.latitude === -33.8568, 'Flow B: Latitude saved');
      assert(savedEntryB?.location?.longitude === 151.2153, 'Flow B: Longitude saved');

      // Flow B: Reload and verify persistence
      const listBRes = await request('/api/journal/entries', { token: flowBUser });
      assert(listBRes.status === 200, 'Flow B: List entries returns 200');
      const reloadedB = (listBRes.data?.entries || []).find((e: any) => e.id === savedEntryB.id);
      assert(Boolean(reloadedB?.location), 'Flow B: Location persists across reload');
      assert(reloadedB?.location?.placeName === 'Sydney Harbor', 'Flow B: Reloaded place name matches');
      assert(reloadedB?.location?.latitude === -33.8568, 'Flow B: Reloaded coordinates match');

      // Flow B: Reflect with Gemini on entry with location
      const reflectWithLocRes = await request('/api/journal/reflect', {
        method: 'POST',
        token: flowBUser,
        body: {
          entryId: savedEntryB.id,
          entryTitle: savedEntryB.title,
          entryContent: savedEntryB.content,
          lens: savedEntryB.lens,
          memoryContract: savedEntryB.memoryContract,
        },
      });
      assert(
        reflectWithLocRes.status === 200 || reflectWithLocRes.status === 429,
        `Flow B: Reflect with Gemini on entry with location succeeds (status: ${reflectWithLocRes.status})`
      );

      // 11.5 Flow C: Add location, then REMOVE location
      // Update entry B to REMOVE location (pass location: null)
      const removeLocRes = await request(`/api/journal/entries/${savedEntryB.id}`, {
        method: 'PUT',
        token: flowBUser,
        body: {
          content: 'Watching the boats arrive at the marina. Location removed.',
          location: null,
        },
      });
      assert(removeLocRes.status === 200, 'Flow C: PUT entry to remove location returns 200 OK');
      const updatedEntryB = removeLocRes.data?.entry;
      assert(!('location' in updatedEntryB), 'Flow C: location field is removed from updated entry');

      // Flow C: Reload entry and verify removed location does not reappear
      const listAfterRemove = await request('/api/journal/entries', { token: flowBUser });
      const reloadedAfterRemove = (listAfterRemove.data?.entries || []).find((e: any) => e.id === savedEntryB.id);
      assert(!('location' in reloadedAfterRemove), 'Flow C: Removed location does not reappear upon reload');

      // Flow C: Reflect again after location removed (MUST NOT throw undefined Firestore error)
      const reflectAfterRemoveRes = await request('/api/journal/reflect', {
        method: 'POST',
        token: flowBUser,
        body: {
          entryId: savedEntryB.id,
          entryTitle: reloadedAfterRemove.title,
          entryContent: reloadedAfterRemove.content,
          lens: reloadedAfterRemove.lens,
          memoryContract: reloadedAfterRemove.memoryContract,
        },
      });
      assert(
        reflectAfterRemoveRes.status === 200 || reflectAfterRemoveRes.status === 429,
        `Flow C: Reflect after location removed succeeds without Firestore error (status: ${reflectAfterRemoveRes.status})`
      );

      // 11.6 Flow D: Reload and Persistence Integrity Verification
      const listAllFinal = await request('/api/journal/entries', { token: flowBUser });
      for (const entry of listAllFinal.data?.entries || []) {
        for (const [k, v] of Object.entries(entry)) {
          assert(v !== undefined, `Flow D: Entry ${entry.id} field "${k}" must never be undefined in persistence store`);
        }
      }
    }

    // =========================================================================
    // 12. REFLECTION COMPANION CONTRACT, METADATA SEPARATION & CHAT PERSISTENCE
    // =========================================================================
    console.log('\n--- 12. Reflection Contract, Metadata Separation & Optimistic UI Tests ---');
    {
      // 12.1 Unit Test: cleanReflectionProse sanitization
      const leakedGarbage = '", "suggestedLens": "PROFESSIONAL",\n"suggestedLensReason": "Confidence boost",\n"candidateCareerWin": null';
      const cleanedGarbage = cleanReflectionProse(leakedGarbage);
      assert(!cleanedGarbage.includes('suggestedLens'), 'cleanReflectionProse strips suggestedLens keyword');
      assert(!cleanedGarbage.includes('candidateCareerWin'), 'cleanReflectionProse strips candidateCareerWin keyword');
      assert(!cleanedGarbage.includes('{') && !cleanedGarbage.includes('}'), 'cleanReflectionProse strips curly braces');
      assert(!cleanedGarbage.includes('":'), 'cleanReflectionProse strips JSON key-value delimiters');
      assert(cleanedGarbage.length > 10, 'cleanReflectionProse provides a warm human fallback for pure garbage');

      const fencedJson = '```json\n{\n  "reflection": "You navigated that conversation with quiet grace.",\n  "suggestedLens": null\n}\n```';
      const cleanedFenced = cleanReflectionProse(fencedJson);
      assert(cleanedFenced === 'You navigated that conversation with quiet grace.', 'cleanReflectionProse extracts clean prose from fenced JSON');
      assert(!cleanedFenced.includes('```'), 'cleanReflectionProse removes code fence backticks');

      // 12.2 Unit Test: parseGeminiReflectionOutput strict contract separation
      const structuredMock = JSON.stringify({
        reflection: 'Reflecting on your leadership during the product launch shows true growth.',
        suggestedLens: 'PROFESSIONAL',
        suggestedLensReason: 'Exploring this through the professional lens highlights team alignment.',
        candidateCareerWin: {
          title: 'Product Launch Leadership',
          summary: 'Led cross-functional team through complex delivery milestone.',
        },
        citedSourceEntryIds: ['entry_alpha', 'entry_beta'],
      });

      const parsedPersonal = parseGeminiReflectionOutput(structuredMock, 'PERSONAL');
      assert(parsedPersonal.reflection === 'Reflecting on your leadership during the product launch shows true growth.', 'Parser extracts pure prose for reflection');
      assert(!parsedPersonal.reflection.includes('suggestedLens'), 'Reflection text contains zero suggestedLens metadata');
      assert(!parsedPersonal.reflection.includes('{'), 'Reflection text contains zero curly braces');
      assert(parsedPersonal.suggestedLens === 'PROFESSIONAL', 'Parser separates suggestedLens into metadata');
      assert(parsedPersonal.suggestedLensReason === 'Exploring this through the professional lens highlights team alignment.', 'Parser separates suggestedLensReason into metadata');
      assert(parsedPersonal.candidateCareerWin?.title === 'Product Launch Leadership', 'Parser separates candidateCareerWin into metadata');
      assert(parsedPersonal.citedSourceEntryIds.length === 2, 'Parser keeps cited source entry IDs');

      // 12.3 Unit Test: When suggested lens equals current lens, it must normalize to null
      const parsedSameLens = parseGeminiReflectionOutput(structuredMock, 'PROFESSIONAL');
      assert(parsedSameLens.suggestedLens === null, 'Suggested lens is normalized to null when it equals active lens');

      // 12.4 Unit Test: When suggested lens is null, it remains null
      const nullLensMock = JSON.stringify({
        reflection: 'A peaceful evening walk with family.',
        suggestedLens: null,
        suggestedLensReason: null,
        candidateCareerWin: null,
        citedSourceEntryIds: [],
      });
      const parsedNull = parseGeminiReflectionOutput(nullLensMock, 'PERSONAL');
      assert(parsedNull.suggestedLens === null, 'suggestedLens: null is cleanly preserved');
      assert(parsedNull.suggestedLensReason === null, 'suggestedLensReason: null is cleanly preserved');

      // 12.5 Unit Test: deduplicateMessages prevents optimistic retry duplicates
      const sampleMessages = [
        { id: 'user_1', role: 'user' as const, text: 'First thought', lens: 'PERSONAL' as const, createdAt: '2026-09-05T20:00:00Z' },
        { id: 'asst_1', role: 'assistant' as const, text: 'Gentle reflection', lens: 'PERSONAL' as const, createdAt: '2026-09-05T20:00:02Z' },
        { id: 'user_2', role: 'user' as const, text: 'okay fine', lens: 'PERSONAL' as const, createdAt: '2026-09-05T20:01:00Z' },
        // Duplicate from retry
        { id: 'user_2', role: 'user' as const, text: 'okay fine', lens: 'PERSONAL' as const, createdAt: '2026-09-05T20:01:00Z' },
        { id: 'asst_2', role: 'assistant' as const, text: 'Second reflection', lens: 'PERSONAL' as const, createdAt: '2026-09-05T20:01:05Z' },
      ];
      const deduped = deduplicateMessages(sampleMessages);
      assert(deduped.length === 4, 'deduplicateMessages eliminates duplicate messages');
      assert(deduped[2].id === 'user_2' && deduped[2].text === 'okay fine', 'deduplicateMessages preserves user message order');

      // 12.6 Integration Test: Live /api/journal/reflect returns pure prose without JSON leaks
      const testUser = `test-token-reflect_clean_${Date.now()}`;
      const entryRes = await request('/api/journal/entries', {
        method: 'POST',
        token: testUser,
        body: {
          title: 'Quarterly Executive Review',
          content: 'Prepared executive slides and delivered presentation to directors on Q3 performance. Received positive feedback on clarity.',
          lens: 'PERSONAL',
          memoryContract: 'MAY_CONNECT',
        },
      });
      assert(entryRes.status === 201, 'Entry for reflection clean test created');
      const entryId = entryRes.data?.entry?.id;

      const reflectRes = await request('/api/journal/reflect', {
        method: 'POST',
        token: testUser,
        body: {
          entryId,
          entryTitle: 'Quarterly Executive Review',
          entryContent: 'Prepared executive slides and delivered presentation to directors on Q3 performance. Received positive feedback on clarity.',
          lens: 'PERSONAL',
          memoryContract: 'MAY_CONNECT',
        },
      });

      assert(
        reflectRes.status === 200 || reflectRes.status === 429,
        `Reflection route returned valid status (status: ${reflectRes.status})`
      );

      if (reflectRes.status === 200) {
        const text = reflectRes.data?.reflection || reflectRes.data?.assistantMessage?.text || '';
        assert(!text.includes('suggestedLens'), 'Live reflection contains zero instances of "suggestedLens"');
        assert(!text.includes('suggestedLensReason'), 'Live reflection contains zero instances of "suggestedLensReason"');
        assert(!text.includes('candidateCareerWin'), 'Live reflection contains zero instances of "candidateCareerWin"');
        assert(!text.includes('citedSourceEntryIds'), 'Live reflection contains zero instances of "citedSourceEntryIds"');
        assert(!text.includes('{') && !text.includes('}'), 'Live reflection contains zero curly braces');
        assert(Boolean(text.trim()), 'Live reflection text is non-empty natural prose');
      }

      // 12.7 Integration Test: Optimistic User Message Retry Deduplication
      const optUserMsgId = `msg_user_opt_${Date.now()}`;
      // Send user prompt once
      await request('/api/journal/reflect', {
        method: 'POST',
        token: testUser,
        body: {
          entryId,
          entryTitle: 'Quarterly Executive Review',
          entryContent: 'Prepared executive slides and delivered presentation to directors on Q3 performance.',
          lens: 'PERSONAL',
          memoryContract: 'MAY_CONNECT',
          userPrompt: 'okay fine',
          userMessageId: optUserMsgId,
        },
      });

      // Simulate a retry with identical prompt and ID
      await request('/api/journal/reflect', {
        method: 'POST',
        token: testUser,
        body: {
          entryId,
          entryTitle: 'Quarterly Executive Review',
          entryContent: 'Prepared executive slides and delivered presentation to directors on Q3 performance.',
          lens: 'PERSONAL',
          memoryContract: 'MAY_CONNECT',
          userPrompt: 'okay fine',
          userMessageId: optUserMsgId,
        },
      });

      // Fetch entry and verify user message appears exactly once
      const listEntriesRes = await request('/api/journal/entries', { token: testUser });
      const currentEntry = (listEntriesRes.data?.entries || []).find((e: any) => e.id === entryId);
      const matches = (currentEntry?.messages || []).filter((m: any) => m.id === optUserMsgId || (m.role === 'user' && m.text === 'okay fine'));
      assert(matches.length === 1, 'Optimistic user message is not duplicated on retry (count === 1)');
    }

    // =========================================================================
    // 13. PHASE 4: DATA SOVEREIGNTY, EXPORT, CASCADE DELETION, EMAIL & REMINDERS
    // =========================================================================
    console.log('\n--- 13. Phase 4: Data Sovereignty, Export, Cascade Deletion, Email & Reminders ---');

    const userP4A = 'test-token-user_phase4_alice';
    const userP4B = 'test-token-user_phase4_bob';

    // 13.1 Setup test entries for User A and User B
    const createA1 = await request('/api/journal/entries', {
      method: 'POST',
      token: userP4A,
      body: {
        title: 'Alice Private Morning Reflection',
        content: 'I woke up early and spent 20 minutes enjoying a warm cup of tea in quiet peace.',
        lens: 'PERSONAL',
        memoryContract: 'MAY_CONNECT',
        mood: 'peaceful',
      },
    });
    assert(createA1.status === 201, 'Phase 4: Alice entry created (201)');
    const aliceEntryId = createA1.data?.entry?.id;

    // Add assistant turn to Alice entry
    await request('/api/journal/reflect', {
      method: 'POST',
      token: userP4A,
      body: {
        entryId: aliceEntryId,
        entryTitle: 'Alice Private Morning Reflection',
        entryContent: 'I woke up early and spent 20 minutes enjoying a warm cup of tea in quiet peace.',
        lens: 'PERSONAL',
        memoryContract: 'MAY_CONNECT',
        userPrompt: 'This was a rare quiet morning.',
      },
    });

    // Create a Career Win for Alice
    const createAWin = await request('/api/journal/wins', {
      method: 'POST',
      token: userP4A,
      body: {
        title: 'Architected Privacy Layer',
        description: 'Successfully deployed cryptographic user isolation across all subcollections.',
        confirmed: true,
      },
    });
    assert(createAWin.status === 201, 'Phase 4: Alice career win created (201)');

    // Create entry for Bob
    const createB1 = await request('/api/journal/entries', {
      method: 'POST',
      token: userP4B,
      body: {
        title: 'Bob Confidential Notes',
        content: 'Secret project notes that Alice must never be able to export or observe.',
        lens: 'PROFESSIONAL',
        memoryContract: 'STORE_ONLY',
      },
    });
    assert(createB1.status === 201, 'Phase 4: Bob entry created (201)');

    // 13.2 Own-Data Export PASS & Cryptographic UID Enforcement
    const exportJsonRes = await request('/api/journal/export?format=json', { token: userP4A });
    assert(exportJsonRes.status === 200, 'Phase 4: Alice export JSON returns 200 OK');
    assert(exportJsonRes.data?.userId === 'user_phase4_alice', 'Phase 4: Export userId matches verified token UID');
    assert(Array.isArray(exportJsonRes.data?.entries), 'Phase 4: Export contains entries array');
    assert(exportJsonRes.data?.entries.length >= 1, 'Phase 4: Alice own entries included in export');
    assert(exportJsonRes.data?.wins.length >= 1, 'Phase 4: Alice own career wins included in export');

    // 13.3 Cross-User Export Isolation DENIAL
    const allExportedTitles = (exportJsonRes.data?.entries || []).map((e: any) => e.title);
    assert(
      !allExportedTitles.includes('Bob Confidential Notes'),
      'Phase 4 Cross-User Security: Alice export NEVER includes Bob confidential entries'
    );

    // Verify arbitrary query param userId cannot hijack authorization
    const hijackedExportRes = await request('/api/journal/export?format=json&userId=user_phase4_bob', { token: userP4A });
    assert(hijackedExportRes.data?.userId === 'user_phase4_alice', 'Phase 4 Security: Arbitrary userId parameter is strictly ignored');

    // 13.4 JSON Export Integrity (No secrets, no raw vectors, proper metadata)
    const exportedAliceEntry = exportJsonRes.data?.entries?.find((e: any) => e.id === aliceEntryId);
    assert(Boolean(exportedAliceEntry), 'Phase 4: Alice entry found in export payload');
    assert(!('vector' in exportedAliceEntry), 'Phase 4 Integrity: Raw vector embedding strictly omitted from export');
    assert(!('embedding' in exportedAliceEntry), 'Phase 4 Integrity: Raw embedding field omitted from export');
    assert(!('token' in exportedAliceEntry), 'Phase 4 Integrity: Auth tokens strictly omitted from export');
    assert(exportedAliceEntry.memoryContract === 'MAY_CONNECT', 'Phase 4 Integrity: Memory contract metadata preserved');

    // 13.5 Markdown Export Integrity & Speaker Delineation
    const exportMdRes = await request('/api/journal/export?format=markdown', { token: userP4A });
    assert(exportMdRes.status === 200, 'Phase 4: Markdown export returns 200 OK');
    const mdBody = exportMdRes.text || '';
    assert(mdBody.includes('# Personal Journal Export'), 'Phase 4: Markdown export contains header');
    assert(mdBody.includes('### [User Author]'), 'Phase 4: Markdown export explicitly identifies [User Author]');
    assert(mdBody.includes('Alice Private Morning Reflection'), 'Phase 4: Markdown export includes entry title');
    assert(!mdBody.includes('Bob Confidential Notes'), 'Phase 4: Markdown export strictly excludes other users');

    // 13.6 Weekly Email Opt-in & Contract Safety
    // Ensure initial state has weeklyEmailEnabled: false
    await request('/api/user/profile', {
      method: 'PATCH',
      token: userP4A,
      body: {
        preferences: {
          weeklyEmailEnabled: false,
          gentleRemindersEnabled: false,
        },
      },
    });

    // Test Opt-In Enforcement: When not enabled and not preview, rejected
    const emailNotOptedRes = await request('/api/journal/weekly-email/send', {
      method: 'POST',
      token: userP4A,
      body: { preview: false },
    });
    assert(emailNotOptedRes.status === 400, 'Phase 4 Email: Disabled weekly email without preview is rejected (400)');


    // Test Preview / Opt-In Dispatch
    const emailPreviewRes = await request('/api/journal/weekly-email/send', {
      method: 'POST',
      token: userP4A,
      body: { preview: true },
    });
    assert(emailPreviewRes.status === 200, 'Phase 4 Email: Preview/opt-in dispatch succeeds (200)');
    assert(emailPreviewRes.data?.success === true, 'Phase 4 Email: Success flag is true');
    assert(Boolean(emailPreviewRes.data?.subject), 'Phase 4 Email: Email subject is present');

    // Update preferences to opt in
    const patchProfileRes = await request('/api/user/profile', {
      method: 'PATCH',
      token: userP4A,
      body: {
        preferences: {
          weeklyEmailEnabled: true,
          weeklyEmailDay: 'SUNDAY',
          gentleRemindersEnabled: true,
          reminderTime: '20:00',
        },
      },
    });
    assert(patchProfileRes.status === 200, 'Phase 4: Profile updated with email and reminder preferences');

    // 13.7 Gentle Journaling Reminders (Zero guilt or streak-shaming language)
    const reminderRes = await request('/api/user/reminder-preview', { token: userP4A });
    assert(reminderRes.status === 200, 'Phase 4 Reminders: Reminder preview returns 200 OK');
    assert(reminderRes.data?.enabled === true, 'Phase 4 Reminders: Enabled status matches preference');
    const reminderBody = (reminderRes.data?.body || '').toLowerCase();
    const forbiddenShameWords = ['broke', 'broken', 'missed', 'failed', 'penalty', 'guilt', 'streak lost'];
    for (const shameWord of forbiddenShameWords) {
      assert(!reminderBody.includes(shameWord), `Phase 4 Reminders: Body must not contain guilt word "${shameWord}"`);
    }

    // 13.8 Complete Cascade Data Sovereignty Deletion
    // Attempt without confirmation: Must be rejected
    const deleteNoConfirmRes = await request('/api/journal/data', {
      method: 'DELETE',
      token: userP4A,
      body: {},
    });
    assert(deleteNoConfirmRes.status === 400, 'Phase 4 Deletion: Deletion without exact confirmation is rejected (400)');

    // Attempt with incorrect confirmation: Must be rejected
    const deleteWrongConfirmRes = await request('/api/journal/data', {
      method: 'DELETE',
      token: userP4A,
      body: { confirmation: 'delete' },
    });
    assert(deleteWrongConfirmRes.status === 400, 'Phase 4 Deletion: Deletion with wrong confirmation text is rejected (400)');

    // Legitimate Delete with explicit confirmation
    const deleteSuccessRes = await request('/api/journal/data', {
      method: 'DELETE',
      token: userP4A,
      body: { confirmation: 'DELETE MY JOURNAL' },
    });
    assert(deleteSuccessRes.status === 200, 'Phase 4 Deletion: Explicit deletion returns 200 OK');
    assert(deleteSuccessRes.data?.success === true, 'Phase 4 Deletion: Success flag is true');

    // Verify Complete Cascade & Absence of Ghost Memories
    const listAfterDelete = await request('/api/journal/entries', { token: userP4A });
    assert(listAfterDelete.data?.entries?.length === 0, 'Phase 4 Zero Ghost Memories: Entries completely purged (count === 0)');

    const winsAfterDelete = await request('/api/journal/wins', { token: userP4A });
    assert(winsAfterDelete.data?.wins?.length === 0, 'Phase 4 Zero Ghost Memories: Career wins completely purged (count === 0)');

    const weeklyAfterDelete = await request('/api/journal/weekly-reflections', { token: userP4A });
    assert(weeklyAfterDelete.data?.reflections?.length === 0, 'Phase 4 Zero Ghost Memories: Weekly reflections purged (count === 0)');

    // Verify Bob's data remains completely untouched (Owner Isolation preserved through deletion)
    const bobEntriesAfterAliceDelete = await request('/api/journal/entries', { token: userP4B });
    assert(bobEntriesAfterAliceDelete.data?.entries?.length >= 1, 'Phase 4 Owner Isolation: Bob data intact after Alice deletion');

    // =========================================================================
    // 14. FINAL PRE-DEPLOYMENT SECURITY, PRIVACY & HARDENING TESTS
    // =========================================================================
    console.log('\n--- 14. Final Pre-Deployment Security, Isolation & Hardening Tests ---');

    // 14.1 Server Bundle & Sensitive Source Asset Exposure Prevention
    const bundleRes = await request('/server.cjs');
    assert(bundleRes.status === 404, 'Pre-Deployment: GET /server.cjs is blocked and returns 404 Not Found');

    const sourceMapRes = await request('/server.cjs.map');
    assert(sourceMapRes.status === 404, 'Pre-Deployment: GET /server.cjs.map is blocked and returns 404 Not Found');

    const serverSourceRes = await request('/server.ts');
    assert(serverSourceRes.status === 404, 'Pre-Deployment: GET /server.ts is blocked and returns 404 Not Found');

    const envRes = await request('/.env');
    assert(envRes.status === 404, 'Pre-Deployment: GET /.env is blocked and returns 404 Not Found');

    const envProdRes = await request('/.env.production');
    assert(envProdRes.status === 404, 'Pre-Deployment: GET /.env.production is blocked and returns 404 Not Found');

    // 14.2 Security Headers & Anti-Caching Controls
    const healthHeaderRes = await request('/api/health');
    assert(healthHeaderRes.headers['x-content-type-options'] === 'nosniff', 'Pre-Deployment: X-Content-Type-Options is nosniff');
    assert(healthHeaderRes.headers['x-powered-by'] === undefined, 'Pre-Deployment: X-Powered-By is omitted');

    const userPredeploy = 'test-token-user_predeploy_alice';

    const apiCacheRes = await request('/api/journal/entries', { token: userPredeploy });
    const cacheControl = (apiCacheRes.headers['cache-control'] as string) || '';
    assert(cacheControl.includes('no-store') && cacheControl.includes('private'), 'Pre-Deployment: API Cache-Control prohibits shared caching');

    // 14.3 Tiered Body Parser Limits (250kb cap on general API routes)
    const largeGeneralPayload = {
      content: 'A'.repeat(300 * 1024), // 300kb > 250kb limit
    };
    const oversizeGeneralRes = await request('/api/journal/reflect', {
      method: 'POST',
      token: userPredeploy,
      body: largeGeneralPayload,
    });
    assert(oversizeGeneralRes.status === 413, 'Pre-Deployment: Oversized payload (>250KB) on reflect endpoint is rejected with 413');

    // 14.4 Authoritative Memory Contract Enforcement: Voice Note Under STORE_ONLY
    const voiceStoreOnlyRes = await request('/api/journal/voice-transcribe', {
      method: 'POST',
      token: userPredeploy,
      body: {
        audioBase64: 'UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=',
        mimeType: 'audio/webm',
        memoryContract: 'STORE_ONLY',
      },
    });
    assert(voiceStoreOnlyRes.status === 403, 'Pre-Deployment: Voice transcription with STORE_ONLY contract is rejected with 403 Forbidden');

    // Unsaved draft without entryId is rejected with 400 to prevent unverified Gemini processing (Finding 5)
    const voiceUnsavedRes = await request('/api/journal/voice-transcribe', {
      method: 'POST',
      token: userPredeploy,
      body: {
        audioBase64: 'UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=',
        mimeType: 'audio/webm',
        memoryContract: 'MAY_CONNECT',
      },
    });
    assert(voiceUnsavedRes.status === 400, 'Pre-Deployment: Unsaved voice transcription without entryId is rejected with 400 Bad Request');

    // Voice-First Flow: isNewVoiceEntry with STORE_ONLY must be strictly rejected with 403 Forbidden
    const voiceNewStoreOnlyRes = await request('/api/journal/voice-transcribe', {
      method: 'POST',
      token: userPredeploy,
      body: {
        audioBase64: 'UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=',
        mimeType: 'audio/webm',
        memoryContract: 'STORE_ONLY',
        isNewVoiceEntry: true,
      },
    });
    assert(voiceNewStoreOnlyRes.status === 403, 'Voice-First: New voice transcription with STORE_ONLY contract is rejected with 403 Forbidden');

    // Voice-First Flow: Silent audio must return speechDetected: false and leave no temporary drafts in entries
    const userVoiceTest = `test-token-user_voice_test_${Date.now()}`;
    const voiceSilentRes = await request('/api/journal/voice-transcribe', {
      method: 'POST',
      token: userVoiceTest,
      body: {
        audioBase64: 'UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=',
        mimeType: 'audio/webm',
        memoryContract: 'MAY_CONNECT',
        isNewVoiceEntry: true,
      },
    });
    assert(voiceSilentRes.status === 200, 'Voice-First: Silent audio endpoint returns 200 without throwing');
    assert(voiceSilentRes.data?.speechDetected === false, 'Voice-First: Silent audio produces speechDetected: false');
    assert(!voiceSilentRes.data?.transcript, 'Voice-First: Silent audio produces empty transcript');

    const entriesAfterSilent = await request('/api/journal/entries', {
      method: 'GET',
      token: userVoiceTest,
    });
    const tempEntries = (entriesAfterSilent.data?.entries || []).filter(
      (e: any) => e.isTemporary === true || (e.id && e.id.startsWith('temp_voice_'))
    );
    assert(tempEntries.length === 0, 'Voice-First: No temporary voice drafts remain after silence detection');

    // 14.5 Location Connection Contract Enforcement
    // First create an entry with STORE_ONLY
    const storeOnlyEntryRes = await request('/api/journal/entries', {
      method: 'POST',
      token: userPredeploy,
      body: {
        title: 'Secret Sanctuary',
        content: 'Personal private thoughts.',
        lens: 'PERSONAL',
        memoryContract: 'STORE_ONLY',
        location: { latitude: 35.6895, longitude: 139.6917, placeName: 'Tokyo' },
      },
    });
    assert(storeOnlyEntryRes.status === 201, 'Pre-Deployment: STORE_ONLY entry created for contract test');
    const storeOnlyId = storeOnlyEntryRes.data?.entry?.id || storeOnlyEntryRes.data?.id;

    // Voice transcription referencing stored STORE_ONLY entry must be rejected with 403 (Finding 5)
    const voiceStoredStoreOnlyRes = await request('/api/journal/voice-transcribe', {
      method: 'POST',
      token: userPredeploy,
      body: {
        entryId: storeOnlyId,
        audioBase64: 'UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=',
        mimeType: 'audio/webm',
      },
    });
    assert(voiceStoredStoreOnlyRes.status === 403, 'Pre-Deployment: Voice transcription on stored STORE_ONLY entry is rejected with 403 Forbidden');

    // Attempt location connection on STORE_ONLY entry: must fail with 403
    const storeOnlyLocationConnRes = await request('/api/journal/location/connection', {
      method: 'POST',
      token: userPredeploy,
      body: {
        entryId: storeOnlyId,
        location: { latitude: 35.6895, longitude: 139.6917 },
      },
    });
    assert(storeOnlyLocationConnRes.status === 403, 'Pre-Deployment: Location connection on STORE_ONLY entry is rejected with 403 Forbidden');

    // Attempt tone analysis on STORE_ONLY entry: must fail with 403
    const storeOnlyToneRes = await request(`/api/journal/entries/${storeOnlyId}/tone`, {
      token: userPredeploy,
    });
    assert(storeOnlyToneRes.status === 403, 'Pre-Deployment: Tone analysis on STORE_ONLY entry is rejected with 403 Forbidden');

    // Server-Authoritative Verification: Client passes forged MAY_CONNECT in body for reflect,
    // but stored entry in Firestore is STORE_ONLY. Server MUST verify Firestore and reject with 403!
    const forgedReflectRes = await request('/api/journal/reflect', {
      method: 'POST',
      token: userPredeploy,
      body: {
        entryId: storeOnlyId,
        entryTitle: 'Secret Sanctuary',
        entryContent: 'Personal private thoughts.',
        lens: 'PERSONAL',
        memoryContract: 'MAY_CONNECT', // Client attempt to spoof/override
        messages: [],
      },
    });
    assert(forgedReflectRes.status === 403, 'Pre-Deployment: Reflection on stored STORE_ONLY entry is rejected with 403 (cannot spoof memoryContract)');

    // 14.6 Cascade Message Subcollection Cleanup on Single Entry Deletion
    const cascadeEntryRes = await request('/api/journal/entries', {
      method: 'POST',
      token: userPredeploy,
      body: {
        title: 'Cascade Entry',
        content: 'Testing subcollection deletion cascade.',
        lens: 'PERSONAL',
        memoryContract: 'MAY_CONNECT',
      },
    });
    assert(cascadeEntryRes.status === 201, 'Pre-Deployment: Entry created for cascade deletion test');
    const cascadeEntryId = cascadeEntryRes.data?.entry?.id || cascadeEntryRes.data?.id;

    // Delete single entry via DELETE /api/journal/entries/:id
    const deleteSingleEntryRes = await request(`/api/journal/entries/${cascadeEntryId}`, {
      method: 'DELETE',
      token: userPredeploy,
    });
    assert(deleteSingleEntryRes.status === 200, 'Pre-Deployment: DELETE /api/journal/entries/:id succeeds with 200 OK');

    // Verify entry no longer exists
    const checkDeletedEntry = await request(`/api/journal/entries/${cascadeEntryId}`, {
      token: userPredeploy,
    });
    assert(checkDeletedEntry.status === 404, 'Pre-Deployment: Deleted entry returns 404 Not Found');


  } finally {
    console.log('\n========================================');
    console.log(`Test Results: ${passedTests}/${totalTests} passed (${failedTests} failed)`);
    console.log('========================================\n');

    process.exit(failedTests > 0 ? 1 : 0);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
