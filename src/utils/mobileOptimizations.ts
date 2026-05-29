/**
 * Mobile-specific optimizations for Android and iOS
 */

/**
 * Detect if running on mobile
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * Detect specific mobile OS
 */
export function getMobileOS(): 'iOS' | 'Android' | 'Web' {
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;

  if (/iPad|iPhone|iPod/.test(userAgent)) {
    return 'iOS';
  }
  if (/Android/.test(userAgent)) {
    return 'Android';
  }
  return 'Web';
}

/**
 * Optimize input field for mobile
 * - Prevents zoom on focus (set font-size to 16px)
 * - Handles soft keyboard
 */
export function optimizeMobileInput(): void {
  const inputs = document.querySelectorAll('input, textarea');
  inputs.forEach((input) => {
    // Prevent zoom on iOS
    input.style.fontSize = '16px';

    // Handle soft keyboard on Android
    input.addEventListener('focus', () => {
      // Scroll input into view after keyboard appears
      setTimeout(() => {
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    });
  });
}

/**
 * Disable double-tap zoom on mobile
 * Makes app feel more like a native app
 */
export function disableMobileZoom(): void {
  const meta = document.querySelector('meta[name="viewport"]');
  if (meta) {
    meta.setAttribute('content', 'width=device-width, initial-scale=1, user-scalable=no');
  }
}

/**
 * Handle soft keyboard visibility changes
 */
export function onSoftKeyboardToggle(callback: (isOpen: boolean) => void): void {
  if (typeof window === 'undefined') return;

  const initialHeight = window.innerHeight;

  window.addEventListener('resize', () => {
    const currentHeight = window.innerHeight;
    const isOpen = currentHeight < initialHeight * 0.75;
    callback(isOpen);
  });
}

/**
 * Optimize for notch and safe areas (iPhone X+, Android devices)
 */
export function getNotchHeight(): number {
  const notchEnv = getCSSVariable('--safe-area-inset-top');
  if (!notchEnv) return 0;
  return parseInt(notchEnv, 10);
}

export function getBottomSafeArea(): number {
  const safeArea = getCSSVariable('--safe-area-inset-bottom');
  if (!safeArea) return 0;
  return parseInt(safeArea, 10);
}

function getCSSVariable(varName: string): string | null {
  if (typeof window === 'undefined') return null;
  return getComputedStyle(document.documentElement).getPropertyValue(varName);
}

/**
 * Prevent body scroll on mobile when modal is open
 */
export function lockBodyScroll(): void {
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
  document.body.style.overflow = 'hidden';
  document.body.style.paddingRight = `${scrollbarWidth}px`;
}

export function unlockBodyScroll(): void {
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
}

/**
 * iOS-specific: Handle status bar appearance
 */
export async function setStatusBarStyle(style: 'light' | 'dark'): Promise<void> {
  if (typeof (window as any).Capacitor === 'undefined') return;

  try {
    const { StatusBar } = (window as any).Capacitor.Plugins;
    await StatusBar.setStyle({ style: style === 'light' ? 'LIGHT' : 'DARK' });
  } catch (error) {
    console.warn('Could not set status bar style:', error);
  }
}

/**
 * Android-specific: Vibration feedback
 */
export async function triggerHapticFeedback(duration: number = 10): Promise<void> {
  if (typeof (window as any).Capacitor === 'undefined') return;

  try {
    const { Haptics } = (window as any).Capacitor.Plugins;
    await Haptics.vibrate({ duration });
  } catch (error) {
    console.warn('Could not trigger haptic feedback:', error);
  }
}

/**
 * Optimize font size for mobile (prevent text from being too small)
 */
export function optimizeMobileFontSize(): void {
  const style = document.createElement('style');
  style.textContent = `
    html {
      font-size: max(16px, 2vw);
    }

    @media (max-width: 640px) {
      html {
        font-size: 16px;
      }
    }
  `;
  document.head.appendChild(style);
}

/**
 * Handle device orientation changes
 */
export function onOrientationChange(callback: (orientation: 'portrait' | 'landscape') => void): void {
  const handleChange = () => {
    const orientation = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
    callback(orientation);
  };

  window.addEventListener('orientationchange', handleChange);
  window.addEventListener('resize', handleChange);

  // Call immediately with current orientation
  handleChange();
}

/**
 * Reduce motion for low-end devices
 */
export function shouldReduceMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Network status monitoring for mobile
 */
export function onNetworkStatusChange(callback: (isOnline: boolean) => void): void {
  callback(navigator.onLine);
  window.addEventListener('online', () => callback(true));
  window.addEventListener('offline', () => callback(false));
}

/**
 * Optimize image loading for mobile
 */
export function getOptimizedImageSize(
  maxWidth: number = 800
): { width: number; quality: number } {
  const devicePixelRatio = window.devicePixelRatio || 1;
  const screenWidth = window.innerWidth;

  const width = Math.min(screenWidth, maxWidth) * devicePixelRatio;
  const quality = devicePixelRatio <= 1 ? 90 : 85; // Slightly lower quality on high DPI

  return { width, quality };
}

/**
 * Detect if device is low-power (high priority for Android)
 */
export function isLowPowerDevice(): boolean {
  if (typeof navigator === 'undefined') return false;

  const cores = navigator.hardwareConcurrency || 4;
  const memory = (navigator as any).deviceMemory || 8;

  return cores <= 2 || memory <= 4;
}

/**
 * Initialize all mobile optimizations
 */
export function initializeMobileOptimizations(): void {
  if (!isMobileDevice()) return;

  optimizeMobileInput();
  disableMobileZoom();
  optimizeMobileFontSize();

  // Set status bar color based on theme
  const isDark = document.documentElement.classList.contains('dark');
  setStatusBarStyle(isDark ? 'light' : 'dark').catch(() => {});

  // Handle orientation changes
  onOrientationChange(() => {
    // Reflow layout if needed
    window.dispatchEvent(new Event('resize'));
  });

  // Monitor network
  onNetworkStatusChange((isOnline) => {
    console.log(isOnline ? '📶 Online' : '📴 Offline');
  });
}
