"use client";

import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Room, createLocalTracks, LocalVideoTrack } from 'livekit-client';

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
          const div = document.createElement('div');
          div.className = 'remote-participant';
          div.id = `participant-${participant.identity}`;
          const name = document.createElement('div');
          name.textContent = participant.identity;
          div.appendChild(name);
          container.appendChild(div);
          participant.on('trackPublished', () => {
            // subscribe handled by autoSubscribe
          });
          participant.on('trackSubscribed', (track: any) => {
            const el = track.attach();
            el.style.maxWidth = '100%';
            div.appendChild(el);
          });
        });

        // Update muted state if no audio track
        setMuted(!localTracksRef.current.some(t => t.kind === 'audio'));

        room.on('participantDisconnected', (p) => {
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
        console.error('Failed to enable camera', err);
      }
    }
  };

  return (
    <div className="min-h-screen p-4 bg-background text-foreground">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold">Call — {roomName}</h1>
        {error && <div className="text-red-400">{error}</div>}
        {loading && <div>Connecting...</div>}

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-medium">You</h3>
            <div className="mt-2">
              <video ref={localVideoRef} autoPlay playsInline muted className="w-full rounded-lg bg-black/60" />
            </div>
          </div>
          <div>
            <h3 className="font-medium">Participants</h3>
            <div ref={remoteContainerRef} className="mt-2 space-y-2" />
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          <button
            className="px-4 py-2 bg-muted-foreground/10 rounded text-foreground"
            onClick={toggleMute}
          >
            {muted ? 'Unmute' : 'Mute'}
          </button>
          <button
            className="px-4 py-2 bg-muted-foreground/10 rounded text-foreground"
            onClick={toggleVideo}
          >
            {videoEnabled ? 'Stop Video' : 'Start Video'}
          </button>
          <button className="px-4 py-2 bg-red-600 rounded text-white" onClick={() => router.push('/')}>Leave</button>
        </div>
      </div>
    </div>
  );
}
