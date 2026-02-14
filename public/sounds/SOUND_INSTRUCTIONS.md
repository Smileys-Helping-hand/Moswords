# Sound Effects

This folder contains audio files for chat notifications.

## Required Sound Files

### message-pop.mp3
A crisp, short notification sound played when receiving new messages from other users.

**Specifications:**
- Format: MP3
- Duration: 50-150ms recommended
- Volume: Normalized to -3dB to -6dB
- Feel: Soft "pop" or "pluck" sound

## Creating/Adding Sounds

### Option 1: Use a Free Sound Library
- **Freesound.org**: Search for "notification pop"
- **Zapsplat.com**: UI notification sounds
- **Mixkit.co**: Free sound effects

### Option 2: Generate with Code
You can use online tools like:
- **SFXR** (8-bit style sounds)
- **Bfxr** (browser-based sound generator)

### Option 3: Download Sample
Place a short notification sound as `message-pop.mp3` in this directory.

## Usage in Code

```typescript
import { useMessageSound } from '@/hooks/use-sound-effect';

// In your component
useMessageSound(messages, currentUserId, true);
```

The sound will automatically:
- Play when new messages arrive from other users
- Debounce (max 1 sound per 100ms)
- Respect user preferences
- Fail silently if autoplay is blocked
