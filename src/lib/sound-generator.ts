/**
 * Simple utility to generate a notification beep sound using Web Audio API
 * Use this as a fallback if you don't have a custom sound file
 */

export function generateNotificationBeep(): AudioBuffer | null {
  if (typeof window === 'undefined') return null;

  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const sampleRate = audioContext.sampleRate;
    const duration = 0.1; // 100ms
    const numSamples = sampleRate * duration;
    
    const buffer = audioContext.createBuffer(1, numSamples, sampleRate);
    const channelData = buffer.getChannelData(0);
    
    // Generate a pleasant pop sound (440Hz sine wave with quick decay)
    const frequency = 880; // A5 note
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 20); // Quick decay
      channelData[i] = Math.sin(2 * Math.PI * frequency * t) * envelope * 0.3;
    }
    
    return buffer;
  } catch (error) {
    console.error('Failed to generate beep:', error);
    return null;
  }
}

/**
 * Play a generated beep sound as a fallback
 */
export function playBeep() {
  if (typeof window === 'undefined') return;

  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const buffer = generateNotificationBeep();
    
    if (!buffer) return;
    
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start(0);
  } catch (error) {
    console.error('Failed to play beep:', error);
  }
}
