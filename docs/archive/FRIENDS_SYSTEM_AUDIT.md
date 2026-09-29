# Friends System Audit & Testing

## Overview

This is the **AUTHORITATIVE source of truth** for the entire ecosystem's friends data.

---

## 🔍 Current Architecture Review

### Tables Used
- `friends` table - stores friendship relationships
  - userId (initiator)
  - friendId (recipient)
  - status (pending/accepted/rejected/blocked)
  - createdAt, acceptedAt timestamps

### API Endpoints (User-Facing)
1. **GET /api/friends** - List user's friends
2. **POST /api/friends** - Send friend request
3. **PATCH /api/friends/[friendshipId]** - Accept/reject/block
4. **DELETE /api/friends/[friendshipId]** - Remove friend

### API Endpoints (Ecosystem / External Apps)
1. **POST /api/ecosystem/friends/send-request** - Nexus sends request
2. **POST /api/ecosystem/friends/manage-request** - Accept/reject/block via API key
3. **POST /api/ecosystem/friends/list** - Get user's friends via API key

---

## ⚠️ CRITICAL ISSUES FOUND

### Issue #1: Table Name Mismatch
- **Location:** `/api/ecosystem/friends/route.ts`
- **Problem:** References `friendships` table, but schema defines `friends` table
- **Impact:** API will crash with "table not found" error
- **Status:** MUST FIX

### Issue #2: Bidirectional Friendship Logic
- **Problem:** Code creates reverse friendships on accept, but deletes both on remove
- **Impact:** Can create orphaned records or missing friendships
- **Status:** NEEDS REVIEW

### Issue #3: Missing Email Notifications
- **Problem:** No email sent when friend request received
- **Impact:** User won't know about incoming requests from Nexus
- **Status:** MUST IMPLEMENT

### Issue #4: Inconsistent Status Handling
- **Problem:** Some endpoints allow 'rejected', others use deletion
- **Impact:** Data inconsistency across the system
- **Status:** NEEDS STANDARDIZATION

---

## 🧪 Test Plan

### Test 1: Basic Friend Request Flow (User-to-User)
```
1. User A sends friend request to User B
   → Check: Request created with status='pending'
   → Check: Only User B can see it
   
2. User B receives email notification (MISSING - IMPLEMENT)
   
3. User B accepts request
   → Check: Status updated to 'accepted'
   → Check: Both users can see each other in friends list
   → Check: Reverse friendship created
   
4. User A removes User B
   → Check: Both friendship directions deleted
   → Check: Neither user sees each other anymore
```

### Test 2: Nexus → Moswords Friend Request
```
1. User sends invite on Nexus gaming
   → Nexus calls POST /api/ecosystem/friends/send-request
   → Check: Request created in Moswords database
   
2. Moswords user gets email notification (MISSING - IMPLEMENT)
   → Body includes:
     - Inviter name from Nexus
     - "Accept" link with pre-filled action
     - "Decline" link
     - Custom message (if provided)
   
3. User clicks "Accept" in email (or app)
   → Check: Friendship status updated
   → Check: User appears in app friend list
   → Check: Notification sent back to Nexus
   
4. User declines
   → Check: Request deleted or marked rejected
   → Check: Not shown in friend list
```

### Test 3: Sync Between Systems
```
1. User has friends in Moswords app (source of truth)
2. Nexus fetches via POST /api/ecosystem/friends/list
   → Check: Gets full accurate list
   → Check: User info correct
   → Check: Timestamps preserved
3. Email Orca fetches via same endpoint
   → Check: Same data returned
   → Check: No data loss

4. Make friend request on Nexus
5. Sync to Moswords
   → Check: Shows in GET /api/friends as pending
   → Check: Email notification sent
6. Accept on Moswords app
7. Sync back to Nexus
   → Check: Status updated there
   → Check: Appears in Nexus friend list
```

### Test 4: Email Notification Flow
```
1. User A sends friend request to User B
   → Email sent to User B
   → Check: Email contains:
     ✓ Inviter name
     ✓ App name (Moswords)
     ✓ Accept button/link
     ✓ Decline button/link
     ✓ Unique token for tracking

2. User B clicks "Accept" in email
   → Request processed
   → Confirmation email sent
   → Check: Status confirmed

3. User B clicks "Decline" in email
   → Request deleted
   → Confirmation email sent
   → Check: Not in list anymore

4. User B doesn't respond (10 days)
   → Check: Reminder email sent (optional)
   → Check: Request still pending (not auto-delete)
```

### Test 5: Duplicate Prevention
```
1. User A sends friend request to User B
2. User A sends again immediately
   → Check: Error returned (already pending)
   
3. User B accepts
   → Check: Status = 'accepted'
   
4. User A tries to send request again
   → Check: Error returned (already friends)
   
5. User A blocks User B
6. User A tries to send request
   → Check: Error returned (blocked)
```

### Test 6: Blocking
```
1. User A sends request to User B
2. User B blocks User A
   → Check: Friendship marked as 'blocked'
   → Check: User A can't see User B
   → Check: User B can still see User A (blocked)
   
3. User B unblocks User A
   → Check: Blocked entry removed
   → Check: Can send new request
```

### Test 7: Data Integrity
```
1. Create 100 friend requests
2. Accept 50 of them
3. Reject 25 of them
4. Block 25 of them

5. Query: GET /api/friends?status=accepted
   → Check: Returns exactly 50
   
6. Query: GET /api/friends?status=pending
   → Check: Returns exactly 0 (all processed)
   
7. Query all friendships from database
   → Check: 50 'accepted' + 25 'blocked'
   → Check: 25 rejected are deleted
   → Check: No orphaned records
```

### Test 8: Ecosystem API Key Authentication
```
1. Send request with invalid API key
   → Check: 401 Unauthorized
   
2. Send request with disabled API key
   → Check: 403 Forbidden
   
3. Send request with valid Nexus API key
   → Check: 201 Created
   → Check: lastUsedAt updated on API key
   
4. Send request with Email Orca API key
   → Check: Works independently
   → Check: Doesn't interfere with Nexus
```

---

## 🛠️ Fixes Needed

### Fix #1: Table Name Consistency
**File:** `/api/ecosystem/friends/route.ts`
**Change:** `friendships` → `friends` (match schema)

### Fix #2: Add Email Notifications
**File:** Add integration with email system
```typescript
// When friend request created:
await sendFriendRequestEmail({
  recipientEmail: targetUser.email,
  senderName: senderUser.displayName,
  senderEmail: senderUser.email,
  acceptLink: `/api/friends/[id]/accept?token=xyz`,
  declineLink: `/api/friends/[id]/decline?token=xyz`,
});
```

### Fix #3: Standardize Rejection
**Pattern:** Always set status='rejected', never hard-delete
```typescript
// Instead of DELETE
await db
  .update(friends)
  .set({ status: 'rejected' })
  .where(eq(friends.id, friendshipId));
```

### Fix #4: Add Request Validation
```typescript
// Verify request is from/to correct user before accepting
if (friendship.friendId !== userId) {
  throw new Error('Only recipient can accept');
}
```

---

## 📊 Test Results Template

For each test, fill in:

```
Test #: [Number]
Name: [Test name]
Date: [YYYY-MM-DD HH:MM]
Tester: [Your name]

Setup:
- User A: [email/id]
- User B: [email/id]
- Setup steps...

Execution:
- Step 1: [Action] → Result: [PASS/FAIL]
- Step 2: [Action] → Result: [PASS/FAIL]
- ...

Database Check:
- Friends table count: [#]
- Pending requests: [#]
- Accepted friends: [#]
- Blocked users: [#]

Issues Found:
- [Issue 1]
- [Issue 2]

Notes:
- [Any observations]
```

---

## 🔐 Security Checks

- [ ] API keys validated on every ecosystem endpoint
- [ ] User authorization verified (only your own requests)
- [ ] Rate limiting on friend requests (prevent spam)
- [ ] Email tokens have expiry (prevent old tokens working)
- [ ] No user enumeration via email search
- [ ] Blocked users completely hidden
- [ ] Status history not exposed (privacy)

---

## 🔄 Sync Integrity

This app is the **SOURCE OF TRUTH**. External systems (Nexus, Email Orca) must:

1. **Always pull from Moswords** for authoritative state
2. **Use API keys** for authentication (no session)
3. **Handle eventual consistency** (may be lag)
4. **Notify Moswords** of state changes
5. **Never modify** friend data locally (read-only cache)

---

## 📈 Performance Benchmarks

Expected performance:
- Friend list query: <100ms
- Send request: <200ms
- Accept/reject: <150ms
- List all ecosystem friends: <300ms

---

## ✅ Completion Criteria

- [ ] All 8 tests pass
- [ ] No database inconsistencies
- [ ] Email notifications sent and received
- [ ] Nexus sync working
- [ ] Email Orca sync working
- [ ] No duplicates possible
- [ ] Blocking works properly
- [ ] Performance acceptable
- [ ] Security checks pass

---

## 🚀 Next Steps

1. Fix table name mismatch immediately
2. Implement email notifications
3. Run tests 1-8 multiple times
4. Document any issues found
5. Fix issues and retest
6. Verify Nexus integration
7. Mark as production-ready

