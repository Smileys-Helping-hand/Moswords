import UserAvatar from './user-avatar';
import type { Member } from '@/lib/types';
import { mockMembers } from '@/lib/placeholder-data';
import { Crown } from 'lucide-react';

function MemberRow({ member }: { member: Member }) {
  const statusColor = {
    online: 'bg-green-500',
    idle: 'bg-yellow-500',
    offline: 'bg-gray-500',
  };

  return (
    <div className="flex items-center gap-3 p-2 rounded-md hover:bg-secondary">
      <UserAvatar 
        src={member.avatarUrl} 
        imageHint={member.imageHint}
        status={member.status} 
      />
      <p className={`font-medium ${member.status === 'offline' ? 'text-muted-foreground' : ''}`}>
        {member.name}
      </p>
      {member.role === 'owner' && <Crown className="w-4 h-4 text-yellow-500" />}
    </div>
  );
}

export default function MemberSidebar() {
    const admins = mockMembers.filter(m => m.role === 'admin' || m.role === 'owner');
    const moderators = mockMembers.filter(m => m.role === 'moderator');
    const onlineMembers = mockMembers.filter(m => m.role === 'member' && m.status !== 'offline');
    const offlineMembers = mockMembers.filter(m => m.role === 'member' && m.status === 'offline');

  return (
    <aside className="w-64 flex-shrink-0 bg-neutral-900/60 backdrop-blur-xl p-3 space-y-4 overflow-y-auto">
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground px-2 mb-1">Admins — {admins.length}</h3>
        <div className="space-y-1">
            {admins.map(member => <MemberRow key={member.id} member={member} />)}
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground px-2 mb-1">Moderators — {moderators.length}</h3>
        <div className="space-y-1">
            {moderators.map(member => <MemberRow key={member.id} member={member} />)}
        </div>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground px-2 mb-1">Members — {onlineMembers.length}</h3>
        <div className="space-y-1">
            {onlineMembers.map(member => <MemberRow key={member.id} member={member} />)}
        </div>
      </div>
       <div>
        <h3 className="text-sm font-semibold text-muted-foreground px-2 mb-1">Offline — {offlineMembers.length}</h3>
        <div className="space-y-1">
            {offlineMembers.map(member => <MemberRow key={member.id} member={member} />)}
        </div>
      </div>
    </aside>
  );
}
