export interface UserProfile {
    uid: string;
    email?: string | null;
    displayName?: string | null;
    photoURL?: string | null;
    createdAt: any;
    last_seen?: any;
    points?: number;
    customStatus?: string;
    themePreference?: 'obsidian' | 'neon' | 'classic';
    bannerUrl?: string;
    socialLinks?: {
        twitter?: string;
        github?: string;
        [key: string]: string | undefined;
    };
    isPro?: boolean;
}

export interface Server {
  id: string;
  name: string;
  imageUrl: string;
  imageHint: string;
}

export interface Channel {
  id:string;
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
    displayName: string;
    photoURL: string;
    imageHint: string;
  };
  reactions: { emoji: string; count: number; reacted: boolean }[];
  isFlagged?: boolean;
  toxicityReason?: string;
}

export interface Quest {
    id: string;
    title: string;
    description?: string;
    dueDate?: any;
    assigneeId?: string;
    pointsValue: number;
    status: 'pending' | 'completed' | 'approved';
    flyerRef?: string;
}

export interface Reward {
    id: string;
    item: string;
    cost: number;
    icon?: string;
}
