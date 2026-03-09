"use client";

/**
 * CallScreen.tsx
 *
 * Full-screen call UI that maps onto the useWebRTC state machine:
 *  idle          → not rendered (parent controls visibility)
 *  ringing-out   → "Calling…" overlay with Cancel
 *  ringing-in    → "Incoming Call" overlay with Accept / Decline
 *  connecting    → connecting spinner
 *  connected     → remote video fullscreen, local PiP (draggable), controls bar
 *  ended         → "Call Ended" flash banner
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneIncoming,
  PhoneMissed,
  Loader2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import UserAvatar from '@/components/user-avatar';
import type { CallState, CallParticipant } from '@/hooks/use-webrtc';
import { cn } from '@/lib/utils';

// ─── Prop types ───────────────────────────────────────────────────────────────

interface CallScreenProps {
  callState: CallState;
  remoteParticipant: CallParticipant | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isCameraOff: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onEnd: () => void;
  onToggleMute: () => void;
  onToggleCamera: () => void;
}

// ─── Video element that binds a MediaStream ───────────────────────────────────

function StreamVideo({
  stream,
  muted = false,
  className,
  mirror = false,
}: {
  stream: MediaStream | null;
  muted?: boolean;
  className?: string;
  mirror?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted={muted}
      className={cn(className, mirror && '[transform:scaleX(-1)]')}
    />
  );
}

// ─── Pulsing Avatar ───────────────────────────────────────────────────────────

function PulsingAvatar({ participant, size = 'md' }: { participant: CallParticipant; size?: 'md' | 'lg' }) {
  const avatarSize = size === 'lg' ? 'w-28 h-28' : 'w-24 h-24';
  const ringBase = size === 'lg' ? 95 : 80;
  const ringStep = size === 'lg' ? 38 : 30;

  return (
    <div className="relative flex items-center justify-center">
      {[1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border border-primary/25"
          style={{ width: ringBase + i * ringStep, height: ringBase + i * ringStep }}
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.12, 0.5] }}
          transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.3, ease: 'easeInOut' }}
        />
      ))}
      <div className={`relative z-10 ${avatarSize} rounded-full overflow-hidden ring-4 ring-primary/50 shadow-2xl shadow-primary/20`}>
        <UserAvatar
          src={participant.photoURL || ''}
          fallback={(participant.displayName || 'U').substring(0, 2).toUpperCase()}
        />
      </div>
    </div>
  );
}

// ─── Control button ───────────────────────────────────────────────────────────

function ControlBtn({
  label,
  icon,
  onClick,
  variant = 'default',
  active = false,
  showLabel = true,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger' | 'success';
  active?: boolean;
  showLabel?: boolean;
}) {
  const colors = {
    default: active
      ? 'bg-white/25 text-white hover:bg-white/35'
      : 'bg-white/10 text-white/80 hover:bg-white/20',
    danger: 'bg-red-500 text-white hover:bg-red-400',
    success: 'bg-green-500 text-white hover:bg-green-400',
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={onClick}
        aria-label={label}
        className={cn(
          'w-14 h-14 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90',
          colors[variant],
        )}
      >
        {icon}
      </button>
      {showLabel && (
        <span className="text-[11px] font-medium text-white/60">{label}</span>
      )}
    </div>
  );
}

// ─── Draggable local PiP ──────────────────────────────────────────────────────

function LocalPiP({ stream }: { stream: MediaStream | null }) {
  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0.1}
      initial={{ x: 0, y: 0 }}
      className="absolute bottom-28 right-4 z-30 w-28 h-40 md:w-36 md:h-52 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 cursor-grab active:cursor-grabbing touch-none"
      whileTap={{ scale: 0.97 }}
    >
      {stream ? (
        <StreamVideo stream={stream} muted mirror className="w-full h-full object-cover bg-black" />
      ) : (
        <div className="w-full h-full bg-neutral-800 flex items-center justify-center">
          <VideoOff className="w-6 h-6 text-white/30" />
        </div>
      )}
      <div className="absolute bottom-1.5 left-0 right-0 text-center text-[10px] text-white/60 font-medium">
        You
      </div>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CallScreen({
  callState,
  remoteParticipant,
  localStream,
  remoteStream,
  isMuted,
  isCameraOff,
  onAccept,
  onDecline,
  onEnd,
  onToggleMute,
  onToggleCamera,
}: CallScreenProps) {
  const visible = callState !== 'idle';

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="call-screen"
          className="fixed inset-0 z-[200] bg-black flex flex-col overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* ── RINGING OUT ──────────────────────────────────────────── */}
          {callState === 'ringing-out' && remoteParticipant && (
            <RingingOutScreen
              participant={remoteParticipant}
              onCancel={onEnd}
            />
          )}

          {/* ── RINGING IN ───────────────────────────────────────────── */}
          {callState === 'ringing-in' && remoteParticipant && (
            <RingingInScreen
              participant={remoteParticipant}
              onAccept={onAccept}
              onDecline={onDecline}
            />
          )}

          {/* ── CONNECTING ───────────────────────────────────────────── */}
          {callState === 'connecting' && (
            <ConnectingScreen participant={remoteParticipant} onCancel={onEnd} />
          )}

          {/* ── CONNECTED ────────────────────────────────────────────── */}
          {callState === 'connected' && (
            <ConnectedScreen
              remoteParticipant={remoteParticipant}
              localStream={localStream}
              remoteStream={remoteStream}
              isMuted={isMuted}
              isCameraOff={isCameraOff}
              onToggleMute={onToggleMute}
              onToggleCamera={onToggleCamera}
              onEnd={onEnd}
            />
          )}

          {/* ── ENDED ────────────────────────────────────────────────── */}
          {callState === 'ended' && <EndedScreen />}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Sub-screens ──────────────────────────────────────────────────────────────

function RingingOutScreen({
  participant,
  onCancel,
}: {
  participant: CallParticipant;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-between h-full py-20 px-8 bg-gradient-to-b from-neutral-900 via-neutral-900/95 to-black">
      <div className="flex flex-col items-center gap-6">
        <motion.p
          className="text-xs uppercase tracking-widest text-white/40 font-semibold"
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        >
          Calling…
        </motion.p>
        <PulsingAvatar participant={participant} size="lg" />
        <div className="text-center mt-2">
          <h2 className="text-2xl font-semibold text-white">{participant.displayName}</h2>
        </div>
      </div>

      <ControlBtn
        label="Cancel"
        icon={<PhoneMissed className="w-6 h-6" />}
        onClick={onCancel}
        variant="danger"
      />
    </div>
  );
}

function RingingInScreen({
  participant,
  onAccept,
  onDecline,
}: {
  participant: CallParticipant;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-between h-full py-20 px-8 bg-gradient-to-b from-neutral-900 via-neutral-900/95 to-black">
      <div className="flex flex-col items-center gap-5">
        <motion.div
          className="px-4 py-1.5 rounded-full bg-primary/20 border border-primary/30"
          animate={{ opacity: [1, 0.6, 1] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        >
          <span className="text-xs uppercase tracking-widest text-primary font-semibold">
            Incoming Call
          </span>
        </motion.div>
        <PulsingAvatar participant={participant} size="lg" />
        <h2 className="text-2xl font-semibold text-white mt-1">{participant.displayName}</h2>
      </div>

      {/* Accept / Decline — positions match standard mobile calling convention */}
      <div className="w-full flex items-center justify-between px-8">
        <div className="flex flex-col items-center gap-2">
          <ControlBtn
            label="Decline"
            icon={<PhoneOff className="w-6 h-6" />}
            onClick={onDecline}
            variant="danger"
          />
        </div>
        <div className="flex flex-col items-center gap-2">
          <ControlBtn
            label="Accept"
            icon={<Phone className="w-6 h-6" />}
            onClick={onAccept}
            variant="success"
          />
        </div>
      </div>
    </div>
  );
}

function ConnectingScreen({
  participant,
  onCancel,
}: {
  participant: CallParticipant | null;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-between h-full py-20 px-8 bg-gradient-to-b from-neutral-900 via-neutral-900/95 to-black">
      <div className="flex flex-col items-center gap-6">
        {participant && <PulsingAvatar participant={participant} size="lg" />}
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-white">{participant?.displayName}</h2>
          <div className="flex items-center gap-2 mt-2 text-white/50 text-sm justify-center">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Connecting…</span>
          </div>
        </div>
      </div>
      <ControlBtn label="Cancel" icon={<PhoneOff className="w-5 h-5" />} onClick={onCancel} variant="danger" />
    </div>
  );
}

function ConnectedScreen({
  remoteParticipant,
  localStream,
  remoteStream,
  isMuted,
  isCameraOff,
  onToggleMute,
  onToggleCamera,
  onEnd,
}: {
  remoteParticipant: CallParticipant | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isCameraOff: boolean;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onEnd: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const [speakerOn, setSpeakerOn] = useState(true);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const t = setInterval(() => setElapsed((v) => v + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const fmt = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const ss = (s % 60).toString().padStart(2, '0');
    return `${m}:${ss}`;
  };

  // Toggle speaker/earpiece via setSinkId if supported
  const toggleSpeaker = useCallback(async () => {
    const el = remoteVideoRef.current;
    if (!el) return;
    try {
      if ('setSinkId' in el) {
        // @ts-ignore — setSinkId is not in all typedefs yet
        await el.setSinkId(speakerOn ? '' : 'default');
      }
    } catch {
      // setSinkId not supported — ignore silently
    }
    setSpeakerOn((v) => !v);
  }, [speakerOn]);

  const hasVideo = !!remoteStream?.getVideoTracks().some((t) => t.enabled && t.readyState === 'live');

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {/* Remote video / avatar */}
      {hasVideo ? (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
          onLoadedMetadata={(e) => {
            const v = e.currentTarget;
            if (remoteStream) v.srcObject = remoteStream;
          }}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-neutral-900 to-black gap-6">
          {remoteParticipant && <PulsingAvatar participant={remoteParticipant} size="lg" />}
        </div>
      )}

      {/* Sync video srcObject */}
      {hasVideo && remoteStream && (
        <RemoteVideoSync stream={remoteStream} videoRef={remoteVideoRef} />
      )}

      {/* Call info overlay — top */}
      <div className="absolute top-0 left-0 right-0 px-6 pt-10 pb-4 bg-gradient-to-b from-black/70 to-transparent">
        <p className="text-white font-semibold text-lg">{remoteParticipant?.displayName}</p>
        <p className="text-white/60 text-sm tabular-nums">{fmt(elapsed)}</p>
      </div>

      {/* Draggable local PiP */}
      <LocalPiP stream={localStream} />

      {/* Control bar — bottom */}
      <div className="absolute bottom-0 left-0 right-0 px-6 pb-10 pt-4 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center justify-center gap-5">
          <ControlBtn
            label={isMuted ? 'Unmute' : 'Mute'}
            icon={isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            onClick={onToggleMute}
            active={isMuted}
          />
          <ControlBtn
            label={isCameraOff ? 'Camera' : 'Camera off'}
            icon={isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            onClick={onToggleCamera}
            active={isCameraOff}
          />
          <ControlBtn
            label={speakerOn ? 'Speaker' : 'Earpiece'}
            icon={speakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            onClick={toggleSpeaker}
            active={!speakerOn}
          />
          <ControlBtn
            label="End"
            icon={<PhoneOff className="w-5 h-5" />}
            onClick={onEnd}
            variant="danger"
          />
        </div>
      </div>
    </div>
  );
}

// Helper: syncs MediaStream to a video ref without reimplementing it in the main component
function RemoteVideoSync({
  stream,
  videoRef,
}: {
  stream: MediaStream;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}) {
  useEffect(() => {
    if (videoRef.current && videoRef.current.srcObject !== stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, videoRef]);
  return null;
}

function EndedScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 bg-gradient-to-b from-neutral-900 to-black">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center"
      >
        <PhoneMissed className="w-8 h-8 text-red-400" />
      </motion.div>
      <p className="text-white text-lg font-medium">Call Ended</p>
    </div>
  );
}
