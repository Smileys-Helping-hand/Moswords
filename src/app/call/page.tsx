"use client";

import { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  LiveKitRoom,
  useTracks,
  useParticipants,
  useLocalParticipant,
  VideoTrack,
  RoomAudioRenderer,
  isTrackReference,
} from '@livekit/components-react';
import type { TrackReferenceOrPlaceholder } from '@livekit/components-react';
import { Track } from 'livekit-client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, Users, Loader2, AlertCircle,
} from 'lucide-react';

// ─── Main export with Suspense for useSearchParams ───────────────────────────

export default function CallPage() {
  return (
    <Suspense fallback={<FullscreenLoader label="Loading…" />}>
      <CallPageContent />
    </Suspense>
  );
}

// ─── Token fetch + LiveKitRoom wrapper ────────────────────────────────────────

function CallPageContent() {
  const params = useSearchParams();
  const router = useRouter();
  const rawRoom = params.get('room') || params.get('serverId') || 'default-room';
  const roomName = rawRoom && rawRoom.trim().length > 0 ? rawRoom : 'default-room';
  const type = params.get('type') || 'video';
  const backTo = params.get('from') || '/';

  const [livekitToken, setLivekitToken] = useState('');
  const [livekitUrl, setLivekitUrl] = useState('');
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const getToken = async () => {
      try {
        const res = await fetch('/api/call/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ room: roomName }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to get token');
        if (!cancelled) {
          setLivekitToken(data.token);
          setLivekitUrl(data.url);
        }
      } catch (err: any) {
        if (!cancelled) setFetchError(err.message || 'Failed to join call');
      } finally {
        if (!cancelled) setFetching(false);
      }
    };
    getToken();
    return () => { cancelled = true; };
  }, [roomName]);

  const handleDisconnect = useCallback(() => {
    router.push(backTo);
  }, [router, backTo]);

  if (fetching) return <FullscreenLoader label="Joining call…" />;
  if (fetchError) return <ErrorScreen error={fetchError} onBack={handleDisconnect} />;

  return (
    <LiveKitRoom
      token={livekitToken}
      serverUrl={livekitUrl}
      connect={true}
      audio={true}
      video={type === 'video'}
      onDisconnected={handleDisconnect}
      className="fixed inset-0 bg-black"
    >
      <RoomAudioRenderer />
      <CallRoomUI roomName={roomName} type={type} onLeave={handleDisconnect} />
    </LiveKitRoom>
  );
}

// ─── Room UI (requires LiveKitRoom context) ───────────────────────────────────

function CallRoomUI({
  roomName,
  type,
  onLeave,
}: {
  roomName: string;
  type: string;
  onLeave: () => void;
}) {
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();
  const participants = useParticipants();
  const [elapsed, setElapsed] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Running call timer
  useEffect(() => {
    const t = setInterval(() => setElapsed((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Auto-hide controls after 4 s of inactivity
  const revealControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setControlsVisible(false), 4000);
  }, []);

  useEffect(() => {
    revealControls();
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [revealControls]);

  // All camera track refs (local + remote)
  const allCameraTracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: false },
  );
  const remoteTrackRefs = allCameraTracks.filter((t) => !t.participant.isLocal);
  const localTrackRef = allCameraTracks.find((t) => t.participant.isLocal);

  const remoteCount = participants.filter((p) => !p.isLocal).length;
  const isSolo = remoteCount === 0;
  const isOneOnOne = remoteCount === 1;

  const fmt = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const ss = (s % 60).toString().padStart(2, '0');
    return `${m}:${ss}`;
  };

  const displayName = roomName.replace(/^group-/, '').replace(/-/g, ' ');

  return (
    <div
      className="fixed inset-0 bg-black overflow-hidden"
      onClick={revealControls}
      onTouchStart={revealControls}
    >
      {/* ── Main area ─────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {isSolo ? (
          <motion.div
            key="waiting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
          >
            <WaitingScreen roomName={displayName} />
          </motion.div>
        ) : isOneOnOne ? (
          <motion.div
            key="spotlight"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
          >
            <SpotlightView trackRef={remoteTrackRefs[0]} />
          </motion.div>
        ) : (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
          >
            <GridView trackRefs={remoteTrackRefs} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Local PiP ─────────────────────────────────── */}
      <LocalPiP trackRef={localTrackRef} isCameraEnabled={isCameraEnabled} />

      {/* ── Top HUD ───────────────────────────────────── */}
      <AnimatePresence>
        {controlsVisible && (
          <motion.div
            key="hud"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.2 }}
            className="absolute top-0 left-0 right-0 z-20 px-5 pt-10 pb-6 bg-gradient-to-b from-black/80 to-transparent pointer-events-none"
          >
            <p className="text-white font-semibold text-base capitalize truncate">{displayName}</p>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-white/60 text-sm tabular-nums">{fmt(elapsed)}</span>
              <span className="text-white/30">•</span>
              <div className="flex items-center gap-1.5 text-white/60 text-sm">
                <Users className="w-3.5 h-3.5" />
                <span>{participants.length}</span>
              </div>
              {!isMicrophoneEnabled && (
                <>
                  <span className="text-white/30">•</span>
                  <div className="flex items-center gap-1 text-amber-400 text-xs">
                    <MicOff className="w-3 h-3" />
                    <span>Muted</span>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Controls bar ──────────────────────────────── */}
      <AnimatePresence>
        {controlsVisible && (
          <motion.div
            key="controls"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-0 left-0 right-0 z-20 px-6 pb-10 pt-6 bg-gradient-to-t from-black/90 to-transparent"
          >
            <div className="flex items-center justify-center gap-5">
              <CallControlBtn
                label={isMicrophoneEnabled ? 'Mute' : 'Unmute'}
                icon={isMicrophoneEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                active={!isMicrophoneEnabled}
                onClick={() => localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)}
              />
              {type === 'video' && (
                <CallControlBtn
                  label={isCameraEnabled ? 'Camera off' : 'Camera on'}
                  icon={isCameraEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                  active={!isCameraEnabled}
                  onClick={() => localParticipant.setCameraEnabled(!isCameraEnabled)}
                />
              )}
              <CallControlBtn
                label="Leave"
                icon={<PhoneOff className="w-5 h-5" />}
                variant="danger"
                onClick={onLeave}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Spotlight: fills screen with one remote participant ──────────────────────

function SpotlightView({ trackRef }: { trackRef: TrackReferenceOrPlaceholder }) {
  const hasVideo = isTrackReference(trackRef) && !trackRef.publication?.isMuted;
  const identity = trackRef.participant.identity;

  return (
    <div className="absolute inset-0 bg-neutral-900 flex items-center justify-center">
      {hasVideo ? (
        <VideoTrack
          trackRef={trackRef}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <PulsingParticipantAvatar identity={identity} size="lg" />
      )}
      {/* Name badge */}
      <div className="absolute bottom-28 left-5 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
        <span className="text-white text-sm font-medium">{identity}</span>
      </div>
    </div>
  );
}

// ─── Grid: 2–6 remote participants ───────────────────────────────────────────

function GridView({ trackRefs }: { trackRefs: TrackReferenceOrPlaceholder[] }) {
  const count = trackRefs.length;
  const cols = count <= 2 ? 'grid-cols-1 sm:grid-cols-2' : count <= 4 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3';

  return (
    <div className={`absolute inset-0 grid ${cols} gap-1 p-1`}>
      {trackRefs.map((trackRef, i) => {
        const hasVideo = isTrackReference(trackRef) && !trackRef.publication?.isMuted;
        const identity = trackRef.participant.identity;
        return (
          <motion.div
            key={trackRef.participant.sid}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className="relative bg-neutral-900 rounded-xl overflow-hidden"
          >
            {hasVideo ? (
              <VideoTrack
                trackRef={trackRef}
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <PulsingParticipantAvatar identity={identity} size="sm" />
              </div>
            )}
            <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-full">
              <span className="text-white text-xs font-medium">{identity}</span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── Draggable local PiP ──────────────────────────────────────────────────────

function LocalPiP({
  trackRef,
  isCameraEnabled,
}: {
  trackRef?: TrackReferenceOrPlaceholder;
  isCameraEnabled: boolean;
}) {
  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0.08}
      initial={{ x: 0, y: 0 }}
      className="absolute bottom-28 right-4 z-30 w-[100px] h-[140px] md:w-32 md:h-44 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 cursor-grab active:cursor-grabbing touch-none"
      whileTap={{ scale: 0.97 }}
    >
      {isCameraEnabled && trackRef && isTrackReference(trackRef) ? (
        <VideoTrack
          trackRef={trackRef}
          className="w-full h-full object-cover [transform:scaleX(-1)]"
        />
      ) : (
        <div className="w-full h-full bg-neutral-800 flex items-center justify-center">
          <VideoOff className="w-5 h-5 text-white/30" />
        </div>
      )}
      <div className="absolute bottom-1 left-0 right-0 text-center text-[9px] text-white/60 font-medium">
        You
      </div>
    </motion.div>
  );
}

// ─── Waiting screen (no other participants yet) ───────────────────────────────

function WaitingScreen({ roomName }: { roomName: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-neutral-900 to-black gap-5">
      <motion.div
        className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center"
        animate={{ scale: [1, 1.08, 1], opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Users className="w-9 h-9 text-primary/80" />
      </motion.div>
      <div className="text-center px-8">
        <p className="text-white font-semibold text-lg capitalize">{roomName}</p>
        <motion.p
          className="text-white/50 text-sm mt-1"
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        >
          Waiting for others to join…
        </motion.p>
      </div>
    </div>
  );
}

// ─── Pulsing avatar for camera-off participants ───────────────────────────────

function PulsingParticipantAvatar({ identity, size }: { identity: string; size: 'sm' | 'lg' }) {
  const sz = size === 'lg' ? 96 : 56;
  const rings = size === 'lg' ? [1, 2, 3] : [1, 2];
  const ringBase = size === 'lg' ? 30 : 20;

  return (
    <div className="relative flex items-center justify-center">
      {rings.map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border border-primary/25"
          style={{ width: sz + i * ringBase, height: sz + i * ringBase }}
          animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, delay: i * 0.35, ease: 'easeInOut' }}
        />
      ))}
      <div
        className="relative z-10 rounded-full overflow-hidden ring-2 ring-primary/40 shadow-xl bg-neutral-700 flex items-center justify-center"
        style={{ width: sz, height: sz }}
      >
        <span className="text-white font-bold" style={{ fontSize: sz * 0.35 }}>
          {identity.slice(0, 2).toUpperCase()}
        </span>
      </div>
    </div>
  );
}

// ─── Control button ───────────────────────────────────────────────────────────

function CallControlBtn({
  label,
  icon,
  onClick,
  variant = 'default',
  active = false,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger';
  active?: boolean;
}) {
  const colors =
    variant === 'danger'
      ? 'bg-red-500 hover:bg-red-400 text-white'
      : active
        ? 'bg-white/25 text-white hover:bg-white/35'
        : 'bg-white/10 text-white/80 hover:bg-white/20';

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={onClick}
        aria-label={label}
        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90 ${colors}`}
      >
        {icon}
      </button>
      <span className="text-white/60 text-[11px] font-medium">{label}</span>
    </div>
  );
}

// ─── Fullscreen loading spinner ───────────────────────────────────────────────

function FullscreenLoader({ label }: { label: string }) {
  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-10 h-10 animate-spin text-primary" />
      <p className="text-white/60 text-sm">{label}</p>
    </div>
  );
}

// ─── Error screen ─────────────────────────────────────────────────────────────

function ErrorScreen({ error, onBack }: { error: string; onBack: () => void }) {
  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-6 px-8">
      <AlertCircle className="w-14 h-14 text-red-400" />
      <div className="text-center">
        <p className="text-white font-semibold text-lg">Couldn't join call</p>
        <p className="text-white/50 text-sm mt-1">{error}</p>
      </div>
      <button
        onClick={onBack}
        className="px-6 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors"
      >
        Go back
      </button>
    </div>
  );
}
