<a id="top"></a>

[🏠 Project Home](../README.md) · [🏗️ Architecture](./ARCHITECTURE.md) · [🧪 Testing & Results](./TESTING-AND-RESULTS.md) · [🔥 Firestore](./FIRESTORE.md)

# 🔐 Security & Privacy

Security in Personal Gemini Journal is not limited to sign-in. The project treats **identity, user ownership, AI-memory eligibility, secrets, derived data, deletion, and browser/server trust** as separate control boundaries.

<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif" width="100%" alt="section divider" />

## 1. Server-Side Identity Verification

The browser sends a Firebase ID token in the `Authorization` header. The Express backend verifies that token with Firebase Admin and derives the trusted UID from the verified claims.

The backend does not accept a browser-supplied UID as the authorization source.

This matters because client state can be edited. The server has to reconstruct trust from an independently verifiable identity token before it touches private journal data or invokes privileged AI operations.

## 2. Firestore Owner Isolation

Journal data is scoped below:

```text
/users/{uid}/...
```

The committed Firestore rules enforce authenticated owner access for browser-visible data and default-deny unmatched paths.

Server-derived collections are protected from browser writes. Examples include:

```text
embeddings/
lifeThreads/
unfinishedLoops/
aiMemory/
thenNow/
wins/
weeklyReflections/
emailLogs/
```

Privileged server writes use the Cloud Run service identity and Google Cloud IAM rather than a checked-in service-account key.

## 3. Memory Contracts Are Privacy Controls

Every journal entry can carry an explicit memory contract:

| UI choice | Internal value | Gemini reflection | Future memory |
|---|---|---:|---:|
| Private Only | `STORE_ONLY` | No | No |
| One-Time Reflection | `PAGE_ONLY` | Yes | No |
| Connect with Memories | `MAY_CONNECT` | Yes | Yes |
| Core Memory | `IMPORTANT_MEMORY` | Yes | Yes, prioritized |

The important control is server authority: sensitive AI paths reload the stored entry and re-check its memory contract instead of trusting the contract supplied in a browser request.

If an entry becomes non-connectable, related embeddings and derived-memory connections are pruned.

## 4. Gemini Secret Stays Server-Side

`GEMINI_API_KEY` is read by the server and injected into Cloud Run through Google Secret Manager.

It is not exposed through Vite client variables and is not committed to the repository.

Production uses a dedicated Cloud Run runtime service account. No service-account JSON key is required.

## 5. Maps Key Uses the Correct Security Model

The Maps JavaScript key is intentionally used by browser code. Browser-visible API keys cannot be protected by secrecy alone.

The correct controls are:

- HTTP referrer restrictions to intended origins;
- API restrictions to the Maps JavaScript API, Places API (New), and Geocoding API;
- separate credentials from the server-side Gemini secret.

## 6. Journal Text Is Untrusted Model Input

Past journal entries can be retrieved for longitudinal reflection, but they are inserted into the model context as **untrusted user-authored data**.

Retrieved journal text does not become a privileged system instruction simply because the memory system found it.

This boundary reduces the risk of a journal entry acting as a prompt-injection instruction against later AI behavior.

## 7. Structured AI Output & Defensive Rendering

The reflection path separates:

- human-facing reflection prose;
- suggested lens metadata;
- optional Career Win candidate metadata;
- memory/source references.

The server requests structured model output. The UI also applies a defensive sanitizer to assistant prose so raw JSON/schema fragments do not leak into the journal conversation.

User messages are not rewritten by that sanitizer.

## 8. Abuse & Cost Controls

Authenticated reflection requests use a per-user rate limiter before invoking Gemini. Request-body limits are kept smaller by default, with a larger allowance only for the voice-transcription path.

These controls help limit accidental or abusive model/API usage without weakening the authenticated journal experience.

## 9. HTTP Hardening

The production server includes:

- removal of `X-Powered-By`;
- `X-Content-Type-Options: nosniff`;
- restrictive referrer policy;
- browser permissions policy aligned with microphone/location use;
- Content Security Policy tuned for Firebase and Google Maps dependencies;
- `Cache-Control: no-store` on authenticated API responses.

## 10. Deletion & Derived-Memory Cleanup

Deleting a source journal entry also removes nested conversation messages and related derived-memory records.

The account-level deletion flow cascades across journal and derived collections so deleted source moments do not remain as disconnected AI memories.

## 11. Cloud Run Runtime Identity

The deployed service uses a dedicated runtime service account for Google Cloud API access. The application relies on Application Default Credentials instead of storing service-account JSON in the codebase.

The runtime identity receives the permissions needed for Firestore access and the Gemini secret.

## 12. Security Verification

The test suite and emulator checks cover controls including:

- unauthenticated API rejection;
- invalid/malformed token rejection;
- UID isolation;
- restricted memory-contract behavior;
- server-authoritative privacy checks;
- browser write denial for server-derived collections;
- Firestore default-deny paths;
- voice payload validation;
- secret/runtime separation;
- protected production source/config paths.

See [`TESTING-AND-RESULTS.md`](./TESTING-AND-RESULTS.md) for the full verification summary.

## 13. Security Improvements I Would Add Next

- stronger structured audit logging for memory-policy changes and derived-memory writes;
- automated adversarial tests for prompt injection and memory-policy bypass attempts;
- richer rate-limit telemetry and abuse detection if the public prototype gains broader traffic;
- stronger authorization gates for any future external write-capable integrations;
- additional privacy-preserving export/import options for long-term portability.

---

[🏠 Project Home](../README.md) · [🏗️ Architecture](./ARCHITECTURE.md) · [🧪 Testing & Results](./TESTING-AND-RESULTS.md) · [↑ Back to top](#top)
