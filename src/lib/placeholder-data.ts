import type { Server, Channel, Member, Message, User } from './types';

export const mockUser: User = {
  uid: '1',
  displayName: 'ByteRider',
  email: 'bytor@example.com',
  photoURL: 'https://picsum.photos/seed/101/48/48',
  providerId: 'google.com',
  emailVerified: true,
  isAnonymous: false,
  metadata: {},
  providerData: [],
  refreshToken: '',
  tenantId: null,
  delete: async () => {},
  getIdToken: async () => '',
  getIdTokenResult: async () => ({} as any),
  reload: async () => {},
  toJSON: () => ({}),
};


export const mockServers: Server[] = [
  { id: '1', name: 'AI Mavericks', imageUrl: 'https://picsum.photos/seed/201/64/64', imageHint: 'abstract pattern' },
  { id: '2', name: 'Code Wizards', imageUrl: 'https://picsum.photos/seed/202/64/64', imageHint: 'abstract landscape' },
  { id: '3', name: 'Design Dribbblers', imageUrl: 'https://picsum.photos/seed/203/64/64', imageHint: 'abstract gradient' },
];

export const mockChannels: Channel[] = [
  { id: '1', name: 'general', type: 'text' },
  { id: '2', name: 'dev-talk', type: 'text' },
  { id: '3', name: 'design-critique', type: 'text' },
  { id: '4', name: 'random', type: 'text' },
  { id: '5', name: 'Lounge', type: 'voice' },
  { id: '6', name: 'Gaming', type: 'voice' },
];

export const mockMembers: Member[] = [
    { id: '1', name: 'ByteRider', avatarUrl: 'https://picsum.photos/seed/101/48/48', imageHint: 'person portrait', status: 'online', role: 'owner' },
    { id: '2', name: 'PixelPioneer', avatarUrl: 'https://picsum.photos/seed/102/48/48', imageHint: 'person portrait', status: 'online', role: 'admin' },
    { id: '3', name: 'SynthWave', avatarUrl: 'https://picsum.photos/seed/103/48/48', imageHint: 'person portrait', status: 'idle', role: 'moderator' },
    { id: '4', name: 'DataDaemon', avatarUrl: 'https://picsum.photos/seed/104/48/48', imageHint: 'person portrait', status: 'offline', role: 'member' },
    { id: '5', name: 'LogicLane', avatarUrl: 'https://picsum.photos/seed/105/48/48', imageHint: 'person portrait', status: 'online', role: 'member' },
    { id: '6', name: 'KernelKnight', avatarUrl: 'https://picsum.photos/seed/106/48/48', imageHint: 'person portrait', status: 'offline', role: 'member' },
];

export const mockMessages: Message[] = [
    {
        id: '1',
        author: mockMembers[1],
        content: 'Anyone have thoughts on the new Genkit release? Looks promising for building AI agents.',
        timestamp: '10:30 AM',
        reactions: [{ emoji: '🔥', count: 3, reacted: true }, { emoji: '🤔', count: 1, reacted: false }]
    },
    {
        id: '2',
        author: mockMembers[0],
        content: "Yeah, I've been playing with it. The flow abstraction is really powerful. Makes composing complex chains much cleaner.",
        timestamp: '10:31 AM',
        reactions: [{ emoji: '👍', count: 2, reacted: false }]
    },
    {
        id: '3',
        author: mockMembers[2],
        content: "How's the integration with Firebase? I'm thinking of using it for our auto-moderator.",
        timestamp: '10:32 AM',
        reactions: []
    },
    {
        id: '4',
        author: mockMembers[1],
        content: "Seamless. You can define a flow and expose it as a Cloud Function that triggers on Firestore events. Super easy.",
        timestamp: '10:33 AM',
        reactions: [{ emoji: '🤯', count: 1, reacted: true }]
    },
    {
        id: '5',
        author: mockMembers[4],
        content: "This new glassmorphism library is absolute garbage, what a waste of time.",
        timestamp: '10:45 AM',
        reactions: [],
        isFlagged: true,
        toxicityReason: "This message contains harsh and unproductive language, violating community guidelines for respectful discussion."
    },
     {
        id: '6',
        author: mockMembers[2],
        content: "Whoa, take it easy. Let's keep the feedback constructive.",
        timestamp: '10:46 AM',
        reactions: [{ emoji: '👀', count: 5, reacted: false }]
    },
];
