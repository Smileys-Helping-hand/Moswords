import type { User as FirebaseUser, UserInfo } from 'firebase/auth';

export interface UserProfile {
    uid: string;
    email?: string | null;
    displayName?: string | null;
    photoURL?: string | null;
    createdAt: Date;
}

export interface Server {
  id: string;
  name: string;
  imageUrl: string;
  imageHint: string;
}

export interface Channel {
  id: string;
  name: string;
  type: 'text' | 'voice';
  serverId: string;
}

export interface Member {
  uid: string;
  displayName: string;
  photoURL: string;
  imageHint: string;
  status: 'online' | 'offline' | 'idle';
  role: 'owner' | 'admin' | 'moderator' | 'member';
}

export interface Message {
  id: string;
  content: string;
  timestamp: any;
  author: {
    uid: string;
    name: string;
    avatarUrl: string;
    imageHint: string;
  };
  reactions: { emoji: string; count: number; reacted: boolean }[];
  isFlagged?: boolean;
  toxicityReason?: string;
}
