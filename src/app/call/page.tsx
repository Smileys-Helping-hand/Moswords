"use client";

import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Room, createLocalTracks, LocalVideoTrack } from 'livekit-client';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function CallPage() {
  const params = useSearchParams();
  const router = useRouter();
  const rawRoom = params.get('room') || params.get('serverId') || 'default-room';
  const roomName = rawRoom && rawRoom.trim().length > 0 ? rawRoom : 'default-room';
  const channelId = params.get('channelId') || '';
  const type = params.get('type') || 'video';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(type === 'video');
  const [participantCount, setParticipantCount] = useState(0);
  const roomRef = useRef<Room | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteContainerRef = useRef<HTMLDivElement | null>(null);
  const localTracksRef = useRef<Array<any>>([]);

  useEffect(() => {
    let mounted = true;
    const join = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/call/token?t=${Date.now()}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
          body: JSON.stringify({ room: roomName }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const apiError = typeof data?.error === 'string' ? data.error : 'Failed to get token';
          throw new Error(apiError);
        }
        const { token, url } = data;
        const tokenString = typeof token === 'string'
          ? token
          : (typeof data?.accessToken === 'string' ? data.accessToken : '')
            || (typeof token?.token === 'string' ? token.token : '')
            || (typeof token?.jwt === 'string' ? token.jwt : '')
            || (typeof token?.accessToken === 'string' ? token.accessToken : '')
            || '';
        if (!tokenString || !url) {
          const details = JSON.stringify({ tokenType: typeof token, hasUrl: !!url });
          throw new Error(`Invalid token response: ${details}`);
        }

        const room = new Room({ autoSubscribe: true });
        await room.connect(url, tokenString);
        roomRef.current = room;

        // create and publish local tracks
        const tracks = await createLocalTracks({ audio: true, video: type === 'video' });
        for (const t of tracks) {
          await room.localParticipant.publishTrack(t);
          localTracksRef.current.push(t);
          if (t.kind === 'video' && localVideoRef.current) {
            const el = (t as LocalVideoTrack).attach();
            el.style.maxWidth = '100%';
            el.style.width = '320px';
            try {
              localVideoRef.current.replaceWith(el);
            } catch (e) {
              // ignore if replace fails
            }
            localVideoRef.current = el as HTMLVideoElement;
          }
        }

        // render remote participants
        room.on('participantConnected', participant => {
          const container = remoteContainerRef.current;
          if (!container) return;
          
          setParticipantCount(prev => prev + 1);
          
          const div = document.createElement('div');
          div.className = 'remote-participant glass-card rounded-xl p-4 border border-white/20';
          div.id = `participant-${participant.identity}`;
          const name = document.createElement('div');
          name.className = 'text-sm font-medium mb-2 text-white';
          name.textContent = participant.identity;
          div.appendChild(name);
          container.appendChild(div);
          participant.on('trackPublished', () => {
            // subscribe handled by autoSubscribe
          });
          participant.on('trackSubscribed', (track: any) => {
            const el = track.attach();
            el.style.maxWidth = '100%';
            el.className = 'rounded-lg w-full';
            div.appendChild(el);
          });
        });

        // Update muted state if no audio track
        setMuted(!localTracksRef.current.some(t => t.kind === 'audio'));

        room.on('participantDisconnected', (p) => {
          setParticipantCount(prev => Math.max(0, prev - 1));
          const el = document.getElementById(`participant-${p.identity}`);
          if (el) el.remove();
        });
      } catch (err: any) {
        console.error('Call join error:', err);
        if (mounted) setError(err.message || 'Failed to join call');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    join();

    return () => {
      mounted = false;
      const room = roomRef.current;
      if (room) {
        room.disconnect();
      }
    };
  }, [roomName, type]);

  const toggleMute = async () => {
    const room = roomRef.current;
    if (!room) return;

    if (muted) {
      // create audio track and publish
      try {
        const [audio] = await createLocalTracks({ audio: true, video: false });
        if (audio) {
          await room.localParticipant.publishTrack(audio);
          localTracksRef.current.push(audio);
          setMuted(false);
        }
      } catch (err) {
        console.error('Failed to enable microphone', err);
      }
    } else {
      // unpublish and stop audio tracks
      try {
        const audioTracks = localTracksRef.current.filter(t => t.kind === 'audio');
        for (const t of audioTracks) {
          try {
            room.localParticipant.unpublishTrack(t);
          } catch (e) {}
          try { t.stop(); } catch (e) {}
        }
        localTracksRef.current = localTracksRef.current.filter(t => t.kind !== 'audio');
        setMuted(true);
      } catch (err) {
        console.error('Failed to mute', err);
      }
    }
  };

  const toggleVideo = async () => {
    const room = roomRef.current;
    if (!room) return;

    if (videoEnabled) {
      // disable video
      const videoTracks = localTracksRef.current.filter(t => t.kind === 'video');
      for (const t of videoTracks) {
        try { room.localParticipant.unpublishTrack(t); } catch (e) {}
        try { t.stop(); } catch (e) {}
      }
      localTracksRef.current = localTracksRef.current.filter(t => t.kind !== 'video');
      // remove local video element
      if (localVideoRef.current) {
        try { localVideoRef.current.remove(); } catch (e) {}
        const placeholder = document.createElement('video');
        placeholder.autoplay = true;
        placeholder.muted = true;
        placeholder.playsInline = true;
        placeholder.className = 'w-full rounded-lg bg-black/60';
        if (localVideoRef.current.parentElement) {
          localVideoRef.current.parentElement.appendChild(placeholder);
        }
      }
      setVideoEnabled(false);
    } else {
      // enable video
      try {
        const [, video] = await createLocalTracks({ audio: false, video: true });
        if (video) {
          await room.localParticipant.publishTrack(video);
          localTracksRef.current.push(video);
          if (localVideoRef.current) {
            const el = (video as LocalVideoTrack).attach();
            el.style.maxWidth = '100%';
            el.style.width = '320px';
            try { localVideoRef.current.replaceWith(el); } catch (e) {}
            localVideoRef.current = el as HTMLVideoElement;
          }
        }
        setVideoEnabled(true);
      } catch (err) {
        console.error('Failed to enable video:', err);
      }
    };

    return (
      <div className="min-h-screen w-full flex flex-col bg-gradient-to-br from-background via-background to-primary/5 text-foreground">
      <div className="max-w-7xl mx-auto p-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel rounded-2xl border border-white/10 overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gradient">
                {type === 'video' ? 'Video' : 'Voice'} Call
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Room: {roomName} • {participantCount} {participantCount === 1 ? 'participant' : 'participants'}
              </p>
            </div>
            <Button
              onClick={() => {
                if (roomRef.current) {
                  roomRef.current.disconnect();
                }
                router.push('/');
              }}
              variant="destructive"
              className="gap-2"
            >
              <PhoneOff className="w-4 h-4" />
              Leave Call
            </Button>
          </div>

          {/* Content */}
          <div className="p-6">
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400"
              >
                {error}
              </motion.div>
            )}
            
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="ml-3 text-lg">Connecting to call...</span>
              </div>
            )}

            {!loading && !error && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Local Video */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="glass-card rounded-xl p-4 border border-white/20"
                >
                  <h3 className="font-medium mb-3 text-white flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    You
                  </h3>
                  <div className="relative aspect-video bg-black/60 rounded-lg overflow-hidden">
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    {!videoEnabled && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <VideoOff className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Remote Participants */}
                <div>
                  <h3 className="font-medium mb-3 text-white">
                    Participants ({participantCount})
                  </h3>
                  <div ref={remoteContainerRef} className="space-y-4">
                    {participantCount === 0 && (
                      <div className="glass-card rounded-xl p-8 border border-white/10 text-center">
                        <p className="text-muted-foreground">Waiting for others to join...</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Controls */}
            {!loading && !error && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-6 flex justify-center gap-4"
              >
                <Button
                  onClick={toggleMute}
                  variant={muted ? "destructive" : "secondary"}
                  className="gap-2 min-w-[120px]"
                >
                  {muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  {muted ? 'Unmute' : 'Mute'}
                </Button>
                {type === 'video' && (
                  <Button
                    onClick={toggleVideo}
                    variant={videoEnabled ? "secondary" : "destructive"}
                    className="gap-2 min-w-[140px]"
                  >
                    {videoEnabled ? (
                      <>
                        <VideoIcon className="w-4 h-4" />
                        Stop Video
                      </>
                    ) : (
                      <>
                        <VideoOff className="w-4 h-4" />
                        Start Video
                      </>
                    )}
                  </Button>
                )}
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
