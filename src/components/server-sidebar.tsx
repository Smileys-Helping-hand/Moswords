import Image from 'next/image';
import { Plus, Compass } from 'lucide-react';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { mockServers } from '@/lib/placeholder-data';
import { MoswordsIcon } from './icons';

export default function ServerSidebar() {
  const activeServerId = mockServers[0].id;

  return (
    <nav className="w-20 bg-neutral-950/80 backdrop-blur-2xl flex flex-col items-center py-3 gap-3 z-20">
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="w-12 h-12 rounded-2xl bg-primary hover:bg-accent transition-all duration-300">
              <MoswordsIcon className="w-8 h-8 text-white" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Direct Messages</p>
          </TooltipContent>
        </Tooltip>

        <Separator className="w-8 bg-border/20" />

        <div className="flex flex-col gap-2 items-center">
          {mockServers.map((server) => (
            <Tooltip key={server.id}>
              <TooltipTrigger asChild>
                <div className="relative group">
                  <div
                    className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 bg-white rounded-r-full transition-all duration-300"
                    style={{
                      height: activeServerId === server.id ? '2.5rem' : '0',
                    }}
                  />
                  <div
                    className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 bg-white rounded-r-full transition-all duration-300 h-0 group-hover:h-5"
                    style={{
                      opacity: activeServerId === server.id ? 0 : 1,
                    }}
                  />

                  <Button variant="ghost" size="icon" className="w-12 h-12 rounded-2xl overflow-hidden">
                    <Image
                      src={server.imageUrl}
                      alt={server.name}
                      width={48}
                      height={48}
                      data-ai-hint={server.imageHint}
                      className={`transition-all duration-300 ease-in-out ${
                        activeServerId === server.id ? 'rounded-2xl' : 'rounded-full group-hover:rounded-2xl'
                      }`}
                    />
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{server.name}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="w-12 h-12 rounded-full bg-card hover:bg-green-500 text-green-400 hover:text-white transition-all duration-300 group">
              <Plus className="transition-transform duration-300 group-hover:rotate-90" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Add a Server</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="w-12 h-12 rounded-full bg-card hover:bg-green-500 text-green-400 hover:text-white transition-all duration-300 group">
              <Compass />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Explore Servers</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </nav>
  );
}
