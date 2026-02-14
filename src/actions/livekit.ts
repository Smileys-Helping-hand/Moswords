"use server";

import { AccessToken } from "livekit-server-sdk";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Generate a LiveKit access token for a user to join a room
 * @param roomName - The name of the room to join (e.g., "chat-channelId")
 * @param username - Optional username override, uses session user if not provided
 * @returns Access token or error
 */
export async function getToken(roomName: string, username?: string) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      throw new Error("LiveKit credentials not configured");
    }

    const user = session.user as any;
    const participantName = username || user.displayName || user.name || user.email || "Guest";
    const participantIdentity = user.id || user.uid || user.email || `user-${Date.now()}`;

    // Create access token
    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantIdentity,
      name: participantName,
      // Token expires in 6 hours
      ttl: "6h",
    });

    // Grant permissions
    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();

    return {
      success: true,
      token,
      serverUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL || "ws://localhost:7880",
    };
  } catch (error) {
    console.error("Error generating LiveKit token:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate token",
    };
  }
}

/**
 * Get a token specifically for a channel call
 */
export async function getChannelCallToken(channelId: string) {
  return getToken(`channel-${channelId}`);
}

/**
 * Get a token specifically for a DM call
 */
export async function getDMCallToken(userId: string) {
  return getToken(`dm-${userId}`);
}

/**
 * Get a token specifically for a group chat call
 */
export async function getGroupCallToken(groupChatId: string) {
  return getToken(`group-${groupChatId}`);
}
