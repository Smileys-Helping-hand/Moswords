# Friends System Test Execution Guide

## 📋 Complete Testing Procedure

This guide provides step-by-step instructions to thoroughly test the friends system as the **authoritative ecosystem source of truth**.

---

## ✅ Pre-Test Checklist

- [ ] Development server running: `npm run dev`
- [ ] Database has at least 5 test users
- [ ] Email service configured and working
- [ ] API keys created for Nexus and Email Orca
- [ ] Authentication working (can login)
- [ ] Capacitor HTTP plugin enabled (no CORS issues)

---

## 🧪 Test Session Setup

### Create Test Users

```bash
# User A: Alice (Nexus Gaming)
Email: alice@nexus.com
Password: TestPass123!
DisplayName: Alice Gaming

# User B: Bob (Moswords App)
Email: bob@moswords.app
Password: TestPass123!
DisplayName: Bob Smith

# User C: Charlie (Email Orca)
Email: charlie@orca.app
Password: TestPass123!
DisplayName: Charlie Developer

# User D: Diana (Moswords App)
Email: diana@moswords.app
Password: TestPass123!
DisplayName: Diana Mobile

# User E: Eve (Blocked Test)
Email: eve@test.app
Password: TestPass123!
DisplayName: Eve Tester
```

### Get User IDs

```bash
# Query database to get UUIDs
SELECT id, email, display_name FROM users WHERE email IN (
  'alice@nexus.com',
  'bob@moswords.app',
  'charlie@orca.app',
  'diana@moswords.app',
  'eve@test.app'
);
```

Record:
- Alice ID: ___________
- Bob ID: ___________
- Charlie ID: ___________
- Diana ID: ___________
- Eve ID: ___________

---

## 🔑 Get API Keys

### Create Keys (if needed)

```bash
# For Nexus
POST /api/ecosystem/keys
{
  "appName": "Nexus Gaming"
}
Response: Save the apiKey

# For Email Orca  
POST /api/ecosystem/keys
{
  "appName": "Email Orca"
}
Response: Save the apiKey
```

Record:
- Nexus API Key: ___________
- Email Orca API Key: ___________

---

## 🧬 Test Scenarios

### TEST 1: User-to-User Friend Request (In-App)

**Scenario:** Alice sends friend request to Bob within the app

**Setup:**
1. Login as Alice
2. Navigate to Friends section
3. Search for "bob@moswords.app"

**Test Steps:**

```bash
# Step 1: Send friend request
POST /api/friends
{
  "friendId": "[BOB_ID]"
}

Expected Response:
{
  "friendship": {
    "id": "[FRIENDSHIP_ID]",
    "userId": "[ALICE_ID]",
    "friendId": "[BOB_ID]",
    "status": "pending",
    "createdAt": "2026-06-03T..."
  }
}

✓ Check: Database shows pending request
  SELECT * FROM friends WHERE id = '[FRIENDSHIP_ID]';
  
✓ Check: Alice sees it in her sent list
  GET /api/friends?status=pending
  
✓ Check: Bob receives email notification
  - Email subject contains "Alice Gaming"
  - Email has Accept and Decline buttons
  - Email contains "Nexus Gaming" or app context

# Step 2: Bob accepts request
Login as Bob
POST /api/friends/[FRIENDSHIP_ID]
{
  "action": "accept"
}

Expected Response:
{
  "message": "Friend request accepted"
}

✓ Check: Status updated in database
  SELECT status FROM friends WHERE id = '[FRIENDSHIP_ID]';
  Result: "accepted"

✓ Check: Reverse friendship created
  SELECT * FROM friends WHERE userId='[BOB_ID]' AND friendId='[ALICE_ID]';
  Result: Should exist with status='accepted'

✓ Check: Both users see each other in friends list
  Login as Alice: GET /api/friends
  Response includes Bob
  
  Login as Bob: GET /api/friends  
  Response includes Alice

# Step 3: Alice removes Bob as friend
POST /api/friends/[FRIENDSHIP_ID]
{
  "action": "delete" OR use DELETE /api/friends/[FRIENDSHIP_ID]
}

✓ Check: Both friendship records deleted
  SELECT COUNT(*) FROM friends WHERE userId='[ALICE_ID]' AND friendId='[BOB_ID]' OR userId='[BOB_ID]' AND friendId='[ALICE_ID]';
  Result: 0

✓ Check: Neither user sees other in friends list
  GET /api/friends (from both accounts)
  Neither sees the other
```

**Test Result:**
- [ ] PASS
- [ ] FAIL (Issue: _______________)

---

### TEST 2: Nexus → Moswords Friend Request (API)

**Scenario:** User sends invite on Nexus Gaming, appears in Moswords as friend request

**Test Steps:**

```bash
# Step 1: Nexus sends friend request via API
POST https://moswords.vercel.app/api/ecosystem/friends/send-request
Content-Type: application/json

{
  "apiKey": "[NEXUS_API_KEY]",
  "senderEmail": "alice@nexus.com",
  "targetEmail": "diana@moswords.app"
}

Expected Response:
{
  "success": true,
  "friendship": {
    "id": "[FRIENDSHIP_ID]",
    "status": "pending"
  },
  "message": "Friend request sent from alice@nexus.com to diana@moswords.app. Email notification sent.",
  "appName": "Nexus Gaming"
}

✓ Check: Friendship created in Moswords database
  SELECT * FROM friends WHERE userId='[ALICE_ID]' AND friendId='[DIANA_ID]';
  Result: Should exist with status='pending'

✓ Check: Email sent to Diana
  Subject: "Alice Gaming sent you a friend request from Nexus Gaming"
  Body contains: Accept and Decline links

# Step 2: Diana receives email and clicks Accept
Diana clicks "Accept" button in email or responds in app

Expected: Friendship status updated to 'accepted'

✓ Check: Status in database
  SELECT status FROM friends WHERE id='[FRIENDSHIP_ID]';
  Result: "accepted"

✓ Check: Both users see each other in friends list
  Login to Moswords as Diana: GET /api/friends
  Response includes Alice (from Nexus)

✓ Check: Nexus API can fetch Diana's friends (including Alice)
  POST /api/ecosystem/friends/list
  {
    "apiKey": "[NEXUS_API_KEY]",
    "userEmail": "diana@moswords.app",
    "status": "accepted"
  }
  Response includes Alice in friends list

# Step 3: Email Orca syncs Diana's friends
POST /api/ecosystem/friends/list
{
  "apiKey": "[EMAIL_ORCA_API_KEY]",
  "userEmail": "diana@moswords.app",
  "status": "accepted"
}

✓ Check: Same data as Nexus got
  Should include Alice with full details
  Should include same metadata
```

**Test Result:**
- [ ] PASS
- [ ] FAIL (Issue: _______________)

---

### TEST 3: Email Orca Sync

**Scenario:** Email Orca can list and manage friends via API

**Test Steps:**

```bash
# Step 1: Email Orca lists Charlie's friends
POST /api/ecosystem/friends/list
{
  "apiKey": "[EMAIL_ORCA_API_KEY]",
  "userEmail": "charlie@orca.app",
  "status": "accepted"
}

Expected Response:
{
  "success": true,
  "friends": [
    {
      "id": "[USER_ID]",
      "email": "[EMAIL]",
      "name": "[NAME]",
      "displayName": "[DISPLAY_NAME]",
      "photoURL": "[URL]",
      "friendshipId": "[FRIENDSHIP_ID]",
      "status": "accepted"
    }
  ],
  "count": [#]
}

✓ Check: Returns correct count
✓ Check: All users are accepted friends
✓ Check: User info complete and accurate

# Step 2: Email Orca sends friend request for Charlie
POST /api/ecosystem/friends/send-request
{
  "apiKey": "[EMAIL_ORCA_API_KEY]",
  "senderEmail": "charlie@orca.app",
  "targetEmail": "eve@test.app"
}

✓ Check: Friendship created
✓ Check: Eve receives email notification
✓ Check: API key lastUsedAt updated
  SELECT last_used_at FROM ecosystem_api_keys WHERE id='[KEY_ID]';
  Result: Should be recent timestamp
```

**Test Result:**
- [ ] PASS
- [ ] FAIL (Issue: _______________)

---

### TEST 4: Email Notifications

**Scenario:** Email notifications work correctly for all actions

**Test Steps:**

```bash
# Step 1: Send request and verify email arrives
[Same as TEST 1 Step 1]

✓ Check: Email arrives within 5 seconds
✓ Check: Email contains:
  - Sender name: "Alice Gaming"
  - App name: Should mention source (Nexus/Email Orca/App)
  - Accept button/link that works
  - Decline button/link that works
  - Sender email address

# Step 2: Click email link to accept
Extract link from email: /api/friends/[ID]/accept?token=...

GET /api/friends/[ID]/accept?token=...

✓ Check: Request processed
✓ Check: Status updated to accepted
✓ Check: Confirmation message shown

# Step 3: Repeat with decline link
GET /api/friends/[ID]/decline?token=...

✓ Check: Request deleted
✓ Check: Confirmation message shown
```

**Test Result:**
- [ ] PASS
- [ ] FAIL (Issue: _______________)

---

### TEST 5: Duplicate Prevention

**Scenario:** System prevents duplicate requests

**Test Steps:**

```bash
# Setup: Alice → Bob request pending
[Completed in TEST 1]

# Step 1: Alice tries to send again while pending
POST /api/friends
{
  "friendId": "[BOB_ID]"
}

Expected: 400 Error
{
  "error": "Friend request already pending" OR "Friendship already exists"
}

✓ Check: No duplicate created in database

# Step 2: Bob accepts request
[Completed in TEST 1]

# Step 3: Alice tries to send while friends
POST /api/friends
{
  "friendId": "[BOB_ID]"
}

Expected: 400 Error
{
  "error": "Already friends with this user"
}

✓ Check: No second request created

# Step 4: Alice blocks Bob
PATCH /api/friends/[REVERSE_ID]
{
  "action": "block"
}

# Step 5: Alice tries to send request again
POST /api/friends
{
  "friendId": "[BOB_ID]"
}

Expected: 400 Error OR cannot see Bob

✓ Check: Blocked users cannot send new requests
```

**Test Result:**
- [ ] PASS
- [ ] FAIL (Issue: _______________)

---

### TEST 6: Blocking

**Scenario:** Block functionality works correctly

**Test Steps:**

```bash
# Step 1: Create friendship
[Bob and Charlie are friends]

# Step 2: Bob blocks Charlie
Login as Bob
PATCH /api/friends/[FRIENDSHIP_ID]
{
  "action": "block"
}

✓ Check: Status updated to "blocked"
  SELECT status FROM friends WHERE id='[FRIENDSHIP_ID]';
  Result: "blocked"

# Step 3: Charlie cannot see Bob
Login as Charlie
GET /api/friends

✓ Check: Bob not in list
✓ Check: Blocked relationship not visible

# Step 4: Bob can still see Charlie (blocked)
Login as Bob
GET /api/friends?status=blocked

✓ Check: Charlie appears in blocked list

# Step 5: Unblock by deleting blocked entry
DELETE /api/friends/[BLOCKED_ID]

✓ Check: Blocked entry removed
✓ Check: Can send new friend request if desired
```

**Test Result:**
- [ ] PASS
- [ ] FAIL (Issue: _______________)

---

### TEST 7: Data Integrity & Performance

**Scenario:** System maintains data integrity under load

**Test Steps:**

```bash
# Step 1: Create 50 friend requests
for i in {1..50}; do
  POST /api/friends
  {
    "friendId": "[RANDOM_USER_ID]"
  }
done

✓ Check: All 50 created successfully
  SELECT COUNT(*) FROM friends WHERE status='pending';
  Result: 50 (or correct subset)

# Step 2: Accept 25 of them
for i in {1..25}; do
  PATCH /api/friends/[ID_{i}]
  {
    "action": "accept"
  }
done

# Step 3: Reject 15 of them
for i in {26..40}; do
  PATCH /api/friends/[ID_{i}]
  {
    "action": "reject"  // Or DELETE
  }
done

# Step 4: Block 10 of them
for i in {41..50}; do
  PATCH /api/friends/[ID_{i}]
  {
    "action": "block"
  }
done

✓ Check: Database integrity
  SELECT status, COUNT(*) FROM friends GROUP BY status;
  Result:
  - accepted: 25
  - rejected: 0 (deleted)
  - blocked: 10
  - pending: 0

# Step 5: Check performance
✓ Check: Query time <100ms
  GET /api/friends
  
✓ Check: Memory usage normal
✓ Check: No orphaned records
  SELECT COUNT(*) FROM friends f WHERE NOT EXISTS (
    SELECT 1 FROM users u WHERE u.id = f.user_id
  );
  Result: 0 (no orphans)
```

**Test Result:**
- [ ] PASS
- [ ] FAIL (Issue: _______________)

---

### TEST 8: Multi-System Sync Consistency

**Scenario:** All systems see the same friend data

**Test Steps:**

```bash
# Setup: Diana has friends: Alice (from Nexus), Bob (from App), Charlie (from Email Orca)

# Step 1: Diana logs into Moswords app and gets friend list
Login as Diana
GET /api/friends?status=accepted

Response_App = {
  "friends": [Alice, Bob, Charlie, ...],
  "count": 3
}

# Step 2: Nexus fetches Diana's friend list
POST /api/ecosystem/friends/list
{
  "apiKey": "[NEXUS_API_KEY]",
  "userEmail": "diana@moswords.app",
  "status": "accepted"
}

Response_Nexus = {
  "friends": [...],
  "count": 3
}

# Step 3: Email Orca fetches Diana's friend list
POST /api/ecosystem/friends/list
{
  "apiKey": "[EMAIL_ORCA_API_KEY]",
  "userEmail": "diana@moswords.app",
  "status": "accepted"
}

Response_Orca = {
  "friends": [...],
  "count": 3
}

✓ Check: All three responses have same count
  Response_App.count == Response_Nexus.count == Response_Orca.count

✓ Check: All friend IDs match
  Sort and compare friend IDs across all three

✓ Check: All metadata matches
  Names, emails, photoURLs should be identical

✓ Check: Timestamps consistent
  createdAt and acceptedAt should match
```

**Test Result:**
- [ ] PASS
- [ ] FAIL (Issue: _______________)

---

## 🔐 Security Tests

### Security Test 1: API Key Validation

```bash
# Invalid API Key
POST /api/ecosystem/friends/send-request
{
  "apiKey": "invalid_key_12345",
  "senderEmail": "alice@nexus.com",
  "targetEmail": "bob@moswords.app"
}

Expected: 401 Unauthorized
✓ Check: Request rejected
✓ Check: No friendship created
✓ Check: No email sent
```

### Security Test 2: User Authorization

```bash
# Try to accept request meant for someone else
POST /api/friends/[OTHER_USER_REQUEST_ID]
{
  "action": "accept"
}

Expected: 401 Unauthorized
✓ Check: Cannot accept other user's requests
```

### Security Test 3: No User Enumeration

```bash
# Search for non-existent user
POST /api/ecosystem/friends/send-request
{
  "apiKey": "[VALID_KEY]",
  "senderEmail": "valid@sender.com",
  "targetEmail": "definitely_does_not_exist_xyz@fake.com"
}

Expected: 404 User not found
✓ Check: Generic error, doesn't reveal system info
```

---

## 📊 Test Results Summary

### Overall Status

| Test | Result | Issues | Notes |
|------|--------|--------|-------|
| TEST 1: User-to-User | [ ] | [ ] | |
| TEST 2: Nexus API | [ ] | [ ] | |
| TEST 3: Email Orca | [ ] | [ ] | |
| TEST 4: Email Notify | [ ] | [ ] | |
| TEST 5: Duplicates | [ ] | [ ] | |
| TEST 6: Blocking | [ ] | [ ] | |
| TEST 7: Integrity | [ ] | [ ] | |
| TEST 8: Multi-Sync | [ ] | [ ] | |
| SEC Test 1: API Key | [ ] | [ ] | |
| SEC Test 2: Auth | [ ] | [ ] | |
| SEC Test 3: Enum | [ ] | [ ] | |

### Issues Found

```
Issue #1: [Description]
- Severity: [High/Medium/Low]
- Steps to Reproduce: [...]
- Expected: [...]
- Actual: [...]
- Fix: [...]

[Additional issues...]
```

---

## ✨ Sign-Off

**Tested By:** _____________________  
**Date:** _____________________  
**Status:** 
- [ ] All tests passed - READY FOR PRODUCTION
- [ ] Issues found - NEEDS FIXES
- [ ] Partial pass - NEEDS RETESTING

**Notes:**
```
[Any additional observations]
```

---

## 🔄 Retest Checklist

After fixes, retest in this order:
1. [ ] TEST 1: Basic flow (quick regression)
2. [ ] TEST 2: Nexus (critical for ecosystem)
3. [ ] TEST 3: Email Orca (critical for ecosystem)
4. [ ] TEST 4: Email notifications (user experience)
5. [ ] All security tests (safety)
6. [ ] Full TEST 7 & 8 (integrity & sync)

---

**This is the SOURCE OF TRUTH for the entire ecosystem.**  
**Ensure every test passes before shipping!**

