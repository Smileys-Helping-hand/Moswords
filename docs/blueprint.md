# **App Name**: Moswords

## Core Features:

- Authentication: Implement Firebase Authentication with Google and Email login. Secure user identity and profiles using Firebase Auth.
- Real-time Messaging: Enable real-time text channels using Firestore and Firebase Realtime Database for presence and typing indicators.
- Media Engine: Integrate Cloud Storage with a quality selector (Original vs Optimized). Utilize Cloud Functions to generate WebP versions for optimized media and provide ZIP downloads.
- AI Thread Summarization: Implement Genkit and Cloud Functions to create a tool providing contextual summaries of message threads, invoked via /ai command. LLM to determine when and what information to extract to create the summary.
- Server/Channel Navigation: Implement a Discord-inspired sidebar with a glassmorphism aesthetic for server and channel navigation.
- Firestore Data: Structure a flat Firestore schema for servers, channels, memberships, and messages. Store persistent data such as user profiles, channels and the text of messages in channels.
- Presence/Typing Indicators: Display user online/offline status and typing indicators using Firebase Realtime Database to minimize Firestore costs.
- Glassmorphism Navigation & Theme Engine: Upgrade the Sidebar and TopBar components to use a 'Midnight Obsidian' theme with high-end glassmorphism. Implement a dynamic 'Theme Provider' that allows users to toggle between themes.
- Micro-Interactions with Framer Motion: Enhance the messaging experience using framer-motion. Add Layout Animations, Pop animation for emoji reactions, Slide-in effect for the right-side member list, and Hover Scale effect on server icons.
- Hybrid Presence System (RTDB + Firestore): Implement a high-performance Presence system using Firebase Realtime Database (RTDB) for 'User Online/Offline' status and 'User is Typing' indicators. Sync the RTDB status with a Firestore last_seen timestamp only when a user disconnects.
- Infinite Scroll & Virtualized Message List: Refactor the message list to support 'Virtualized Rendering'. Implement 'Infinite Scroll' with Firestore pagination. Add a 'Jump to Bottom' button.
- Advanced Storage & ZIP Archiver: Create a Cloud Function generateChannelArchive that triggers when a user requests a 'Batch Download' from the Media Dashboard. The function should ZIP all files in a specific channel and provide a temporary Signed URL for download.
- Media Quality Selector & Preview: Upgrade the FileUpload component to include a 'Quality Toggle'. If 'Optimized' is selected, trigger a Cloud Function to convert the image to WebP. If 'Original' is selected, bypass compression. Implement an 'In-App Media Player'.
- Genkit Thread Summarizer: Develop a Genkit-powered Cloud Function /ai-summarize tool. It should accept a channelId and threadId, fetch the last 100 messages, and use Gemini 1.5 Flash to produce a 3-bullet point summary.
- AI Auto-Moderator: Implement an 'AI Sentinel' using Genkit. Create a Firestore Trigger on messages/{msgId} that sends the text to a toxicity model. If the message violates community guidelines, the function should automatically flag the document and notify server admins.
- WebRTC Signaling Foundation: Build the signaling layer for 1:1 Video Calls using Firestore. Create a calls collection to store offer, answer, and iceCandidates subcollections. Implement a useWebRTC hook that manages the RTCPeerConnection lifecycle.
- Role-Based Membership & Security: Implement a robust Role-Based Access Control (RBAC) system. Create a memberships collection where document IDs are userId_serverId. Fields include: role ('owner', 'admin', 'moderator', 'member'), joinedAt, and nickname. Update Firestore Security Rules: Access to /channels/{channelId}/messages must check if a document exists in memberships for the current request.auth.uid and the parent serverId. Only 'admin' or 'owner' roles can create or delete channels. All writes must be validated via a checkRole(role) helper function in the rules.
- Dual-Path Storage & ZIP Archiver: Upgrade the MediaDashboard and Firebase Storage logic: Client-side: Add a QualitySelector to the upload flow. If 'Optimized', append ?optimized=true to metadata. Backend: Create a Cloud Function onFileUploaded using the sharp library. If 'optimized', generate a 1080p WebP version and a 200px thumbnail. Store them in /media/optimized/{fileId}. Batch Export: Create a Cloud Function generateDownloadZip. It should take an array of fileIds, stream them from Storage using archiver, and return a temporary Signed URL. Ensure it cleans up local /tmp memory after execution to prevent memory leaks.
- Hybrid Presence & WebRTC Signaling: Build a high-performance signaling layer. Presence: Use Firebase Realtime Database for status/{uid} (online, idle, offline) and typing/{channelId}/{uid}. Use onDisconnect().remove() to ensure accuracy. WebRTC: Create a calls Firestore collection. Implement a useWebRTC hook that manages RTCPeerConnection. When a user initiates a call, create a document with offer, answer, and iceCandidates subcollections. UI: Add a 'Call' button in DMs that triggers a floating video overlay with Framer Motion entry/exit animations.
- Genkit Intelligence & Auto-Mod: Integrate Genkit with Gemini 1.5 Flash for the AI Co-Pilot. Summarization: Create an /ai-summarize Cloud Function. It must fetch the last 100 messages from a channel, strip sensitive info, and return a 3-point bulleted summary. Auto-Mod: Implement a 'Sentinel' trigger on messages/{msgId}. It should use a Genkit flow to analyze toxicity. If a violation is found, set flagged: true on the message and hide it from the UI immediately via Firestore rules (allow read: if !resource.data.flagged). Smart Replies: Add a 'Suggested Replies' bar above the message input that uses Genkit to suggest 3 quick responses based on the last 5 messages.

## Style Guidelines:

- Primary color: Electric indigo (#6F00ED) for a vibrant accent.
- Background color: Deep black (#121212) for the 'Midnight Obsidian' theme.
- Accent color: Light indigo (#9400D3) for interactive elements and highlights.
- Body and headline font: 'Inter', a sans-serif, for a modern look.
- Code font: 'Source Code Pro' for displaying code snippets.
- Use minimalist icons that complement the 'Midnight Obsidian' theme.
- Implement a 'Sidebar-First' layout inspired by Discord, optimized for desktop and mobile (PWA).
- Use framer-motion for subtle animations on emoji reactions.