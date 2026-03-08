"use client";

/**
 * useWebRTC — Custom hook for peer-to-peer 1-to-1 WebRTC calls
 *
 * Architecture:
 *  • Signaling is done via /api/rtc-signal (DB-backed polling, no separate WS server)
 *  • State machine: IDLE → RINGING → CONNECTING → CONNECTED
 *  • Low-data defaults: 480p @ 24 fps; audio-only mode supported
 *  • One ICE server (Google STUN). Add TURN credentials via env vars for NAT traversal.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from './use-auth';

// ─── Public types ─────────────────────────────────────────────────────────────

export type CallState = 'idle' | 'ringing-out' | 'ringing-in' | 'connecting' | 'connected' | 'ended';

export interface CallParticipant {
  userId: string;
  displayName: string;
  photoURL?: string | null;
}

export interface UseWebRTCOptions {
  onStateChange?: (state: CallState) => void;
}

export interface UseWebRTCReturn {
  callState: CallState;
  remoteParticipant: CallParticipant | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isCameraOff: boolean;
  /** Initiate outgoing call. resolves when peer accepts or rejects */
  startCall: (target: CallParticipant, type?: 'voice' | 'video') => Promise<void>;
  /** Accept an incoming ringing call */
  acceptCall: () => Promise<void>;
  /** Decline an incoming call */
  declineCall: () => void;
  /** Hang up / cancel during any phase */
  endCall: () => void;
  toggleMute: () => void;
  toggleCamera: () => void;
}

// ─── ICE / MediaConstraints ───────────────────────────────────────────────────

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  // Add TURN servers here if env vars are provided:
  // { urls: process.env.NEXT_PUBLIC_TURN_URL!, username: '…', credential: '…' }
];

/** Low-data SD constraints – ideal for mobile on 3G/LTE */
const VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  width: { ideal: 640 },
  height: { ideal: 480 },
  frameRate: { ideal: 24, max: 30 },
  facingMode: 'user',
};

/** Audio has highest priority for intelligibility */
const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  channelCount: 1, // mono to halve bandwidth
  sampleRate: { ideal: 16000 }, // 16 kHz is plenty for speech
};

// ─── Signaling helpers ────────────────────────────────────────────────────────

type SignalType = 'call-offer' | 'call-answer' | 'call-decline' | 'call-cancel' | 'call-end' | 'ice-candidate';

interface Signal {
  id: string;
  fromUserId: string;
  toUserId: string;
  type: SignalType;
  payload: string;
  callId: string;
  createdAt: string;
}

async function sendSignal(
  toUserId: string,
  type: SignalType,
  payload: object | string,
  callId: string,
): Promise<void> {
  await fetch('/api/rtc-signal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      toUserId,
      type,
      payload: typeof payload === 'string' ? payload : JSON.stringify(payload),
      callId,
    }),
  });
}

async function pollSignals(since: Date): Promise<Signal[]> {
  const res = await fetch(`/api/rtc-signal?since=${since.toISOString()}`, { cache: 'no-store' });
  if (!res.ok) return [];
  const data = await res.json();
  return data.signals ?? [];
}

async function cleanupSignals(callId: string) {
  await fetch(`/api/rtc-signal?callId=${callId}`, { method: 'DELETE' });
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useWebRTC({ onStateChange }: UseWebRTCOptions = {}): UseWebRTCReturn {
  const { session } = useAuth();
  const currentUserId = (session?.user as any)?.id || (session?.user as any)?.uid;

  const [callState, _setCallState] = useState<CallState>('idle');
  const [remoteParticipant, setRemoteParticipant] = useState<CallParticipant | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  // Internal stable refs that survive re-renders
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const callIdRef = useRef<string>('');
  const remoteParticipantRef = useRef<CallParticipant | null>(null);
  const callTypeRef = useRef<'voice' | 'video'>('video');
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const polledSinceRef = useRef<Date>(new Date());
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);
  const stateRef = useRef<CallState>('idle');

  const setCallState = useCallback((s: CallState) => {
    stateRef.current = s;
    _setCallState(s);
    onStateChange?.(s);
  }, [onStateChange]);

  // ── Teardown ─────────────────────────────────────────────────────────────

  const teardown = useCallback((newState: CallState = 'ended') => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.onicecandidate = null;
      pcRef.current.ontrack = null;
      pcRef.current.onsignalingstatechange = null;
      pcRef.current.oniceconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setRemoteParticipant(null);
    setIsMuted(false);
    setIsCameraOff(false);
    if (callIdRef.current) {
      cleanupSignals(callIdRef.current);
      callIdRef.current = '';
    }
    // Brief 'ended' flash so UI can show "call ended" banner, then go idle
    setCallState(newState);
    setTimeout(() => {
      if (stateRef.current === 'ended') setCallState('idle');
    }, 2000);
  }, [setCallState]);

  // ── Build RTCPeerConnection ───────────────────────────────────────────────

  const createPeerConnection = useCallback((): RTCPeerConnection => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = (e) => {
      if (e.candidate && remoteParticipantRef.current && callIdRef.current) {
        sendSignal(
          remoteParticipantRef.current.userId,
          'ice-candidate',
          e.candidate.toJSON(),
          callIdRef.current,
        );
      }
    };

    pc.ontrack = (e) => {
      if (e.streams[0]) setRemoteStream(e.streams[0]);
    };

    pc.oniceconnectionstatechange = () => {
      if (!pc) return;
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        setCallState('connected');
      }
      if (
        pc.iceConnectionState === 'failed' ||
        pc.iceConnectionState === 'disconnected' ||
        pc.iceConnectionState === 'closed'
      ) {
        // Don't teardown immediately on 'disconnected' — it can recover
        if (pc.iceConnectionState !== 'disconnected') {
          teardown('ended');
        }
      }
    };

    return pc;
  }, [setCallState, teardown]);

  // ── Add pending ICE candidates once remote description is set ───────────

  const flushPendingCandidates = useCallback(async () => {
    if (!pcRef.current) return;
    for (const c of pendingCandidates.current) {
      try {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(c));
      } catch { /* ignore */ }
    }
    pendingCandidates.current = [];
  }, []);

  // ── Get local media ───────────────────────────────────────────────────────

  const getLocalMedia = useCallback(async (type: 'voice' | 'video'): Promise<MediaStream> => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: AUDIO_CONSTRAINTS,
      video: type === 'video' ? VIDEO_CONSTRAINTS : false,
    });
    localStreamRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, []);

  // ── Signal polling loop ───────────────────────────────────────────────────

  const handleSignal = useCallback(async (sig: Signal) => {
    // ignore signals from ourselves
    if (sig.fromUserId === currentUserId) return;

    switch (sig.type as SignalType) {
      // ── Incoming call offer ──────────────────────────────────────────────
      case 'call-offer': {
        if (stateRef.current !== 'idle') {
          // Busy — auto-decline
          await sendSignal(sig.fromUserId, 'call-decline', 'busy', sig.callId);
          return;
        }
        let meta: { sdp: RTCSessionDescriptionInit; callType: 'voice' | 'video'; caller: CallParticipant };
        try { meta = JSON.parse(sig.payload); } catch { return; }

        callIdRef.current = sig.callId;
        callTypeRef.current = meta.callType ?? 'video';
        remoteParticipantRef.current = meta.caller;
        setRemoteParticipant(meta.caller);

        // Store the offer for use when the user taps Accept
        const pc = createPeerConnection();
        pcRef.current = pc;
        await pc.setRemoteDescription(new RTCSessionDescription(meta.sdp));
        await flushPendingCandidates();
        setCallState('ringing-in');
        break;
      }

      // ── Callee answered ──────────────────────────────────────────────────
      case 'call-answer': {
        if (!pcRef.current) return;
        let sdp: RTCSessionDescriptionInit;
        try { sdp = JSON.parse(sig.payload); } catch { return; }
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
        await flushPendingCandidates();
        setCallState('connecting');
        break;
      }

      // ── ICE candidate ────────────────────────────────────────────────────
      case 'ice-candidate': {
        let candidate: RTCIceCandidateInit;
        try { candidate = JSON.parse(sig.payload); } catch { return; }
        if (pcRef.current?.remoteDescription) {
          try { await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)); } catch { /* ignore */ }
        } else {
          pendingCandidates.current.push(candidate);
        }
        break;
      }

      // ── Call was declined ────────────────────────────────────────────────
      case 'call-decline':
      case 'call-cancel':
      case 'call-end': {
        teardown('ended');
        break;
      }
    }
  }, [currentUserId, createPeerConnection, flushPendingCandidates, setCallState, teardown]);

  const startPolling = useCallback(() => {
    polledSinceRef.current = new Date(Date.now() - 2000);
    pollIntervalRef.current = setInterval(async () => {
      const signals = await pollSignals(polledSinceRef.current);
      if (signals.length > 0) {
        // Advance the window past the newest signal we received
        const newest = new Date(signals[0].createdAt);
        polledSinceRef.current = new Date(newest.getTime() + 1);
        // Process in chronological order
        for (const sig of [...signals].reverse()) {
          await handleSignal(sig);
        }
      }
    }, 1500); // poll every 1.5 s — fast enough to feel real-time, light on the DB
  }, [handleSignal]);

  // ── Public: startCall (outgoing) ─────────────────────────────────────────

  const startCall = useCallback(async (target: CallParticipant, type: 'voice' | 'video' = 'video') => {
    if (stateRef.current !== 'idle') return;

    remoteParticipantRef.current = target;
    callTypeRef.current = type;
    callIdRef.current = `call-${currentUserId}-${target.userId}-${Date.now()}`;
    setRemoteParticipant(target);
    setCallState('ringing-out');
    startPolling();

    try {
      const stream = await getLocalMedia(type);
      const pc = createPeerConnection();
      pcRef.current = pc;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: type === 'video',
      });
      await pc.setLocalDescription(offer);

      const caller = {
        userId: currentUserId,
        displayName: (session?.user as any)?.name || (session?.user as any)?.displayName || 'User',
        photoURL: (session?.user as any)?.image || (session?.user as any)?.photoURL || null,
      };

      await sendSignal(
        target.userId,
        'call-offer',
        JSON.stringify({ sdp: offer, callType: type, caller }),
        callIdRef.current,
      );
    } catch (err) {
      console.error('startCall error:', err);
      teardown('idle');
    }
  }, [currentUserId, session, createPeerConnection, getLocalMedia, setCallState, startPolling, teardown]);

  // ── Public: acceptCall ───────────────────────────────────────────────────

  const acceptCall = useCallback(async () => {
    if (stateRef.current !== 'ringing-in' || !pcRef.current || !remoteParticipantRef.current) return;

    setCallState('connecting');
    startPolling();

    try {
      const stream = await getLocalMedia(callTypeRef.current);
      stream.getTracks().forEach((t) => pcRef.current!.addTrack(t, stream));

      const answer = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(answer);

      await sendSignal(
        remoteParticipantRef.current.userId,
        'call-answer',
        JSON.stringify(answer),
        callIdRef.current,
      );
    } catch (err) {
      console.error('acceptCall error:', err);
      teardown('idle');
    }
  }, [getLocalMedia, setCallState, startPolling, teardown]);

  // ── Public: declineCall ──────────────────────────────────────────────────

  const declineCall = useCallback(() => {
    if (remoteParticipantRef.current && callIdRef.current) {
      sendSignal(remoteParticipantRef.current.userId, 'call-decline', 'declined', callIdRef.current);
    }
    teardown('idle');
  }, [teardown]);

  // ── Public: endCall (cancel / hang up) ───────────────────────────────────

  const endCall = useCallback(() => {
    if (remoteParticipantRef.current && callIdRef.current) {
      const type: SignalType =
        stateRef.current === 'ringing-out' ? 'call-cancel' : 'call-end';
      sendSignal(remoteParticipantRef.current.userId, type, 'ended', callIdRef.current);
    }
    teardown('ended');
  }, [teardown]);

  // ── Public: toggleMute ───────────────────────────────────────────────────

  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    const enabled = isMuted; // we're about to flip
    localStreamRef.current.getAudioTracks().forEach((t) => { t.enabled = enabled; });
    setIsMuted(!isMuted);
  }, [isMuted]);

  // ── Public: toggleCamera ─────────────────────────────────────────────────

  const toggleCamera = useCallback(() => {
    if (!localStreamRef.current) return;
    const enabled = isCameraOff;
    localStreamRef.current.getVideoTracks().forEach((t) => { t.enabled = enabled; });
    setIsCameraOff(!isCameraOff);
  }, [isCameraOff]);

  // ── Cleanup on unmount ───────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (pcRef.current) pcRef.current.close();
      if (localStreamRef.current) localStreamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // ── Passive incoming-call listener (always polling when idle) ────────────

  useEffect(() => {
    if (!currentUserId) return;
    // Lightweight passive poll: only 1 GET per 3 s while idle
    const passivePoll = setInterval(async () => {
      if (stateRef.current !== 'idle') return;
      const signals = await pollSignals(new Date(Date.now() - 5000));
      for (const sig of [...signals].reverse()) {
        if (sig.type === 'call-offer') await handleSignal(sig);
      }
    }, 3000);
    return () => clearInterval(passivePoll);
  }, [currentUserId, handleSignal]);

  return {
    callState,
    remoteParticipant,
    localStream,
    remoteStream,
    isMuted,
    isCameraOff,
    startCall,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
    toggleCamera,
  };
}
