# AwehChat Contacts API (v1)

AwehChat is the contact book for the whole ecosystem. Every app (Nexus, Second-Brain,
FinancePlay, Consolidated Hub, …) reads and writes the same per-user contact list here,
so a person added in one app shows up everywhere, once.

Base URL: `https://awehchat.co.za/api/v1`

## Authentication

1. An admin signs in to AwehChat → **/ecosystem → API Keys** and creates a key for the app,
   ticking only the permissions it needs. The key is shown **once**; AwehChat stores only a
   SHA-256 hash.
2. The app sends it on every request, server-side only:

```
Authorization: Bearer <key>
X-User-Email: <the signed-in user of your app>
```

`X-User-Email` (or a `userEmail` field) says which AwehChat user the app is acting for. The
key's permissions bound what it may do:

| Permission       | Allows                                                        |
|------------------|---------------------------------------------------------------|
| `contacts.read`  | `GET /contacts`, `GET /contacts/:id`                          |
| `contacts.write` | `POST /contacts`, `DELETE /contacts/:id`                      |
| `friends.read`   | `GET /connections`, legacy `/api/ecosystem/friends/list*`     |
| `friends.write`  | legacy `/api/ecosystem/friends/send-request`, `manage-request` |
| `profile.read`   | `POST /users/lookup`                                          |

Each key has a per-minute rate limit (default 100). Errors: `401` bad/missing key, `403`
revoked/expired key or missing permission, `404` no AwehChat account for that email,
`429` rate limited (see `Retry-After`).

## Contacts

### `GET /contacts` — read, then stay in sync

```
GET /api/v1/contacts?limit=200&include=connections
```

```json
{
  "contacts": [
    {
      "id": "8c1…", "name": "Thandi M", "email": "thandi@example.com", "phone": "+27 82 555 0101",
      "photoURL": null, "company": "Acme", "label": null, "notes": null,
      "source": "nexus", "syncedToApps": ["nexus", "awehchat"],
      "externalIds": { "nexus": "crm-42" },
      "awehchatUserId": "f3a…",
      "updatedAt": "2026-09-28T12:00:00.000Z", "deletedAt": null
    }
  ],
  "nextCursor": "MjAyNi0w…",
  "hasMore": false,
  "connections": [{ "awehchatUserId": "…", "name": "…", "email": "…", "photoURL": "…" }]
}
```

- **First call** (no `cursor`): the user's live contact book.
- **Every later call**: pass the last `nextCursor`. You get only what changed since, including
  deletions (`deletedAt` set). Store the cursor per user.
- While `hasMore` is true, call again immediately with the new cursor.
- `awehchatUserId` is set when the contact has an AwehChat account — show "Message" instead
  of "Invite".

### `POST /contacts` — upsert up to 500

```json
{
  "contacts": [
    { "externalId": "crm-42", "name": "Thandi M", "email": "thandi@example.com",
      "phone": "+27 82 555 0101", "company": "Acme" }
  ]
}
```

Matching, in order: your `externalId` → email → phone. So the same person pushed from three
apps stays one contact, and re-sending an item updates it. A partial update never blanks
existing fields. Each item needs at least one of email, phone or externalId.

```json
{ "results": [{ "index": 0, "id": "8c1…", "action": "created" }], "summary": { "created": 1 } }
```

### `GET /contacts/:id` · `DELETE /contacts/:id`

Delete is a soft delete, so every other app sees it as a tombstone on its next delta.

## People

- `GET /connections` — the user's accepted AwehChat friends.
- `POST /users/lookup` `{ "emails": ["a@x.com", "b@y.com"] }` — which of these emails
  have AwehChat accounts. Only confirms emails you already know; nothing is enumerable.
- `GET /health` — liveness, no auth.

## Example (TypeScript, server-side)

```ts
const res = await fetch('https://awehchat.co.za/api/v1/contacts?cursor=' + (cursor ?? ''), {
  headers: {
    Authorization: `Bearer ${process.env.AWEHCHAT_API_KEY}`,
    'X-User-Email': user.email,
  },
});
const { contacts, nextCursor } = await res.json();
```

## Legacy endpoints

`/api/second-brain/contacts` and `/api/ecosystem/friends/*` still work with the same keys
(header or the old `apiKey` body field) and now enforce permissions. `manage-request` also
requires `userEmail`, and that user must be party to the request. Prefer v1 for new work.
