"use client";

import { useState, useEffect } from "react";
import {
  LiveKitRoom,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  useTracks,
  useParticipants,
  useLocalParticipant,
  TrackToggle,
  useIsSpeaking,
  useConnectionQualityIndicator,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track } from "livekit-client";
import { 
  X, 
  Loader2, 
  AlertCircle, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  MonitorUp, 
  PhoneOff,
  SignalHigh,
  SignalMedium,
  SignalLow,
  SignalZero,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

interface ActiveCallProps {
  token: string;
  serverUrl: string;
  roomName: string;
  onDisconnect: () => void;
  userName?: string;
}

export default function ActiveCall({
  token,
  serverUrl,
  roomName,
  onDisconnect,
  userName = "Guest",
}: ActiveCallProps) {
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleDisconnect = () => {
    toast({
      title: "Call Ended",
      description: "You have left the call",
    });
    onDisconnect();
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] bg-gradient-to-br from-black via-black/95 to-primary/10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="h-full w-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10 glass-panel">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {isConnecting && (
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                )}
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gradient">
                  Voice & Video Call
                </h2>
                <p className="text-xs text-muted-foreground">
                  {isConnecting ? "Connecting..." : roomName}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDisconnect}
              className="hover:bg-red-500/20 hover:text-red-400 transition-all"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Call Content */}
          <div className="flex-1 overflow-hidden">
            {error ? (
              <ErrorDisplay error={error} onClose={handleDisconnect} />
            ) : (
              <LiveKitRoom
                video={true}
                audio={true}
                token={token}
                serverUrl={serverUrl}
                connect={true}
                onConnected={() => {
                  setIsConnecting(false);
                  toast({
                    title: "Connected",
                    description: "You joined the call successfully",
                  });
                }}
                onDisconnected={handleDisconnect}
                onError={(error) => {
                  console.error("LiveKit error:", error);
                  setError(error.message);
                }}
                className="h-full w-full"
              >
                <CallContent userName={userName} onEndCall={handleDisconnect} />
              </LiveKitRoom>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function CallContent({ userName, onEndCall }: { userName: string; onEndCall: () => void }) {
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const handleToggleMic = () => {
    localParticipant.setMicrophoneEnabled(!isMuted);
    setIsMuted(!isMuted);
  };

  const handleToggleVideo = () => {
    localParticipant.setCameraEnabled(!isVideoOff);
    setIsVideoOff(!isVideoOff);
  };

  const handleToggleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        await localParticipant.setScreenShareEnabled(false);
      } else {
        await localParticipant.setScreenShareEnabled(true);
      }
      setIsScreenSharing(!isScreenSharing);
    } catch (error) {
      console.error("Screen share error:", error);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Audio Renderer */}
      <RoomAudioRenderer />

      {/* Participants View */}
      <div className="flex-1 p-4 overflow-y-auto">
        {participants.length === 0 ? (
          <WaitingRoom />
        ) : (
          <ParticipantsGrid participants={participants} />
        )}
      </div>

      {/* Control Bar */}
      <FloatingControlBar
        isMuted={isMuted}
        isVideoOff={isVideoOff}
        isScreenSharing={isScreenSharing}
        onToggleMic={handleToggleMic}
        onToggleVideo={handleToggleVideo}
        onToggleScreenShare={handleToggleScreenShare}
        onEndCall={onEndCall}
        participantCount={participants.length}
      />
    </div>
  );
}

function ParticipantsGrid({ participants }: { participants: any[] }) {
  const gridCols =
    participants.length === 1
      ? "grid-cols-1"
      : participants.length === 2
      ? "grid-cols-2"
      : participants.length <= 4
      ? "grid-cols-2"
      : "grid-cols-3";

  return (
    <div className={`grid ${gridCols} gap-4 h-full auto-rows-fr`}>
      {participants.map((participant) => (
        <ParticipantCard key={participant.identity} participant={participant} />
      ))}
    </div>
  );
}

function ParticipantCard({ participant }: { participant: any }) {
  const isSpeaking = useIsSpeaking(participant);
  const connectionQuality = useConnectionQualityIndicator(participant);

  return (
    <motion.div
      className={`relative rounded-xl overflow-hidden glass-card border-2 transition-all ${
        isSpeaking
          ? "border-green-500 shadow-lg shadow-green-500/50"
          : "border-white/10"
      }`}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.02 }}
    >
      <ParticipantTile className="w-full h-full" />
      
      {/* Participant Info Overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white">
              {participant.name || participant.identity}
            </span>
            {isSpeaking && (
              <motion.div
                className="flex gap-0.5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1 bg-green-400 rounded-full"
                    animate={{
                      height: ["4px", "12px", "4px"],
                    }}
                    transition={{
                      duration: 0.6,
                      repeat: Infinity,
                      delay: i * 0.1,
                    }}
                  />
                ))}
              </motion.div>
            )}
          </div>
          <ConnectionQualityBadge quality={connectionQuality?.quality || "unknown"} />
        </div>
      </div>
    </motion.div>
  );
}

function ConnectionQualityBadge({ quality }: { quality: string }) {
  const getIcon = () => {
    switch (quality) {
      case "excellent":
        return <SignalHigh className="w-4 h-4 text-green-400" />;
      case "good":
        return <SignalMedium className="w-4 h-4 text-yellow-400" />;
      case "poor":
        return <SignalLow className="w-4 h-4 text-orange-400" />;
      default:
        return <SignalZero className="w-4 h-4 text-red-400" />;
    }
  };

  return (
    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm">
      {getIcon()}
    </div>
  );
}

function FloatingControlBar({
  isMuted,
  isVideoOff,
  isScreenSharing,
  onToggleMic,
  onToggleVideo,
  onToggleScreenShare,
  onEndCall,
  participantCount,
}: {
  isMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  onToggleMic: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
  onEndCall: () => void;
  participantCount: number;
}) {
  return (
    <motion.div
      className="p-4 border-t border-white/10"
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", damping: 20 }}
    >
      <div className="max-w-2xl mx-auto glass-card rounded-2xl p-4 border border-white/20">
        <div className="flex items-center justify-center gap-3">
          {/* Microphone */}
          <ControlButton
            icon={isMuted ? <MicOff /> : <Mic />}
            label={isMuted ? "Unmute" : "Mute"}
            onClick={onToggleMic}
            active={!isMuted}
            variant={isMuted ? "danger" : "default"}
          />

          {/* Video */}
          <ControlButton
            icon={isVideoOff ? <VideoOff /> : <Video />}
            label={isVideoOff ? "Start Video" : "Stop Video"}
            onClick={onToggleVideo}
            active={!isVideoOff}
            variant={isVideoOff ? "danger" : "default"}
          />

          {/* Screen Share */}
          <ControlButton
            icon={<MonitorUp />}
            label={isScreenSharing ? "Stop Sharing" : "Share Screen"}
            onClick={onToggleScreenShare}
            active={isScreenSharing}
            variant={isScreenSharing ? "primary" : "default"}
          />

          {/* End Call */}
          <ControlButton
            icon={<PhoneOff />}
            label="End Call"
            onClick={onEndCall}
            variant="danger"
            className="ml-4"
          />
        </div>

        {/* Participant Count */}
        <div className="text-center mt-3 pt-3 border-t border-white/10">
          <p className="text-xs text-muted-foreground">
            {participantCount} {participantCount === 1 ? "participant" : "participants"} in call
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function ControlButton({
  icon,
  label,
  onClick,
  active = false,
  variant = "default",
  className = "",
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  variant?: "default" | "primary" | "danger";
  className?: string;
}) {
  const variantStyles = {
    default: active
      ? "bg-white/20 hover:bg-white/30 border-white/30"
      : "bg-white/5 hover:bg-white/10 border-white/10",
    primary: "bg-primary/20 hover:bg-primary/30 border-primary/40",
    danger: "bg-red-500/20 hover:bg-red-500/30 border-red-500/40 text-red-400",
  };

  return (
    <motion.button
      onClick={onClick}
      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${variantStyles[variant]} ${className}`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      title={label}
    >
      <div className="w-6 h-6">{icon}</div>
      <span className="text-xs font-medium whitespace-nowrap">{label}</span>
    </motion.button>
  );
}

function WaitingRoom() {
  return (
    <div className="h-full flex items-center justify-center">
      <motion.div
        className="text-center glass-card p-12 rounded-3xl border border-white/10"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <motion.div
          className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6"
          animate={{
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
          }}
        >
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </motion.div>
        <h3 className="text-xl font-semibold text-gradient mb-2">
          Waiting for others...
        </h3>
        <p className="text-muted-foreground">
          Share the room link to invite participants
        </p>
      </motion.div>
    </div>
  );
}

function ErrorDisplay({
  error,
  onClose,
}: {
  error: string;
  onClose: () => void;
}) {
  return (
    <div className="h-full flex items-center justify-center p-8">
      <motion.div
        className="glass-card p-8 rounded-2xl border border-red-500/20 max-w-md w-full"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Connection Failed
            </h3>
            <p className="text-sm text-muted-foreground">Unable to join call</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          {error}
        </p>
        <Button onClick={onClose} className="w-full" variant="outline">
          Close
        </Button>
      </motion.div>
    </div>
  );
}
