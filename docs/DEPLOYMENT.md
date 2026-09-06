# Cloud Run Deployment Guide

This guide reproduces Personal Gemini Journal on Google Cloud Run from the repository source.

## Deployment model

The repository is source-deployable:

```text
Git repository
   ↓
gcloud run deploy --source .
   ↓
Cloud Build + Google Node.js buildpacks
   ↓
npm install / build dependencies
   ↓
npm run gcp-build
   ↓
dist/client + dist/server.cjs
   ↓
Cloud Run service
```

No Dockerfile is required.

## Required services

Enable:

```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  iam.googleapis.com
```

## Runtime service identity

Create a dedicated service account:

```bash
export PROJECT_ID="your-project-id"
export RUNTIME_SA_NAME="personal-gemini-journal-runtime"
export RUNTIME_SA="${RUNTIME_SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud iam service-accounts create "$RUNTIME_SA_NAME" \
  --display-name="Personal Gemini Journal Cloud Run runtime"
```

Grant Firestore access:

```bash
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/datastore.user"
```

Do not upload a service-account JSON key. Cloud Run uses Application Default Credentials through the attached service identity.

## Gemini secret

Create or update the Secret Manager secret named `GEMINI_API_KEY`.

Create:

```bash
printf '%s' "$GEMINI_API_KEY" | \
  gcloud secrets create GEMINI_API_KEY \
    --replication-policy="automatic" \
    --data-file=-
```

Rotate:

```bash
printf '%s' "$GEMINI_API_KEY" | \
  gcloud secrets versions add GEMINI_API_KEY --data-file=-
```

Grant access to the runtime identity:

```bash
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/secretmanager.secretAccessor"
```

## Google Maps browser configuration

The UI uses:

- Maps JavaScript API
- Places API (New)
- Geocoding API

Use a browser API key with HTTP referrer restrictions and API restrictions. The key is injected by Vite at build time as `VITE_GOOGLE_MAPS_API_KEY`.

Do not use the Gemini server key for Maps.

## Firebase configuration

The repository expects `firebase-applet-config.json`.

For a new deployment, replace its values with your Firebase Web App settings and Firestore database ID. If you use a named database, update the same database ID in `firebase.json` before deploying rules.

Enable Google Sign-In in Firebase Authentication.

## Firestore rules

Deploy the repository rules before production use:

```bash
npx firebase-tools@latest deploy --only firestore:rules --project "$PROJECT_ID"
```

For a named database, the database must be declared in `firebase.json`.

## Source deployment

```bash
export REGION="your-region"
export SERVICE_NAME="personal-gemini-journal"
export MAPS_API_KEY="your-restricted-maps-browser-key"

gcloud run deploy "$SERVICE_NAME" \
  --source . \
  --region "$REGION" \
  --service-account "$RUNTIME_SA" \
  --allow-unauthenticated \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest \
  --set-build-env-vars VITE_GOOGLE_MAPS_API_KEY="$MAPS_API_KEY" \
  --labels dev-tutorial=cloud-run-ai-challenge
```

## Post-deployment configuration

Get the service URL:

```bash
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
  --region "$REGION" \
  --format='value(status.url)')
```

Then complete all of the following:

1. Add the Cloud Run hostname to Firebase Authentication → Authorized domains.
2. Add `${SERVICE_URL}/*` to the Maps key HTTP referrer allowlist.
3. Verify the Maps key is restricted to Maps JavaScript API, Places API (New), and Geocoding API.
4. Test Google Sign-In on desktop.
5. Test Google Sign-In redirect flow on mobile.
6. Create and save a journal entry.
7. Trigger Gemini reflection.
8. Test Living Memory and Memory Map.
9. Verify `/api/health`.
10. Verify the Cloud Run revision uses the dedicated runtime service account.

## Update deployment

After pushing code changes:

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

## Common deployment failures

### Build cannot find Vite or esbuild

The repository includes `gcp-build` so the Node.js buildpack installs build dependencies and runs `npm run build`. Do not upload a copied `node_modules` directory.

### Service fails to bind a port

Cloud Run injects `PORT`. `server.ts` reads `process.env.PORT` and binds to `0.0.0.0`.

### Gemini returns 401 / 403 / 429

Check:

- Secret Manager contains the intended API key.
- The Cloud Run revision has `GEMINI_API_KEY` mapped from the secret.
- The API key's Gemini API billing/quota is active.

### Firestore Admin requests fail

Check:

- the Cloud Run service is using the dedicated runtime service account;
- the service account has `roles/datastore.user`;
- `firebase-applet-config.json` points to the correct project and database ID.

### Google Sign-In fails after deployment

Add the Cloud Run hostname to Firebase Authentication Authorized Domains. Mobile uses redirect-based sign-in while desktop uses popup-based sign-in.

### Maps show but place lookup/reverse geocoding fails

Confirm the browser key has all three required APIs enabled and HTTP referrer restrictions include the exact Cloud Run origin.
