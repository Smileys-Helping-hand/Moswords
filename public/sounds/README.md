# 📢 Real-Time Notification System

This placeholder file represents where you should upload your notification sound.

## Required File
**File:** `notification.mp3`  
**Location:** `/public/sounds/notification.mp3`

## Recommendations
- **Duration:** 0.5-2 seconds (short and punchy)
- **Volume:** Normalized/consistent level
- **Format:** MP3 (widely supported)
- **Size:** < 100KB recommended

## Suggested Sounds
You can use sounds like:
- A gentle "ding" or "ping"
- A soft chime
- A message "pop" sound
- Any pleasant notification tone

## Free Sound Resources
- [Freesound.org](https://freesound.org/)
- [Zapsplat](https://www.zapsplat.com/)
- [Notification Sounds](https://notificationsounds.com/)

## Testing
After uploading, test the sound with:
```javascript
import { soundEngine } from '@/lib/sound-engine';
soundEngine.test(); // Play the notification sound
```

## Configuration
The sound engine supports:
- **Volume control:** `soundEngine.setVolume(0.5)` (0.0 to 1.0)
- **Enable/disable:** `soundEngine.setEnabled(false)`
- **Check status:** `soundEngine.isEnabled()`

Once you upload this file, the notification system will automatically play it when:
- A new message is received
- You're not viewing that specific conversation
- The message is from someone else (not you)
