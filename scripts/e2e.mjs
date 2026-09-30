// End-to-end journey test: sign up → find & add each other → DMs → groups →
// archive / folders / pin → search, plus the checks that outsiders are kept out.
//
// Creates throwaway accounts, so it only runs against a LOCAL server backed by a
// throwaway database (see README → Develop).
//
//   npm run build && npm start -- -p 3100      (with .env.local → local Postgres)
//   node scripts/e2e.mjs http://localhost:3100
import crypto from 'node:crypto';

const BASE = process.argv[2] || 'http://localhost:3100';
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE)) {
  console.error(`Refusing to create test accounts on ${BASE}: run this against a local server only.`);
  process.exit(2);
}
const run = crypto.randomBytes(3).toString('hex');
const PASSWORD = `T3st!${crypto.randomBytes(6).toString('hex')}`;
let passed = 0;
let failed = 0;

function check(name, cond, detail = '') {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.log(`  ✗ ${name} ${detail}`); }
}

class Client {
  constructor(label) { this.label = label; this.cookies = new Map(); }
  cookieHeader() { return [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; '); }
  store(res) {
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const [pair] = c.split(';');
      const i = pair.indexOf('=');
      this.cookies.set(pair.slice(0, i), pair.slice(i + 1));
    }
  }
  async req(method, path, body, extra = {}) {
    const headers = { cookie: this.cookieHeader(), ...(extra.headers || {}) };
    let payload;
    if (body instanceof URLSearchParams) { payload = body; headers['content-type'] = 'application/x-www-form-urlencoded'; }
    else if (body !== undefined) { payload = JSON.stringify(body); headers['content-type'] = 'application/json'; }
    const res = await fetch(BASE + path, { method, headers, body: payload, redirect: 'manual' });
    this.store(res);
    let data = null;
    const text = await res.text();
    try { data = JSON.parse(text); } catch { data = text; }
    return { status: res.status, data };
  }
  async signup(name) {
    this.email = `e2e-${this.label}-${run}@example.test`;
    this.name = name;
    return this.req('POST', '/api/auth/signup', { email: this.email.toUpperCase(), password: PASSWORD, name });
  }
  async login() {
    const csrf = await this.req('GET', '/api/auth/csrf');
    const form = new URLSearchParams({ csrfToken: csrf.data.csrfToken, email: this.email, password: PASSWORD, json: 'true' });
    await this.req('POST', '/api/auth/callback/credentials', form);
    const s = await this.req('GET', '/api/auth/session');
    this.id = s.data?.user?.id;
    return this.id;
  }
}

const A = new Client('amara'), B = new Client('bongani'), C = new Client('chloe'), D = new Client('outsider');
const results = {};

console.log(`\n1. Sign up (run ${run})`);
for (const [cl, name] of [[A, `Amara ${run}`], [B, `Bongani ${run}`], [C, `Chloe ${run}`], [D, `Dieter ${run}`]]) {
  const r = await cl.signup(name);
  check(`${name} signs up`, r.status === 201, JSON.stringify(r.data));
}
const dup = await A.req('POST', '/api/auth/signup', { email: A.email, password: PASSWORD, name: 'x' });
check('duplicate email (different case) rejected', dup.status === 400);
const weak = await new Client('weak').req('POST', '/api/auth/signup', { email: `weak-${run}@example.test`, password: 'short', name: 'x' });
check('short password rejected', weak.status === 400);

console.log('\n2. Sign in');
for (const cl of [A, B, C, D]) check(`${cl.name} signs in (email typed in upper case at signup)`, !!(await cl.login()));
const bad = new Client('bad'); bad.email = A.email;
const csrf = await bad.req('GET', '/api/auth/csrf');
await bad.req('POST', '/api/auth/callback/credentials', new URLSearchParams({ csrfToken: csrf.data.csrfToken, email: A.email, password: 'wrong-password', json: 'true' }));
const badSession = await bad.req('GET', '/api/auth/session');
check('wrong password gives no session', !badSession.data?.user);

console.log('\n3. Find and add each other');
const found = await A.req('GET', `/api/users/search?q=${encodeURIComponent('Bongani')}`);
const hitB = found.data.users?.find((u) => u.id === B.id);
check('Amara finds Bongani by name', !!hitB);
check('…with the email masked', hitB && hitB.email !== B.email && hitB.email.includes('•'));
const byEmail = await A.req('GET', `/api/users/search?q=${encodeURIComponent(C.email)}`);
check('Amara finds Chloe by exact email', byEmail.data.users?.[0]?.id === C.id);
const enumerate = await A.req('GET', '/api/users/search?q=example.test');
check('no email enumeration by domain', (enumerate.data.users || []).length === 0);

const req1 = await A.req('POST', '/api/friends', { friendId: B.id });
check('Amara sends Bongani a friend request', req1.status === 201, JSON.stringify(req1.data));
const bSync = await B.req('GET', '/api/sync');
check('Bongani sees 1 pending request via sync', bSync.data.friendRequests === 1, JSON.stringify(bSync.data.friendRequests));
const bFriends = await B.req('GET', '/api/friends');
const pending = (bFriends.data.pendingRequests || []).find((f) => f.userId === A.id);
check('Bongani lists the request', !!pending, JSON.stringify(bFriends.data).slice(0, 200));
const acc = await B.req('PATCH', `/api/friends/${pending?.id}`, { action: 'accept' });
check('Bongani accepts', acc.status === 200, JSON.stringify(acc.data));

const cReq = await C.req('POST', '/api/friends', { friendId: A.id });
check('Chloe sends Amara a request', cReq.status === 201);
const mutual = await A.req('POST', '/api/friends', { friendId: C.id });
check('Amara adding Chloe back auto-accepts', mutual.data?.accepted === true, JSON.stringify(mutual.data));
const aFriends = await A.req('GET', '/api/friends');
const accepted = (aFriends.data.friends || []).filter((f) => f.status === 'accepted').map((f) => f.friend?.id);
check('Amara now has 2 friends', accepted.includes(B.id) && accepted.includes(C.id), JSON.stringify(accepted));

console.log('\n4. Direct messages');
let cursorB = (await B.req('GET', '/api/sync')).data.cursor;
const dm = await A.req('POST', '/api/direct-messages', { receiverId: B.id, content: `hello bongani ${run}` });
check('Amara messages Bongani', dm.status === 201, JSON.stringify(dm.data).slice(0, 200));
const xss = await A.req('POST', '/api/direct-messages', { receiverId: B.id, content: 'x', mediaUrl: 'javascript:alert(1)' });
check('javascript: media URL rejected', xss.status === 400);
const syncB = await B.req('GET', `/api/sync?cursor=${encodeURIComponent(cursorB)}`);
check('Bongani receives it through sync', syncB.data.dms?.some((m) => m.content === `hello bongani ${run}`));
const convB = await B.req('GET', '/api/conversations');
const withA = convB.data.conversations?.find((c) => c.otherUserId === A.id);
check('Bongani\'s list shows Amara with 1 unread', withA?.unreadCount === 1, JSON.stringify(withA));
let cursorA = (await A.req('GET', '/api/sync')).data.cursor;
await B.req('PATCH', `/api/conversations/${A.id}`, { read: true });
const syncA = await A.req('GET', `/api/sync?cursor=${encodeURIComponent(cursorA)}`);
check('Amara gets the read receipt', syncA.data.reads?.some((r) => r.id === dm.data.message.id));
await A.req('POST', '/api/typing', { scope: 'dm', scopeId: B.id });
const typing = await B.req('GET', `/api/sync?cursor=${encodeURIComponent(syncB.data.cursor)}`);
check('Bongani sees Amara typing', typing.data.typing?.some((t) => t.userId === A.id));
const snoop = await D.req('GET', `/api/conversations/${A.id}`);
check('an outsider sees none of that chat', Array.isArray(snoop.data.messages) && !snoop.data.messages.some((m) => m.content?.includes('hello bongani')));

console.log('\n5. Groups');
const g = await A.req('POST', '/api/group-chats', { name: `Braai crew ${run}`, memberIds: [B.id, C.id] });
check('Amara creates a group with Bongani and Chloe', g.status === 200 && g.data.memberCount === 3, JSON.stringify(g.data).slice(0, 200));
const gid = g.data.groupChat?.id;
const noMembers = await A.req('POST', '/api/group-chats', { name: 'empty', memberIds: [] });
check('group with no other members rejected', noMembers.status === 400);
cursorA = (await A.req('GET', '/api/sync')).data.cursor;
const gm = await C.req('POST', `/api/group-chats/${gid}/messages`, { content: `lekker ${run}` });
check('Chloe posts in the group', gm.status === 200 || gm.status === 201, JSON.stringify(gm.data).slice(0, 200));
const gs = await A.req('GET', `/api/sync?cursor=${encodeURIComponent(cursorA)}`);
check('Amara receives it through sync', gs.data.groupMessages?.some((m) => m.groupChatId === gid));
const gl = await A.req('GET', '/api/group-chats');
const grp = gl.data.groupChats?.find((x) => x.id === gid);
check('group list shows member count + latest message', grp?.memberCount === 3 && grp?.lastMessage?.content === `lekker ${run}`, JSON.stringify(grp));
const dRead = await D.req('GET', `/api/group-chats/${gid}/messages`);
check('an outsider cannot read the group', dRead.status === 403);
const dSync = await D.req('GET', `/api/sync?cursor=${encodeURIComponent(cursorA)}`);
check('an outsider gets nothing from sync', (dSync.data.groupMessages || []).length === 0 && (dSync.data.dms || []).length === 0);

console.log('\n6. Archive, folders, pin');
const arch = await A.req('PATCH', '/api/chats/preferences', { chatType: 'dm', chatId: B.id, archived: true });
check('Amara archives the chat with Bongani', arch.status === 200 && arch.data.pref.archived === true);
const bPrefs = await B.req('GET', '/api/chats/preferences');
check('…it stays unarchived for Bongani', !(bPrefs.data.prefs || []).some((p) => p.chatId === A.id && p.archived));
const f = await A.req('POST', '/api/chats/folders', { name: 'Family' });
check('Amara creates a "Family" folder', f.status === 201);
const move = await A.req('PATCH', '/api/chats/preferences', { chatType: 'group', chatId: gid, folderId: f.data.folder.id, pinned: true });
check('moves the group into it and pins it', move.status === 200 && move.data.pref.folderId === f.data.folder.id && move.data.pref.pinned);
const aPrefs = await A.req('GET', '/api/chats/preferences');
check('preferences come back on reload', aPrefs.data.folders?.length === 1 && aPrefs.data.prefs?.length === 2);
const steal = await D.req('PATCH', '/api/chats/preferences', { chatType: 'group', chatId: gid, archived: true });
check('an outsider cannot touch that group', steal.status === 403);
const foreignFolder = await D.req('PATCH', `/api/chats/folders/${f.data.folder.id}`, { name: 'hacked' });
check('…or rename someone else\'s folder', foreignFolder.status === 404);
const del = await A.req('DELETE', `/api/chats/folders/${f.data.folder.id}`);
const afterDel = await A.req('GET', '/api/chats/preferences');
check('deleting the folder keeps the chat (folder cleared)', del.status === 200 && afterDel.data.prefs.find((p) => p.chatId === gid)?.folderId === null);
const unarch = await A.req('PATCH', '/api/conversations/' + B.id, { archived: false });
const afterUn = await A.req('GET', '/api/chats/preferences');
check('unarchive via the chat screen works', unarch.status === 200 && afterUn.data.prefs.find((p) => p.chatId === B.id)?.archived === false);

console.log('\n7. Search, contacts, health');
const s = await A.req('GET', `/api/search?q=${encodeURIComponent('lekker ' + run)}`);
check('message search finds the group message', s.data.results?.some((r) => r.kind === 'group'));
const sD = await D.req('GET', `/api/search?q=${encodeURIComponent('lekker ' + run)}`);
check('…but not for an outsider', (sD.data.results || []).length === 0);
const contact = await A.req('POST', '/api/contacts', { name: 'Thandi', email: 'thandi@example.test', phone: '+27 82 555 0101' });
const contacts = await A.req('GET', '/api/contacts');
check('contact book saves and lists contacts', contact.status === 201 && contacts.data.contacts?.some((c) => c.name === 'Thandi'));
const h = await A.req('GET', '/api/health');
check('health reports ok', h.data.status === 'ok', JSON.stringify(h.data));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
