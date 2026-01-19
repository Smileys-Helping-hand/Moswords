import type { Server, Channel, Member, Message, UserProfile } from './types';

export const mockUser: UserProfile = {
    uid: '1',
    displayName: 'ByteRider',
    email: 'bytor@example.com',
    photoURL: 'https://picsum.photos/seed/101/48/48',
    createdAt: new Date(),
    last_seen: new Date(),
    points: 100,
    customStatus: 'Just joined!',
    themePreference: 'obsidian',
    isPro: false,
};


export const mockServers: Server[] = [
  { id: '1', name: 'AI Mavericks', imageUrl: 'https://picsum.photos/seed/201/64/64', imageHint: 'abstract pattern' },
  { id: '2', name: 'Code Wizards', imageUrl: 'https://picsum.photos/seed/202/64/64', imageHint: 'abstract landscape' },
  { id: '3', name: 'Design Dribbblers', imageUrl: 'https://picsum.photos/seed/203/64/64', imageHint: 'abstract gradient' },
];

export const mockChannels: Channel[] = [
    { id: '1', name: 'general', type: 'text', serverId: '1' },
    { id: '2', name: 'dev-talk', type: 'text', serverId: '1' },
    { id: '3', name: 'design-critique', type: 'text', serverId: '1' },
    { id: '4', name: 'random', type: 'text', serverId: '1' },
    { id: '5', name: 'Lounge', type: 'voice', serverId: '1' },
    { id: '6', name: 'Gaming', type: 'voice', serverId: '1' },
];

export const mockMembers: Member[] = [
        { uid: '1', displayName: 'ByteRider', photoURL: 'https://picsum.photos/seed/101/48/48', imageHint: 'person portrait', status: 'online', role: 'owner' },
        { uid: '2', displayName: 'PixelPioneer', photoURL: 'https://picsum.photos/seed/102/48/48', imageHint: 'person portrait', status: 'online', role: 'admin' },
        { uid: '3', displayName: 'SynthWave', photoURL: 'https://picsum.photos/seed/103/48/48', imageHint: 'person portrait', status: 'idle', role: 'moderator' },
        { uid: '4', displayName: 'DataDaemon', photoURL: 'https://picsum.photos/seed/104/48/48', imageHint: 'person portrait', status: 'offline', role: 'member' },
        { uid: '5', displayName: 'LogicLane', photoURL: 'https://picsum.photos/seed/105/48/48', imageHint: 'person portrait', status: 'online', role: 'member' },
        { uid: '6', displayName: 'KernelKnight', photoURL: 'https://picsum.photos/seed/106/48/48', imageHint: 'person portrait', status: 'offline', role: 'member' },
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
        content: "Seamless. You can define a flow and expose it as a Cloud Function that triggers on a Firestore event. Super easy.",
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
