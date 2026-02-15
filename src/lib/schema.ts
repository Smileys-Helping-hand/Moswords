import { pgTable, text, timestamp, integer, boolean, uuid, uniqueIndex, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('email_verified'),
  name: text('name'),
  image: text('image'),
  password: text('password'), // hashed password for email/password auth
  displayName: text('display_name'),
  photoURL: text('photo_url'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  points: integer('points').notNull().default(0),
  customStatus: text('custom_status').default('Just joined!'),
  themePreference: text('theme_preference').default('obsidian'),
  isPro: boolean('is_pro').notNull().default(false),
  lastSeen: timestamp('last_seen').notNull().defaultNow(),
  appearance: jsonb('appearance').$type<{
    theme: 'default' | 'light' | 'cyberpunk' | 'nord';
    accent: string;
    density: 'comfy' | 'compact';
  }>(),
});

// Accounts table for OAuth providers
export const accounts = pgTable('accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('provider_account_id').notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: text('token_type'),
  scope: text('scope'),
  id_token: text('id_token'),
  session_state: text('session_state'),
});

// Sessions table
export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionToken: text('session_token').notNull().unique(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires').notNull(),
});

// Verification tokens
export const verificationTokens = pgTable('verification_tokens', {
  identifier: text('identifier').notNull(),
  token: text('token').notNull().unique(),
  expires: timestamp('expires').notNull(),
});

// Servers/Workspaces table
export const servers = pgTable('servers', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  imageUrl: text('image_url'),
  inviteCode: text('invite_code').unique(),
  ownerId: uuid('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Server members table
export const serverMembers = pgTable('server_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  serverId: uuid('server_id').notNull().references(() => servers.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('member'), // 'owner', 'admin', 'member'
  joinedAt: timestamp('joined_at').notNull().defaultNow(),
});

// Channels table
export const channels = pgTable('channels', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull().default('text'), // 'text', 'voice', 'video'
  serverId: uuid('server_id').notNull().references(() => servers.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Messages table
export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  content: text('content').notNull(),
  contentNonce: text('content_nonce'),
  isEncrypted: boolean('is_encrypted').notNull().default(false),
  channelId: uuid('channel_id').notNull().references(() => channels.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  mediaUrl: text('media_url'),
  mediaType: text('media_type'), // 'image', 'video', 'audio', 'file'
  mediaEncrypted: boolean('media_encrypted').notNull().default(false),
  mediaNonce: text('media_nonce'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deleted: boolean('deleted').notNull().default(false),
});

// Message reactions table
export const messageReactions = pgTable('message_reactions', {
  id: text('id').primaryKey(),
  messageId: uuid('message_id').notNull().references(() => messages.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  userName: text('user_name').notNull(),
  emoji: text('emoji').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Direct messages table
export const directMessages = pgTable('direct_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  content: text('content').notNull(),
  contentNonce: text('content_nonce'),
  isEncrypted: boolean('is_encrypted').notNull().default(false),
  senderId: uuid('sender_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  receiverId: uuid('receiver_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  mediaUrl: text('media_url'),
  mediaType: text('media_type'), // 'image', 'video', 'audio', 'file'
  mediaEncrypted: boolean('media_encrypted').notNull().default(false),
  mediaNonce: text('media_nonce'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  read: boolean('read').notNull().default(false),
  archived: boolean('archived').notNull().default(false),
});

// Friends table
export const friends = pgTable(
  'friends',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    friendId: uuid('friend_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('pending'), // 'pending', 'accepted', 'blocked'
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => ({
    userFriendUnique: uniqueIndex('friends_user_friend_unique').on(t.userId, t.friendId),
  })
);

// User profiles table
export const userProfiles = pgTable('user_profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  bio: text('bio'),
  location: text('location'),
  website: text('website'),
  banner: text('banner'),
  pronouns: text('pronouns'),
  birthday: timestamp('birthday'),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Group chats table
export const groupChats = pgTable('group_chats', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  imageUrl: text('image_url'),
  createdBy: uuid('created_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Group chat members table
export const groupChatMembers = pgTable('group_chat_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  groupChatId: uuid('group_chat_id').notNull().references(() => groupChats.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('member'), // 'admin', 'member'
  joinedAt: timestamp('joined_at').notNull().defaultNow(),
});

// Group chat messages table
export const groupChatMessages = pgTable('group_chat_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  content: text('content').notNull(),
  contentNonce: text('content_nonce'),
  isEncrypted: boolean('is_encrypted').notNull().default(false),
  groupChatId: uuid('group_chat_id').notNull().references(() => groupChats.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  mediaUrl: text('media_url'),
  mediaType: text('media_type'), // 'image', 'video', 'audio', 'file'
  mediaEncrypted: boolean('media_encrypted').notNull().default(false),
  mediaNonce: text('media_nonce'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  deleted: boolean('deleted').notNull().default(false),
});

// Device keys for E2E encryption (per device)
export const deviceKeys = pgTable(
  'device_keys',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    deviceId: text('device_id').notNull(),
    publicKey: text('public_key').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    lastSeen: timestamp('last_seen').notNull().defaultNow(),
  },
  (t) => ({
    userDeviceUnique: uniqueIndex('device_keys_user_device_unique').on(t.userId, t.deviceId),
  })
);

// Conversation key envelopes per device
export const conversationKeys = pgTable(
  'conversation_keys',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    scope: text('scope').notNull(), // 'channel' | 'dm' | 'group'
    scopeId: text('scope_id').notNull(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    deviceId: text('device_id').notNull(),
    encryptedKey: text('encrypted_key').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => ({
    conversationDeviceUnique: uniqueIndex('conversation_keys_scope_device_unique').on(
      t.scope,
      t.scopeId,
      t.deviceId
    ),
  })
);

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  ownedServers: many(servers),
  serverMemberships: many(serverMembers),
  messages: many(messages),
  sentDirectMessages: many(directMessages, { relationName: 'sender' }),
  receivedDirectMessages: many(directMessages, { relationName: 'receiver' }),
  friends: many(friends, { relationName: 'user' }),
  friendOf: many(friends, { relationName: 'friend' }),
  profile: one(userProfiles),
  createdGroupChats: many(groupChats),
  groupChatMemberships: many(groupChatMembers),
  groupChatMessages: many(groupChatMessages),
  deviceKeys: many(deviceKeys),
  conversationKeys: many(conversationKeys),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const serversRelations = relations(servers, ({ one, many }) => ({
  owner: one(users, {
    fields: [servers.ownerId],
    references: [users.id],
  }),
  members: many(serverMembers),
  channels: many(channels),
}));

export const serverMembersRelations = relations(serverMembers, ({ one }) => ({
  server: one(servers, {
    fields: [serverMembers.serverId],
    references: [servers.id],
  }),
  user: one(users, {
    fields: [serverMembers.userId],
    references: [users.id],
  }),
}));

export const channelsRelations = relations(channels, ({ one, many }) => ({
  server: one(servers, {
    fields: [channels.serverId],
    references: [servers.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
  channel: one(channels, {
    fields: [messages.channelId],
    references: [channels.id],
  }),
  user: one(users, {
    fields: [messages.userId],
    references: [users.id],
  }),
  reactions: many(messageReactions),
}));

export const messageReactionsRelations = relations(messageReactions, ({ one }) => ({
  message: one(messages, {
    fields: [messageReactions.messageId],
    references: [messages.id],
  }),
  user: one(users, {
    fields: [messageReactions.userId],
    references: [users.id],
  }),
}));

export const directMessagesRelations = relations(directMessages, ({ one }) => ({
  sender: one(users, {
    fields: [directMessages.senderId],
    references: [users.id],
    relationName: 'sender',
  }),
  receiver: one(users, {
    fields: [directMessages.receiverId],
    references: [users.id],
    relationName: 'receiver',
  }),
}));

export const friendsRelations = relations(friends, ({ one }) => ({
  user: one(users, {
    fields: [friends.userId],
    references: [users.id],
    relationName: 'user',
  }),
  friend: one(users, {
    fields: [friends.friendId],
    references: [users.id],
    relationName: 'friend',
  }),
}));

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(users, {
    fields: [userProfiles.userId],
    references: [users.id],
  }),
}));

export const groupChatsRelations = relations(groupChats, ({ one, many }) => ({
  creator: one(users, {
    fields: [groupChats.createdBy],
    references: [users.id],
  }),
  members: many(groupChatMembers),
  messages: many(groupChatMessages),
}));

export const groupChatMembersRelations = relations(groupChatMembers, ({ one }) => ({
  groupChat: one(groupChats, {
    fields: [groupChatMembers.groupChatId],
    references: [groupChats.id],
  }),
  user: one(users, {
    fields: [groupChatMembers.userId],
    references: [users.id],
  }),
}));

export const groupChatMessagesRelations = relations(groupChatMessages, ({ one }) => ({
  groupChat: one(groupChats, {
    fields: [groupChatMessages.groupChatId],
    references: [groupChats.id],
  }),
  user: one(users, {
    fields: [groupChatMessages.userId],
    references: [users.id],
  }),
}));

export const deviceKeysRelations = relations(deviceKeys, ({ one }) => ({
  user: one(users, {
    fields: [deviceKeys.userId],
    references: [users.id],
  }),
}));

export const conversationKeysRelations = relations(conversationKeys, ({ one }) => ({
  user: one(users, {
    fields: [conversationKeys.userId],
    references: [users.id],
  }),
}));

// ===== NEXUSMAIL TABLES =====

// Registered apps table for NexusMail service
export const registeredApps = pgTable('registered_apps', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  apiKey: text('api_key').notNull().unique(),
  status: text('status').notNull().default('active'), // 'active', 'suspended', 'inactive'
  emailsSent: integer('emails_sent').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Email logs table for NexusMail service
export const emailLogs = pgTable('email_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  appSource: text('app_source').notNull(),
  recipient: text('recipient').notNull(),
  templateId: text('template_id').notNull(),
  status: text('status').notNull(), // 'sent', 'failed', 'pending'
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  errorMessage: text('error_message'),
});
