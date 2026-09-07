<a id="top"></a>

[🏠 Project Home](../README.md) · [🏗️ Architecture](./ARCHITECTURE.md) · [🔐 Security & Privacy](./SECURITY-AND-PRIVACY.md) · [🚀 Deployment](./DEPLOYMENT.md)

# Firestore Data Model and Security Rules

## Database selection

The application supports either the default Firestore database or a named database.

The active database ID is read from:

```text
firebase-applet-config.json -> firestoreDatabaseId
```

The current repository also maps the same named database in `firebase.json` so Firebase CLI rule deployments target the correct database.

For a fork, keep these two values synchronized.

## User ownership boundary

All journal data is scoped below:

```text
/users/{uid}
```

The browser UID is never accepted as the server authorization source. Authenticated backend routes verify the Firebase ID token and derive the trusted UID from the verified token.

## Main collections

```text
/users/{uid}
/users/{uid}/entries/{entryId}
/users/{uid}/entries/{entryId}/messages/{messageId}
/users/{uid}/embeddings/{entryId}
/users/{uid}/lifeThreads/{threadId}
/users/{uid}/unfinishedLoops/{loopId}
/users/{uid}/aiMemory/{memoryId}
/users/{uid}/thenNow/{id}
/users/{uid}/wins/{winId}
/users/{uid}/weeklyReflections/{reflectionId}
/users/{uid}/emailLogs/{logId}
```

## Security rule strategy

The committed `firestore.rules` follows four principles:

1. **Authenticated owner access** — reads/writes are limited to `request.auth.uid == userId`.
2. **Entry validation** — supported memory scopes and reflection lenses are validated on entry create/update.
3. **Server-derived collections are browser read-only** — browser clients may read their own generated insights but cannot forge derived records.
4. **Default deny** — every unmatched path is denied.

## Production rules

The authoritative rules are in:

```text
firestore.rules
```

Do not duplicate or maintain a second rules copy in documentation. The source file is the deployment artifact.

## Server Admin SDK behavior

Firebase Admin / Google Cloud server libraries do not rely on browser Firestore Security Rules. The Cloud Run service uses its service identity and Google Cloud IAM for privileged Firestore operations.

That is why the Cloud Run runtime service account needs:

```text
roles/datastore.user
```

The application does not require a checked-in service-account key.

## Named database rule deployment

`firebase.json` currently contains the named database ID used by this project.

Deploy all configured Firestore rules:

```bash
npx firebase-tools@latest deploy --only firestore:rules --project YOUR_PROJECT_ID
```

Or deploy the configured database explicitly:

```bash
npx firebase-tools@latest deploy --only firestore:YOUR_DATABASE_ID --project YOUR_PROJECT_ID
```

## Reproduction checklist

For another Firebase project:

1. Create or choose a Firestore database.
2. Copy its database ID into `firebase-applet-config.json`.
3. Copy the same ID into `firebase.json`.
4. Enable Firebase Authentication → Google provider.
5. Deploy `firestore.rules` to that database.
6. Create a Cloud Run service account with `roles/datastore.user`.
7. Deploy the Cloud Run service with that runtime identity.
8. Add the Cloud Run hostname to Firebase Authentication Authorized Domains.

---

[🏠 Project Home](../README.md) · [🏗️ Architecture](./ARCHITECTURE.md) · [🔐 Security & Privacy](./SECURITY-AND-PRIVACY.md) · [🚀 Deployment](./DEPLOYMENT.md) · [↑ Back to top](#top)
