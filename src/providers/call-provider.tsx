'use client';

import { createContext, useContext } from 'react';
import dynamic from 'next/dynamic';
import { useWebRTC, type CallParticipant, type CallState } from '@/hooks/use-webrtc';

// The call UI is only needed once a call exists; keep it out of the initial bundle.
const CallScreen = dynamic(() => import('@/components/call/CallScreen'), { ssr: false });

interface CallContextValue {
  callState: CallState;
  startCall: (target: CallParticipant, type?: 'voice' | 'video') => void;
}

const CallContext = createContext<CallContextValue>({
  callState: 'idle',
  startCall: () => {},
});

/**
 * One WebRTC session for the whole app, so an incoming call rings on any
 * screen — not only while the callee happens to have a DM open.
 */
export function CallProvider({ children }: { children: React.ReactNode }) {
  const rtc = useWebRTC();

  return (
    <CallContext.Provider value={{ callState: rtc.callState, startCall: rtc.startCall }}>
      {children}
      {rtc.callState !== 'idle' && (
        <CallScreen
          callState={rtc.callState}
          remoteParticipant={rtc.remoteParticipant}
          localStream={rtc.localStream}
          remoteStream={rtc.remoteStream}
          isMuted={rtc.isMuted}
          isCameraOff={rtc.isCameraOff}
          onAccept={rtc.acceptCall}
          onDecline={rtc.declineCall}
          onEnd={rtc.endCall}
          onToggleMute={rtc.toggleMute}
          onToggleCamera={rtc.toggleCamera}
        />
      )}
    </CallContext.Provider>
  );
}

export function useCall() {
  return useContext(CallContext);
}
