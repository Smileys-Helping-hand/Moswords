import type { User as FirebaseUser } from 'firebase/auth';

export interface User extends FirebaseUser {
  avatarUrl?: string;
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
}

export interface Member {
  id: string;
  name: string;
  avatarUrl: string;
  imageHint: string;
  status: 'online' | 'offline' | 'idle';
  role: 'owner' | 'admin' | 'moderator' | 'member';
}

export interface Message {
  id: string;
  content: string;
  timestamp: string;
  author: Member;
  reactions: { emoji: string; count: number; reacted: boolean }[];
  isFlagged?: boolean;
  toxicityReason?: string;
}
