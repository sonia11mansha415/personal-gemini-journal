# Personal Gemini Journal

> **Google Cloud Gen AI Academy — APAC Cohort 3 · Cloud Run AI Challenge**  
> Deployment label: `dev-tutorial=cloud-run-ai-challenge`

Personal Gemini Journal is a privacy-first reflective journaling application built with React, Firebase, Gemini, Google Maps Platform, Cloud Firestore, and Google Cloud Run.

The product keeps the user's writing primary while Gemini acts as a reflective companion. Users can choose how each entry may be used through explicit memory scopes, explore recurring life threads, capture career wins, review mood patterns, attach optional places, and inspect or remove AI-derived memory connections.

## Highlights

- **Reflection Lenses** — Personal, Professional, Identity & Growth, and opt-in Women & Life perspectives.
- **Memory Scopes** — per-entry control over whether an entry stays private, supports one-time reflection, or may connect with future memories.
- **Living Memory** — user-scoped life threads, Then & Now reflections, open loops, and memory receipts.
- **Career Wins Vault** — verified, user-confirmed professional milestones grounded in journal entries.
- **Voice-first journaling** — microphone recording, silence detection, transcription, and suggested titles.
- **Memory Map** — optional geotagged moments with Google Maps place search and reverse geocoding.
- **Insights & Moods** — gentle journaling rhythm, mood calendar, mood trends, and weekly reflection.
- **Data control** — journal export, cascade deletion, privacy preferences, and explicit memory controls.
- **Responsive product UI** — desktop, tablet, mobile, and reduced-motion handling.

## Technology Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS |
| Backend | Express, Node.js 22 |
| Authentication | Firebase Authentication with Google Sign-In |
| Database | Cloud Firestore |
| AI | Google Gemini API via `@google/genai` |
| Maps | Google Maps JavaScript API, Places API (New), Geocoding API |
| Deployment | Google Cloud Run source deployment / Google Cloud Buildpacks |
| Server identity | Firebase Admin SDK + Cloud Run service identity |

## Architecture

```text
Browser
  │
  ├─ Firebase Authentication
  ├─ React / Vite UI
  └─ Google Maps browser API key
          │
          ▼
Google Cloud Run
  Express + Node.js 22
  │
  ├─ verifies Firebase ID tokens
  ├─ derives trusted user UID server-side
  ├─ calls Gemini with server-only API key
  └─ uses Firebase Admin / ADC for privileged Firestore work
          │
          ▼
Cloud Firestore
  users/{uid}/...
```

The browser never receives `GEMINI_API_KEY`. All privileged AI calls and server-derived Firestore writes pass through the Cloud Run backend.

## Repository Structure

```text
.
├── src/                         # React application
│   ├── components/              # Product views and UI components
│   ├── api/                     # Authenticated API helpers
│   ├── theme/                   # Mood-aware theme tokens
│   └── utils/                   # Maps, sanitization, reflection helpers
├── public/                      # Static public assets
├── tests/                       # Security, feature, UX and regression tests
├── docs/                        # Deployment and Firestore documentation
├── server.ts                    # Express backend + Gemini + Firebase Admin
├── firestore.rules             # Production Firestore Security Rules
├── firebase.json               # Firestore rules database mapping
├── firebase-applet-config.json # Firebase Web SDK public client configuration
├── vite.config.ts              # Vite production build configuration
├── package.json
├── package-lock.json
├── Procfile                     # Explicit Cloud Run buildpack entrypoint
├── .env.example
├── .gitignore
└── .gcloudignore
```

## Local Development

### Prerequisites

- Node.js **22.x**
- npm
- A Firebase project with Google Sign-In enabled
- A Firestore database
- A Gemini API key
- Optional: a Google Maps browser key for Maps / Places features

### Install

```bash
npm ci
```

### Configure local environment

Copy the example file:

```bash
cp .env.example .env
```

Set:

```env
GEMINI_API_KEY="your-server-side-gemini-api-key"
VITE_GOOGLE_MAPS_API_KEY="your-browser-maps-api-key"
PORT=3000
```

Do **not** commit `.env`.

### Firebase client configuration

`firebase-applet-config.json` is the Firebase Web SDK configuration used by both the browser and server to identify the Firebase project and Firestore database.

Firebase Web configuration values are client configuration, not server secrets. For a fork or independent deployment, replace the values in this file with the Firebase Web App configuration for your project, including the correct `firestoreDatabaseId`.

Example shape:

```json
{
  "projectId": "your-project-id",
  "appId": "your-firebase-web-app-id",
  "apiKey": "your-firebase-web-api-key",
  "authDomain": "your-project.firebaseapp.com",
  "firestoreDatabaseId": "(default)",
  "storageBucket": "your-project.firebasestorage.app",
  "messagingSenderId": "1234567890",
  "oAuthClientId": "your-google-oauth-client-id.apps.googleusercontent.com"
}
```

If you use a named Firestore database, update **both**:

- `firebase-applet-config.json` → `firestoreDatabaseId`
- `firebase.json` → `firestore[].database`

### Run locally

```bash
npm run dev
```

Open `http://localhost:3000`.

## Verification

```bash
npm run typecheck
npm test
npm run build
```

Or run the full local verification command:

```bash
npm run verify
```

The final pre-deployment codebase was manually verified after the final reflection-scroll stability repair, with the focused UX suite and core security suite passing before repository cleanup.

## Firestore Security Model

The production rules are version-controlled in [`firestore.rules`](./firestore.rules).

Key guarantees:

- users can only access documents under their own `users/{uid}` boundary;
- entry writes validate supported reflection lenses and memory scopes;
- browser clients can read but **cannot write** server-derived collections such as embeddings, life threads, wins, weekly reflections, and AI memory;
- all unmatched paths are denied by default;
- privileged Admin SDK operations rely on Cloud Run IAM rather than bypassing identity checks in client code.

The repository is configured for the current named Firestore database in `firebase.json`. If you fork the project, change the database ID before deploying rules.

Deploy rules with Firebase CLI:

```bash
npx firebase-tools@latest deploy --only firestore:rules --project YOUR_PROJECT_ID
```

For the current named database only, you can also deploy the configured database target:

```bash
npx firebase-tools@latest deploy --only firestore:ai-studio-f75cc91b-fca3-4610-8749-571249411cad --project YOUR_PROJECT_ID
```

See [`docs/FIRESTORE.md`](./docs/FIRESTORE.md) for the schema, rule model, and reproduction checklist.

## Google Cloud Run Deployment

The application is designed for **Cloud Run source deployment**. A Dockerfile is intentionally not required: Google Cloud Buildpacks install dependencies, run `npm run gcp-build`, and start the compiled server through the `Procfile` / `start` script.

### 1. Set shell variables

```bash
export PROJECT_ID="your-google-cloud-project-id"
export REGION="your-cloud-run-region"
export SERVICE_NAME="personal-gemini-journal"
export RUNTIME_SA_NAME="personal-gemini-journal-runtime"
export RUNTIME_SA="${RUNTIME_SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
```

Choose a Cloud Run region close to your users and Firestore location.

### 2. Select the project and enable required Google Cloud APIs

```bash
gcloud config set project "$PROJECT_ID"

gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  iam.googleapis.com
```

### 3. Create a dedicated Cloud Run runtime service account

```bash
gcloud iam service-accounts create "$RUNTIME_SA_NAME" \
  --display-name="Personal Gemini Journal Cloud Run runtime"
```

Grant only the Firestore access needed by the server:

```bash
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/datastore.user"
```

### 4. Store the Gemini API key in Secret Manager

Create the secret once:

```bash
printf '%s' "$GEMINI_API_KEY" | \
  gcloud secrets create GEMINI_API_KEY \
    --replication-policy="automatic" \
    --data-file=-
```

For later rotations:

```bash
printf '%s' "$GEMINI_API_KEY" | \
  gcloud secrets versions add GEMINI_API_KEY --data-file=-
```

Allow the Cloud Run runtime identity to read only this secret:

```bash
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/secretmanager.secretAccessor"
```

### 5. Configure the Google Maps browser key

Enable these APIs on the project that owns the Maps key:

- Maps JavaScript API
- Places API (New)
- Geocoding API

The Maps key is injected into the Vite browser bundle at **build time**, so it is intentionally browser-visible. Protect it with:

- **Application restriction:** HTTP referrers
- **API restriction:** only the three Maps APIs above

For the first deployment, set the key in your shell:

```bash
export MAPS_API_KEY="your-restricted-browser-maps-key"
```

### 6. Deploy from source

```bash
gcloud run deploy "$SERVICE_NAME" \
  --source . \
  --region "$REGION" \
  --service-account "$RUNTIME_SA" \
  --allow-unauthenticated \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest \
  --set-build-env-vars VITE_GOOGLE_MAPS_API_KEY="$MAPS_API_KEY" \
  --labels dev-tutorial=cloud-run-ai-challenge
```

The service is public at the HTTP layer because users authenticate inside the application with Firebase Authentication. Authenticated API routes still verify Firebase ID tokens server-side.

### 7. Required post-deployment configuration

Get the Cloud Run URL:

```bash
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
  --region "$REGION" \
  --format='value(status.url)')

echo "$SERVICE_URL"
```

Then:

1. **Firebase Authentication** → Settings → Authorized domains → add the Cloud Run hostname.
2. **Google Maps API key** → Credentials → HTTP referrer restrictions → add `${SERVICE_URL}/*`.
3. Confirm Google Sign-In works on desktop and mobile.
4. Confirm Firestore rules are deployed to the exact database ID used in `firebase-applet-config.json`.
5. Verify `/api/health` returns HTTP 200.

Full deployment and IAM instructions are in [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md).

## Runtime Configuration Reference

| Configuration | Location | Secret? | Notes |
| --- | --- | --- | --- |
| `GEMINI_API_KEY` | Cloud Run runtime via Secret Manager | **Yes** | Never expose to browser or commit to Git |
| `VITE_GOOGLE_MAPS_API_KEY` | Cloud Build build environment | No, browser-visible | Restrict by HTTP referrer and API scope |
| Firebase Web config | `firebase-applet-config.json` | No, client config | Replace for forks / independent Firebase projects |
| `PORT` | Cloud Run runtime | No | Cloud Run injects this automatically |
| Service credentials | Cloud Run service identity / ADC | **Do not use JSON keys** | Grant IAM roles to the runtime service account |

## Security Notes

- `.env`, `node_modules`, `dist`, logs, editor metadata, and local agent artifacts are excluded from Git and Cloud Run source uploads.
- No service-account JSON file is required or expected in production.
- `GOOGLE_APPLICATION_CREDENTIALS` should not be set on Cloud Run; use the Cloud Run service account instead.
- `GEMINI_API_KEY` is read lazily on the server and never bundled into Vite assets.
- Firebase ID tokens are verified with Firebase Admin before authenticated API routes use a UID.
- User-supplied UIDs are not trusted as an authorization boundary.
- Server-derived Firestore collections are browser read-only and server write-only.
- The Career Win candidate flow reloads the authoritative stored entry before any AI processing and enforces the stored memory scope.
- Journal text is treated as untrusted data when included in AI context, not as system instructions.

## Memory Scope Behavior

| UI meaning | Internal value | AI on current page | Future memory connection |
| --- | --- | ---: | ---: |
| Private Only | `STORE_ONLY` | No | No |
| One-Time Reflection | `PAGE_ONLY` | Yes | No |
| Connect with Memories | `MAY_CONNECT` | Yes | Yes |
| Core Memory | `IMPORTANT_MEMORY` | Yes | Yes, prioritized |

## Data Model Overview

All user data is scoped under:

```text
/users/{uid}
```

Primary subcollections include:

```text
entries/
embeddings/
lifeThreads/
unfinishedLoops/
aiMemory/
thenNow/
wins/
weeklyReflections/
emailLogs/
```

Reflection messages can also exist under entry-scoped message subcollections. See [`docs/FIRESTORE.md`](./docs/FIRESTORE.md).

## Public Project Links

- GitHub profile: https://github.com/sonia11mansha415
- LinkedIn: https://www.linkedin.com/in/sonia11mansha415/
- Repository: https://github.com/sonia11mansha415/personal-gemini-journal

## Creator

**Built by Sonia Mansha** as part of the Google Cloud Gen AI Academy APAC Cohort 3 journey—exploring how thoughtful product design, generative AI, cloud infrastructure, memory, privacy, security, and user control can come together in one personal experience.

---

### Repository hygiene

This repository intentionally contains **source and reproducibility files only**. Generated dependencies, compiled output, local logs, `.env` files, AI-agent workspace files, and local caches are excluded. Run `npm ci` and `npm run build` to regenerate everything needed for execution.
