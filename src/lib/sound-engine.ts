/**
 * Sound Engine - Notification Sound Utility
 * Plays notification sounds with volume control and error handling
 */

class SoundEngine {
  private static instance: SoundEngine;
  private audio: HTMLAudioElement | null = null;
  private enabled: boolean = true;
  private volume: number = 0.5;

  private constructor() {
    // Singleton pattern
    if (typeof window !== 'undefined') {
      this.audio = new Audio('/sounds/notification.mp3');
      this.audio.volume = this.volume;
      
      // Preload the audio
      this.audio.load();
    }
  }

  static getInstance(): SoundEngine {
    if (!SoundEngine.instance) {
      SoundEngine.instance = new SoundEngine();
    }
    return SoundEngine.instance;
  }

  /**
   * Play notification sound
   */
  async play(): Promise<void> {
    if (!this.enabled || !this.audio) return;

    try {
      // Clone the audio to allow multiple simultaneous plays
      const sound = this.audio.cloneNode() as HTMLAudioElement;
      sound.volume = this.volume;
      
      await sound.play();
    } catch (error) {
      console.warn('Failed to play notification sound:', error);
      // Fail silently - don't break the notification flow
    }
  }

  /**
   * Set volume (0.0 to 1.0)
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.audio) {
      this.audio.volume = this.volume;
    }
  }

  /**
   * Enable/disable sound
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if sound is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Test the notification sound
   */
  async test(): Promise<void> {
    await this.play();
  }
}

export const soundEngine = SoundEngine.getInstance();
