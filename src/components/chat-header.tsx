import { Bell, Hash, Pin, Users, Sparkles } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { mockChannels } from '@/lib/placeholder-data';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';

export default function ChatHeader() {
  const currentChannel = mockChannels[0];

  return (
    <header className="flex items-center h-14 px-4 border-b border-white/5 shadow-md bg-neutral-900/60 backdrop-blur-xl z-10">
      <div className="flex items-center gap-2">
        <Hash className="w-6 h-6 text-muted-foreground" />
        <h2 className="font-semibold text-lg">{currentChannel.name}</h2>
      </div>

      <div className="flex-1" />

      <TooltipProvider>
        <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Sparkles className="w-5 h-5 text-primary" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Summarize Thread</p>
              </TooltipContent>
            </Tooltip>
          
          <div className="w-64">
            <Input
              placeholder={`Search in #${currentChannel.name}`}
              className="bg-neutral-900/50 border-none h-9"
            />
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon">
                <Bell className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Notification Settings</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon">
                <Pin className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Pinned Messages</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon">
                <Users className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Member List</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </header>
  );
}
