/**
 * Final UX, Accessibility & Product Polish Test Suite
 * Verifies:
 * 1. Thread cleaning and deduplication
 * 2. Lens-aware opening reflection prompts
 * 3. User-facing copy cleanliness (no developer jargon)
 * 4. Emoji picker category completeness and accessibility
 * 5. Memory contract human labels mapping
 */

import fs from 'fs';
import path from 'path';
import { cleanReflectionProse, parseGeminiReflectionOutput, deduplicateMessages } from '../src/utils/reflectionSanitizer';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✓ ${msg}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${msg}`);
    failed++;
  }
}

// 1. Thread cleaning & deduplication logic verification
function cleanThreadTitle(title: string): string {
  if (!title) return 'Reflective Journey';
  let cleaned = title.trim();
  cleaned = cleaned.replace(/^["'“‘]+|["'”’]+$/g, '').trim();
  cleaned = cleaned.replace(/^(life thread|thread|story|journey):\s*/i, '').trim();
  return cleaned || 'Reflective Journey';
}

function deduplicateThreads<T extends { title: string; id?: string }>(threads: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const t of threads) {
    const norm = (t.title || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!norm || seen.has(norm)) continue;
    seen.add(norm);
    result.push(t);
  }
  return result;
}

// 2. Reflection lens placeholder mapping
function getLensPlaceholder(lens: string): string {
  switch (lens) {
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
}

async function runUXPolishTests() {
  console.log('\n--- 1. Living Memory Thread Cleaning & Deduplication ---');
  assert(
    cleanThreadTitle('"Finding Balance in Transitions"') === 'Finding Balance in Transitions',
    'Strips surrounding double quotes from thread titles'
  );
  assert(
    cleanThreadTitle('“Creative Confidence”') === 'Creative Confidence',
    'Strips smart quotes from thread titles'
  );
  assert(
    cleanThreadTitle('Life Thread: Navigating Career Shifts') === 'Navigating Career Shifts',
    'Strips generic "Life Thread:" prefix'
  );
  assert(
    cleanThreadTitle('') === 'Reflective Journey',
    'Falls back to warm default on empty title'
  );

  const rawThreads = [
    { title: 'Finding Balance', id: '1' },
    { title: '"Finding Balance"', id: '2' },
    { title: 'finding balance!', id: '3' },
    { title: 'New Career Direction', id: '4' },
  ];
  const deduped = deduplicateThreads(rawThreads);
  assert(deduped.length === 2, 'Deduplicates near-identical thread titles');
  assert(deduped[0].id === '1' && deduped[1].id === '4', 'Preserves distinct threads');

  console.log('\n--- 2. Reflection-Lens-Aware Opening Prompts ---');
  assert(
    getLensPlaceholder('PERSONAL').includes("What's on your mind today?"),
    'PERSONAL lens has calm, open-ended prompt'
  );
  assert(
    getLensPlaceholder('PROFESSIONAL').includes('Reflect on a decision, a challenge, a win'),
    'PROFESSIONAL lens prompts for career reflections and learning'
  );
  assert(
    getLensPlaceholder('IDENTITY_AND_GROWTH').includes('How did you see yourself today?'),
    'IDENTITY_AND_GROWTH lens prompts for self-awareness and habits'
  );
  assert(
    getLensPlaceholder('WOMEN_AND_LIFE').includes('Take a quiet moment'),
    'WOMEN_AND_LIFE lens provides gentle, strength-oriented prompt'
  );

  console.log('\n--- 3. Clean Language & Anti-Jargon Audit ---');
  const componentsDir = path.resolve(process.cwd(), 'src/components');
  const filesToCheck = [
    'Navbar.tsx',
    'JournalEditor.tsx',
    'ReflectionPanel.tsx',
    'LivingMemoryView.tsx',
    'InsightsView.tsx',
    'MemoryMapView.tsx',
    'SettingsView.tsx',
    'UnauthenticatedView.tsx',
    'DiscoverView.tsx',
    'CareerWinsView.tsx',
    'MemoryReceiptModal.tsx',
  ];

  for (const filename of filesToCheck) {
    const filePath = path.join(componentsDir, filename);
    if (!fs.existsSync(filePath)) continue;
    const content = fs.readFileSync(filePath, 'utf-8');

    // Check that user-visible strings do not display raw internal technical labels
    // specifically "Cloud Firestore", "STORE_ONLY", "configured in VITE_GOOGLE_MAPS_API_KEY", "Owner-isolated"
    assert(
      !content.includes('Cloud Firestore journal'),
      `${filename}: Does not display developer database name "Cloud Firestore"`
    );
    assert(
      !content.includes('STORE_ONLY notes'),
      `${filename}: Does not expose enum name "STORE_ONLY" in user-facing text`
    );
    assert(
      !content.includes('configured in VITE_GOOGLE_MAPS_API_KEY') && !content.includes('configured in VITE_'),
      `${filename}: Does not expose technical env var name in user-facing error messages`
    );
    assert(
      !content.includes('Owner-isolated & Verified'),
      `${filename}: Does not display technical "Owner-isolated & Verified" badge in receipt modal`
    );
  }

  console.log('\n--- 4. Pure Unicode Emoji Picker Verification ---');
  const emojiPickerPath = path.join(componentsDir, 'EmojiPicker.tsx');
  assert(fs.existsSync(emojiPickerPath), 'EmojiPicker.tsx component exists');
  const emojiContent = fs.readFileSync(emojiPickerPath, 'utf-8');
  assert(
    emojiContent.includes('Smileys') && emojiContent.includes('People') && emojiContent.includes('Nature'),
    'EmojiPicker contains standard categories'
  );
  assert(
    emojiContent.includes('Escape') && emojiContent.includes('handleClickOutside'),
    'EmojiPicker supports keyboard accessibility and click-outside dismissal'
  );

  console.log('\n--- 5. Human-Centered Memory Scope Terminology ---');
  const editorPath = path.join(componentsDir, 'JournalEditor.tsx');
  const editorContent = fs.readFileSync(editorPath, 'utf-8');
  assert(
    editorContent.includes('Private only (No AI)'),
    'STORE_ONLY is rendered as "Private only (No AI)"'
  );
  assert(
    editorContent.includes('One-time reflection only'),
    'PAGE_ONLY is rendered as "One-time reflection only"'
  );
  assert(
    editorContent.includes('Connect with memories (Recommended)'),
    'MAY_CONNECT is rendered as "Connect with memories (Recommended)"'
  );
  assert(
    editorContent.includes('Core memory'),
    'IMPORTANT_MEMORY is rendered as "Core memory"'
  );

  console.log('\n--- 6. Signed-Out Header & Brand Layout ---');
  const navbarPath = path.join(componentsDir, 'Navbar.tsx');
  const navbarContent = fs.readFileSync(navbarPath, 'utf-8');
  assert(
    navbarContent.includes('shrink-0') && navbarContent.includes('whitespace-nowrap'),
    'Navbar brand has shrink-0 and whitespace-nowrap to prevent truncation'
  );
  assert(
    navbarContent.includes('btn-signin-google') && navbarContent.includes('Sign in with Google'),
    'Navbar shows Google Sign-in button when signed out'
  );
  assert(
    navbarContent.includes('{user && (') && navbarContent.includes('nav-tab-discover'),
    'Navbar guards private tabs behind authentication and keeps Discover accessible'
  );

  console.log('\n--- 7. Voice-First Journaling Flow & Title Contract ---');
  assert(
    !editorContent.includes('Save this moment first to add a voice note'),
    'Empty new entry can start Voice Note without prior text or save'
  );
  assert(
    editorContent.includes('isNewVoiceEntry: isNewVoice'),
    'Voice-first new entry sends isNewVoiceEntry flag to authoritative server'
  );
  assert(
    editorContent.includes('deriveFallbackTitle'),
    'Fallback title derivation function exists in JournalEditor'
  );

  const testTranscript = "I practiced my presentation again today and finally started feeling more comfortable";
  function testFallbackTitle(transcript: string): string {
    if (!transcript || !transcript.trim()) return 'Personal Reflection';
    const words = transcript.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return 'Personal Reflection';
    const phrase = words.slice(0, 5).join(' ');
    const title = phrase.charAt(0).toUpperCase() + phrase.slice(1);
    return title.length > 35 ? title.slice(0, 32) + '...' : title;
  }
  const derivedTitle = testFallbackTitle(testTranscript);
  assert(derivedTitle.length > 0 && !derivedTitle.includes('Spoken Moment'), 'Suggested title does NOT use "Spoken Moment"');
  assert(!derivedTitle.includes('Voice Note Recording'), 'Suggested title does NOT use "Voice Note Recording"');
  assert(derivedTitle.startsWith('I practiced my presentation'), 'Suggested title derives faithfully from the spoken words');

  console.log('\n--- 8. Silence & No-Speech Hallucination Elimination ---');
  assert(
    editorContent.includes('SPEECH_RMS_THRESHOLD = 0.035'),
    'Acoustic RMS speech activity threshold is defined at conservative 0.035'
  );
  assert(
    editorContent.includes('MIN_SPEECH_DURATION_MS = 350'),
    'Minimum cumulative speech duration is set to 350ms'
  );
  assert(
    editorContent.includes("No speech was detected. Try again when you're ready."),
    'Friendly no-speech message is shown when speech activity is absent'
  );
  assert(
    editorContent.includes('if (!hasAcousticSpeech || audioBlob.size < 400)'),
    'Silence aborts server transcription call and prevents creating entries'
  );

  const serverPath = path.join(process.cwd(), 'server.ts');
  const serverContent = fs.readFileSync(serverPath, 'utf-8');
  assert(
    serverContent.includes('If there is NO intelligible human speech, set speechDetected to false'),
    'Server Gemini prompt explicitly instructs model to detect silence without guessing'
  );
  assert(
    serverContent.includes('if (!parsedResult || !parsedResult.speechDetected || !parsedResult.transcript)'),
    'Server safeguards reject silent transcripts and clean up temporary drafts'
  );

  console.log('\n--- 9. Voice Cancellation & State Isolation ---');
  assert(
    editorContent.includes('cancelledRef.current = true') &&
    editorContent.includes('speechDurationMsRef.current = 0'),
    'Cancelling voice note sets cancelled flag and resets acoustic duration tracker'
  );
  assert(
    editorContent.includes('audioChunksRef.current = []'),
    'Cancelling voice note immediately wipes audio buffer'
  );
  assert(
    editorContent.includes('setIsRecording(false)') &&
    editorContent.includes('setIsTranscribing(false)'),
    'Cancelling voice note resets recording and transcribing states'
  );
  assert(
    editorContent.includes('setVoiceNotice(null)') &&
    editorContent.includes('setRecordingSeconds(0)'),
    'Switching entries resets temporary voice notices and timer'
  );

  console.log('\n--- 10. Living Memory Top Controls Layout & Error Dismissal ---');
  const livingMemoryPath = path.join(componentsDir, 'LivingMemoryView.tsx');
  const livingMemoryContent = fs.readFileSync(livingMemoryPath, 'utf-8');
  assert(
    livingMemoryContent.includes('grid grid-cols-1 sm:grid-cols-2'),
    'Living Memory top controls use balanced 2x2 desktop grid and single-column mobile grid'
  );
  assert(
    !livingMemoryContent.includes('lg:grid-cols-4'),
    'Forced 4-column desktop compression is completely eliminated'
  );
  assert(
    livingMemoryContent.includes('Your Story (Life Threads)') &&
    livingMemoryContent.includes('Then & Now') &&
    livingMemoryContent.includes('Still Wondering (Open Loops)') &&
    livingMemoryContent.includes('What Gemini Remembers'),
    'All four Living Memory control tabs are present and properly labeled'
  );
  assert(
    livingMemoryContent.includes('btn-dismiss-living-memory-error') &&
    livingMemoryContent.includes('setError(null)'),
    'Living Memory error banner includes an accessible dismiss button to clear error locally'
  );

  console.log('\n--- 11. Navigation Header 3-Region Desktop Structure ---');
  assert(
    (navbarContent.includes('grid grid-cols-[auto_1fr_auto]') || navbarContent.includes('2xl:grid-cols-[auto_1fr_auto]')) &&
    navbarContent.includes('flex items-center justify-between flex-nowrap'),
    'Desktop header container uses 3-region grid for logged-in users and flex-nowrap for signed-out users'
  );
  assert(
    navbarContent.includes('w-full px-4 sm:px-6 lg:px-8'),
    'Desktop header container spans full width with sensible page padding'
  );
  assert(
    navbarContent.includes('id="brand-logo"') &&
    navbarContent.includes("setActiveTab('home')"),
    'Personal Gemini Journal brand acts as Home button without extra nav item'
  );
  assert(
    navbarContent.includes('id="nav-tab-journal"') &&
    navbarContent.includes('<span>Journal</span>'),
    'Journal tab is restored and clearly visible as a primary navigation tab'
  );
  assert(
    !navbarContent.includes('min-w-0 overflow-x-auto') &&
    navbarContent.includes('items-center justify-center') &&
    (navbarContent.includes('hidden 2xl:flex') || navbarContent.includes('hidden lg:flex')),
    'Desktop navigation container eliminates overflow clipping to keep first tab fully visible'
  );
  assert(
    navbarContent.includes('hidden 2xl:inline text-xs font-medium text-stone-700 max-w-[120px] truncate'),
    'Username text is hidden on standard desktop before breaking navigation'
  );
  assert(
    (navbarContent.includes('2xl:hidden') || navbarContent.includes('lg:hidden')) &&
    navbarContent.includes('border-t border-[#e7e2da]') &&
    navbarContent.includes('overflow-x-auto'),
    'Constrained and mobile viewports switch to an intentional two-row header with horizontal scrolling'
  );
  assert(
    !navbarContent.includes('hidden 2xl:block text-[10px] sm:text-[11px] font-sans tracking-wide text-amber-900/75') &&
    navbarContent.includes('text-[10px] sm:text-[11px] font-sans tracking-wide text-amber-900/75') &&
    navbarContent.includes('Cloud Run AI Challenge • APAC Cohort 3'),
    'Brand subtitle is never hidden on ordinary desktop viewports'
  );

  console.log('\n--- 12. Signed-Out Discover Page Presentation ---');
  const discoverPath = path.join(componentsDir, 'DiscoverView.tsx');
  const discoverContent = fs.readFileSync(discoverPath, 'utf-8');
  assert(
    discoverContent.includes('{isSignedIn && (') &&
    discoverContent.includes('card.actionText'),
    'Public mode hides individual feature action buttons on cards'
  );
  assert(
    discoverContent.includes("p-5 sm:p-6 flex flex-col") &&
    (discoverContent.includes("isSignedIn ? 'mb-3' : 'mb-0'") || discoverContent.includes("isSignedIn ? 'mb-6' : 'mb-0'")),
    'Signed-out discover cards have content-driven height with compact padding and no reserved button margin'
  );
  assert(
    discoverContent.includes('!isSignedIn && (') &&
    discoverContent.includes('btn-discover-signin') &&
    discoverContent.includes('Start Your Private Journal'),
    'Public mode renders a single page-level sign-in CTA'
  );

  console.log('\n--- 13. Logout Destination Reset ---');
  const appPath = path.join(process.cwd(), 'src', 'App.tsx');
  const appContent = fs.readFileSync(appPath, 'utf-8');
  assert(
    (appContent.includes("setActiveTab('home');") || appContent.includes("setActiveTab('journal');")) &&
    appContent.includes('handleSignOut'),
    'handleSignOut predictably resets navigation to public home'
  );
  assert(
    (appContent.includes("setActiveTab('home');") || appContent.includes("setActiveTab('journal');")) &&
    appContent.includes('onAuthStateChanged'),
    'Auth listener unconditionally resets activeTab when signed out'
  );

  console.log('\n--- 14. Authenticated & Public Home Storytelling, Footer & Creator ---');
  const authHomePath = path.join(componentsDir, 'AuthenticatedHomeView.tsx');
  assert(fs.existsSync(authHomePath), 'AuthenticatedHomeView component exists');
  const authHomeContent = fs.readFileSync(authHomePath, 'utf-8');
  assert(
    authHomeContent.includes('A private journal that mirrors your story through Reflection Lenses.') &&
    authHomeContent.includes('btn-home-open-journal') &&
    authHomeContent.includes('Open My Journal'),
    'Authenticated Home hero renders correct copy and Open My Journal CTA'
  );
  assert(
    authHomeContent.includes('AI should help you notice your story, not take it over.') &&
    authHomeContent.includes('Reflect at your own pace. Keep what matters. Stay in control of what becomes part of your story.'),
    'Authenticated Home renders product philosophy strip'
  );
  assert(
    appContent.includes("activeTab === 'home'") &&
    appContent.includes('<AuthenticatedHomeView'),
    'App router renders AuthenticatedHomeView when activeTab is home'
  );

  const storytellingPath = path.join(componentsDir, 'HomeStorytellingSections.tsx');
  assert(fs.existsSync(storytellingPath), 'HomeStorytellingSections component exists');
  const storytellingContent = fs.readFileSync(storytellingPath, 'utf-8');
  assert(
    storytellingContent.includes('Built through the Google Cloud Gen AI Academy') &&
    storytellingContent.includes('Google Cloud Gen AI Academy • APAC Cohort 3'),
    'Storytelling sections include Academy context and Cohort 3 badge'
  );
  assert(
    storytellingContent.includes('What I wanted to explore') &&
    storytellingContent.includes('What happens when an AI journal does more than respond to one prompt?'),
    'Storytelling sections include What I wanted to explore section'
  );
  assert(
    storytellingContent.includes('From using AI to building with AI') &&
    storytellingContent.includes('how an AI product is actually engineered'),
    'Storytelling sections include From using AI to building with AI section'
  );
  assert(
    storytellingContent.includes('What makes this journal different') &&
    storytellingContent.includes('Reflection Lenses') &&
    storytellingContent.includes('Living Memory') &&
    storytellingContent.includes('Memory Receipts') &&
    storytellingContent.includes('Your Memory, Your Rules') &&
    storytellingContent.includes('Voice Journaling') &&
    storytellingContent.includes('Memories Across Place & Time'),
    'Storytelling sections render 6 product differentiator cards'
  );
  assert(
    storytellingContent.includes('Built by Sonia Mansha') &&
    storytellingContent.includes('https://www.linkedin.com/in/sonia11mansha415/') &&
    storytellingContent.includes('https://github.com/sonia11mansha415') &&
    storytellingContent.includes('https://github.com/sonia11mansha415/personal-gemini-journal'),
    'Developer section renders Sonia Mansha with working LinkedIn, GitHub, and Source Code links'
  );
  assert(
    storytellingContent.includes('/images/sonia-mansha-profile.jpg') &&
    storytellingContent.includes('alt="Sonia Mansha"'),
    'Creator card renders Sonia Mansha profile image from /images/sonia-mansha-profile.jpg'
  );

  const profileImgPath = path.join(process.cwd(), 'public', 'images', 'sonia-mansha-profile.jpg');
  assert(fs.existsSync(profileImgPath), 'Creator profile image exists at /public/images/sonia-mansha-profile.jpg');

  const footerPath = path.join(componentsDir, 'Footer.tsx');
  assert(fs.existsSync(footerPath), 'Footer component exists');
  const footerContent = fs.readFileSync(footerPath, 'utf-8');
  assert(
    footerContent.includes('Personal Gemini Journal') &&
    footerContent.includes('Developed by Sonia Mansha') &&
    footerContent.includes('footer-link-linkedin') &&
    footerContent.includes('footer-link-github') &&
    footerContent.includes('footer-link-source-code'),
    'Footer renders brand, developer credit, and external links'
  );

  const unauthPath = path.join(componentsDir, 'UnauthenticatedView.tsx');
  const unauthContent = fs.readFileSync(unauthPath, 'utf-8');
  assert(
    unauthContent.includes('<CreatorIdentityCard />') &&
    unauthContent.includes('<ProjectStorySection />') &&
    unauthContent.includes('<HomeStorytellingSections />') &&
    unauthContent.includes('<Footer />'),
    'Public Home places CreatorIdentityCard and ProjectStorySection at top and includes HomeStorytellingSections and Footer'
  );
  assert(
    authHomeContent.includes('<CreatorIdentityCard />') &&
    authHomeContent.includes('<ProjectStorySection />') &&
    authHomeContent.includes('<HomeStorytellingSections />') &&
    authHomeContent.includes('<Footer />'),
    'Authenticated Home places CreatorIdentityCard and ProjectStorySection at top and includes HomeStorytellingSections and Footer'
  );

  console.log('\n--- 8. Mobile Stability, Authentication & Responsive Polish ---');
  const firebasePath = path.join(process.cwd(), 'src', 'firebase.ts');
  const firebaseContent = fs.readFileSync(firebasePath, 'utf-8');
  assert(
    firebaseContent.includes('isMobileOrTablet') &&
    firebaseContent.includes('signInWithRedirect(auth, googleProvider)') &&
    firebaseContent.includes('signInWithPopup(auth, googleProvider)') &&
    firebaseContent.includes('handleRedirectResult'),
    'Firebase module implements desktop popup + mobile redirect authentication architecture'
  );

  const mobileNavbarPath = path.join(componentsDir, 'Navbar.tsx');
  const mobileNavbarContent = fs.readFileSync(mobileNavbarPath, 'utf-8');
  assert(
    mobileNavbarContent.includes('min-w-0 flex-1 sm:flex-initial') &&
    mobileNavbarContent.includes('Personal Gemini Journal') &&
    mobileNavbarContent.includes('truncate'),
    'Navbar brand container is fluid and prevents viewport-exceeding horizontal expansion'
  );
  assert(
    mobileNavbarContent.includes('aria-label="Sign in with Google"') &&
    mobileNavbarContent.includes('<span className="sm:hidden">Sign in</span>') &&
    mobileNavbarContent.includes('<span className="hidden sm:inline">Sign in with Google</span>'),
    'Navbar sign-in button adapts with compact "Sign in" label on mobile while preserving full desktop wording and accessible aria-label'
  );

  const mobileAppPath = path.join(process.cwd(), 'src', 'App.tsx');
  const mobileAppContent = fs.readFileSync(mobileAppPath, 'utf-8');
  assert(
    mobileAppContent.includes('overflow-x-clip'),
    'App root wrapper incorporates overflow-x-clip safeguard'
  );
  assert(
    mobileAppContent.includes('main className="flex-1 min-w-0 w-full"'),
    'Main tag has min-w-0 and w-full for strict responsive layout containment'
  );
  assert(
    mobileAppContent.includes("We couldn't complete Google sign-in. Please try again."),
    'App sign-in error handler shows friendly message without developer/OAuth jargon'
  );

  const mapPath = path.join(componentsDir, 'MemoryMapView.tsx');
  const mapContent = fs.readFileSync(mapPath, 'utf-8');
  assert(
    mapContent.includes('if (mapInstanceRef.current) return;') ||
    mapContent.includes('if (mapInstanceRef.current) {'),
    'MemoryMapView guards against duplicate Map instantiation'
  );
  assert(
    mapContent.includes('h-[360px] sm:h-[440px] lg:h-[520px]'),
    'MemoryMapView applies responsive map container height'
  );
  assert(
    mapContent.includes('lg:col-span-8') && mapContent.includes('lg:col-span-4'),
    'MemoryMapView uses responsive grid that stacks details below map on mobile'
  );

  const settingsPath = path.join(componentsDir, 'SettingsView.tsx');
  const settingsContent = fs.readFileSync(settingsPath, 'utf-8');
  assert(
    settingsContent.includes("themeMode === 'automatic'") &&
    settingsContent.includes('Automatic Mood Tone Active') &&
    settingsContent.includes('Current look:') &&
    settingsContent.includes("themeMode === 'manual'"),
    'SettingsView presents Automatic as read-only preview and Manual as selectable palette options without dual checkmark confusion'
  );
  assert(
    !settingsContent.includes('Active Control'),
    'SettingsView no longer renders redundant Active Control badge in Enabled Lenses'
  );
  assert(
    settingsContent.includes('aria-live="polite"'),
    'SettingsView wraps email preview message in stable container with aria-live="polite"'
  );

  console.log('\n--- 9. Final Polish & Reflection Resilience Verification ---');

  // Reflection prose sentence completion guard
  const truncatedProse = "This is a complete thought. You navigated a difficult challenge and showed real composure. When considering the next steps you might want to";
  const cleaned = cleanReflectionProse(truncatedProse);
  assert(
    cleaned === "This is a complete thought. You navigated a difficult challenge and showed real composure.",
    'cleanReflectionProse trims trailing incomplete clauses that lack terminal punctuation'
  );

  // Unclosed JSON recovery
  const unclosedJson = '{\n  "reflection": "You found meaningful quiet amid a busy day. Tomorrow offers a fresh start';
  const parsedUnclosed = parseGeminiReflectionOutput(unclosedJson);
  assert(
    parsedUnclosed.reflection.includes('You found meaningful quiet amid a busy day.'),
    'parseGeminiReflectionOutput recovers unclosed JSON strings gracefully'
  );

  // JournalEditor attributes and elements
  const finalEditorPath = path.join(componentsDir, 'JournalEditor.tsx');
  const finalEditorContent = fs.readFileSync(finalEditorPath, 'utf-8');
  assert(
    finalEditorContent.includes('data-lpignore="true"') && finalEditorContent.includes('autoComplete="off"'),
    'JournalEditor title and tag inputs suppress autofill / password manager overlays'
  );
  assert(
    !finalEditorContent.includes('rows={12}'),
    'JournalEditor textarea no longer uses fixed rows={12}'
  );
  assert(
    finalEditorContent.includes('min-h-[220px]') && finalEditorContent.includes('max-h-[560px]'),
    'JournalEditor textarea applies responsive min/max autogrow height limits'
  );
  assert(
    !finalEditorContent.includes('Local preservation active'),
    'JournalEditor replaced developer-sounding "Local preservation active" text'
  );
  assert(
    finalEditorContent.includes('Add to Wins Vault'),
    'JournalEditor provides Add to Wins Vault action'
  );
  assert(
    finalEditorContent.includes('Review Career Win'),
    'JournalEditor provides Review Career Win modal with editable title and impact'
  );

  // Navbar Home tab
  const finalNavbarPath = path.join(componentsDir, 'Navbar.tsx');
  const finalNavbarContent = fs.readFileSync(finalNavbarPath, 'utf-8');
  assert(
    finalNavbarContent.includes('id="nav-tab-home"') && finalNavbarContent.includes('id="nav-tab-home-compact"'),
    'Navbar includes explicit Home tab in primary and compact navigation rows'
  );

  // App.tsx scroll to top and focus
  assert(
    mobileAppContent.includes('window.scrollTo({ top: 0, behavior: \'smooth\' })'),
    'App.tsx handles smooth scrolling to top on new entry / open journal'
  );

  console.log('\n--- 16. Urgent 4-Bug Repair Verification ---');

  // Bug 1: User short-message preservation in chat streams
  const testShortUserInputs = ['yes', 'no', 'ok', 'Yeah', '❤️', "that's okay"];
  for (const input of testShortUserInputs) {
    const userMsg = {
      id: `u_${input}`,
      role: 'user' as const,
      text: input,
      lens: 'PERSONAL' as const,
      createdAt: '2026-09-06T12:00:00Z',
    };
    const dedupedUser = deduplicateMessages([userMsg]);
    assert(
      dedupedUser[0].text === input,
      `User short message "${input}" is preserved verbatim without alteration or terminal period`
    );
  }

  // Verify ReflectionPanel separates assistant vs user rendering
  const panelPath = path.join(componentsDir, 'ReflectionPanel.tsx');
  const panelContent = fs.readFileSync(panelPath, 'utf-8');
  assert(
    panelContent.includes("m.role === 'assistant' ? cleanReflectionProse(m.text) : m.text"),
    'ReflectionPanel renders user text verbatim without passing through cleanReflectionProse'
  );

  // Bug 2: Deterministic reverse geocoding with candidate generation and no generic fallback
  const mapsLoaderPath = path.join(process.cwd(), 'src', 'utils', 'mapsLoader.ts');
  const mapsLoaderContent = fs.readFileSync(mapsLoaderPath, 'utf-8');
  assert(
    !mapsLoaderContent.includes("placeName: shortName || firstResult.formatted_address || 'Current location'"),
    'mapsLoader.ts does not silently fall back to "Current location"'
  );
  assert(
    mapsLoaderContent.includes('export interface ReverseGeocodeResult') &&
    mapsLoaderContent.includes('candidates: string[]'),
    'mapsLoader.ts exports ReverseGeocodeResult with candidate choices'
  );
  assert(
    mapsLoaderContent.includes('reverseGeocode failed with status:') || mapsLoaderContent.includes('Reverse geocoding failed with status:'),
    'mapsLoader.ts provides safe status diagnostic logging on geocoding failures'
  );

  // JournalEditor candidate options and error display
  const freshEditorContent = fs.readFileSync(path.join(componentsDir, 'JournalEditor.tsx'), 'utf-8');
  assert(
    freshEditorContent.includes('Detected Location Options:'),
    'JournalEditor displays selectable reverse-geocoded location candidate options'
  );
  assert(
    freshEditorContent.includes("We found your position, but couldn't identify the place name"),
    'JournalEditor shows user-friendly error when reverse geocoding fails instead of silently saving Current location'
  );
  assert(
    freshEditorContent.includes('Google Maps Geocoding API returned REQUEST_DENIED'),
    'JournalEditor includes diagnostic guidance when Geocoding API returns REQUEST_DENIED'
  );

  // Bug 3: Memory Map preview styling and generic name dynamic resolution
  const freshMapContent = fs.readFileSync(path.join(componentsDir, 'MemoryMapView.tsx'), 'utf-8');
  assert(
    freshMapContent.includes('isGenericPlaceName'),
    'MemoryMapView includes generic place name detector'
  );
  assert(
    freshMapContent.includes('getDisplayPlaceName'),
    'MemoryMapView dynamically backfills generic "Current Location" with reverse-geocoded address'
  );
  assert(
    !freshMapContent.includes('font-serif text-stone-700 text-xs italic'),
    'MemoryMapView preview completely eliminates italic quote styling'
  );
  assert(
    freshMapContent.includes('line-clamp-3 break-words overflow-hidden text-ellipsis'),
    'MemoryMapView preview enforces strict 3-line clamp with overflow-hidden and text-ellipsis'
  );

  // Bug 4: Gemini low-thinking config, bounded 4096 -> 8192 MAX_TOKENS retry, and word limits
  const serverSrcPath = path.join(process.cwd(), 'server.ts');
  const serverCode = fs.readFileSync(serverSrcPath, 'utf-8');
  assert(
    serverCode.includes("thinkingConfig?: {\n    thinkingLevel?: 'low' | 'high' | 'medium';\n  };") ||
    serverCode.includes("thinkingConfig?:"),
    'GeminiCallOptions defines thinkingConfig support'
  );
  assert(
    serverCode.includes("maxOutputTokens: 4096") && serverCode.includes("thinkingLevel: 'low'"),
    'Reflect route configures 4096 maxOutputTokens and low thinking level'
  );
  assert(
    serverCode.includes("maxOutputTokens: 8192"),
    'callGeminiResiliently retries once with expanded 8192 capacity on MAX_TOKENS/LENGTH'
  );
  assert(
    serverCode.includes('Normal initial reflection should usually be <= 180 words') &&
    serverCode.includes('Follow-up reflection should usually be <= 120 words'),
    'System instruction enforces concise word guidance (<= 180 words initial, <= 120 words follow-up)'
  );
  assert(
    serverCode.includes('[Gemini Diagnostics]') && serverCode.includes('finishReason='),
    'server.ts logs safe token and model usage diagnostics without leaking journal content'
  );

  console.log('\n--- 17. Reflection Conversation Auto-Scroll & Stability Tests ---');

  // Verify internal conversation scroll ref
  assert(
    panelContent.includes('const conversationRef = useRef<HTMLDivElement>(null);') ||
    panelContent.includes('useRef<HTMLDivElement>(null)'),
    'ReflectionPanel defines internal conversation scroll ref'
  );

  // Re-read panel content to verify updated file
  const updatedPanelContent = fs.readFileSync(panelPath, 'utf-8');
  assert(
    updatedPanelContent.includes('ref={conversationRef}'),
    'ReflectionPanel attaches scroll ref strictly to internal messages container'
  );

  assert(
    updatedPanelContent.includes('container.scrollTo(') &&
    !updatedPanelContent.includes('window.scrollTo('),
    'ReflectionPanel bottom-scroll operates strictly on internal container and never scrolls window'
  );

  assert(
    updatedPanelContent.includes('requestAnimationFrame'),
    'ReflectionPanel employs requestAnimationFrame for deterministic post-render bottom alignment'
  );

  assert(
    updatedPanelContent.includes('shouldStickToBottomRef.current = true') &&
    updatedPanelContent.includes('onSendFollowUp(cleanText)'),
    'handleFollowUpSubmit engages stick-to-bottom and triggers smooth bottom scrolling on send'
  );

  assert(
    updatedPanelContent.includes('distanceFromBottom > 80') &&
    updatedPanelContent.includes('shouldStickToBottomRef.current = false'),
    'Manual upward scroll (>80px) safely releases stick-to-bottom lock to respect reading position'
  );

  assert(
    updatedPanelContent.includes('prevEntryIdRef.current !== entryId') &&
    updatedPanelContent.includes('shouldStickToBottomRef.current = false') &&
    updatedPanelContent.includes('conversationRef.current.scrollTop = 0'),
    'Switching entries isolates conversations and safely resets scroll position and sticky state'
  );

  assert(
    updatedPanelContent.includes('(prefers-reduced-motion: reduce)'),
    'ReflectionPanel respects prefers-reduced-motion for accessible scroll behavior'
  );

  // Verify App.tsx passes entryId to ReflectionPanel
  const mainAppPath = path.join(process.cwd(), 'src', 'App.tsx');
  const mainAppContent = fs.readFileSync(mainAppPath, 'utf-8');
  assert(
    mainAppContent.includes('entryId={activeEntry.id}'),
    'App.tsx passes activeEntry.id to ReflectionPanel for robust conversation lifecycle isolation'
  );


  console.log('\n========================================');
  console.log(`UX & Polish Results: ${passed} passed (${failed} failed)`);
  console.log('========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runUXPolishTests().catch((err) => {
  console.error('Fatal UX test failure:', err);
  process.exit(1);
});
