'use client';

import { useEffect, useState, useCallback } from 'react';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Network } from '@capacitor/network';
import { App, AppState } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useToast } from './use-toast';

interface NetworkStatus {
  connected: boolean;
  connectionType: string;
}

/**
 * Custom hook for mobile-specific features using Capacitor plugins
 * Provides haptic feedback, network status, app lifecycle, and status bar control
 */
export function useMobileFeatures() {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    connected: true,
    connectionType: 'unknown',
  });
  const [appState, setAppState] = useState<string>('active');
  const { toast } = useToast();
  const isNative = Capacitor.isNativePlatform();

  // Initialize mobile features
  useEffect(() => {
    if (!isNative) return;

    let networkListener: any;
    let appStateListener: any;
    let backButtonListener: any;

    const initMobileFeatures = async () => {
      try {
        // Initialize status bar
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#030014' });

        // Get initial network status
        const status = await Network.getStatus();
        setNetworkStatus({
          connected: status.connected,
          connectionType: status.connectionType,
        });

        // Listen for network changes
        networkListener = await Network.addListener('networkStatusChange', (status) => {
          setNetworkStatus({
            connected: status.connected,
            connectionType: status.connectionType,
          });

          // Show toast on connection change
          if (!status.connected) {
            toast({
              title: 'No Internet Connection',
              description: 'You are currently offline',
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Back Online',
              description: 'Internet connection restored',
            });
          }
        });

        // Listen for app state changes
        appStateListener = await App.addListener('appStateChange', (state: AppState) => {
          setAppState(state.isActive ? 'active' : 'background');
          console.log('App state changed:', state.isActive ? 'active' : 'background');
        });

        // Listen for back button
        backButtonListener = await App.addListener('backButton', () => {
          // Handle back button press
          console.log('Back button pressed');
        });
      } catch (error) {
        console.error('Failed to initialize mobile features:', error);
      }
    };

    initMobileFeatures();

    return () => {
      if (networkListener) networkListener.remove();
      if (appStateListener) appStateListener.remove();
      if (backButtonListener) backButtonListener.remove();
    };
  }, [isNative, toast]);

  // Haptic feedback functions
  const haptic = {
    light: useCallback(async () => {
      if (!isNative) return;
      try {
        await Haptics.impact({ style: ImpactStyle.Light });
      } catch (error) {
        console.error('Haptic feedback failed:', error);
      }
    }, [isNative]),

    medium: useCallback(async () => {
      if (!isNative) return;
      try {
        await Haptics.impact({ style: ImpactStyle.Medium });
      } catch (error) {
        console.error('Haptic feedback failed:', error);
      }
    }, [isNative]),

    heavy: useCallback(async () => {
      if (!isNative) return;
      try {
        await Haptics.impact({ style: ImpactStyle.Heavy });
      } catch (error) {
        console.error('Haptic feedback failed:', error);
      }
    }, [isNative]),

    success: useCallback(async () => {
      if (!isNative) return;
      try {
        await Haptics.notification({ type: NotificationType.Success });
      } catch (error) {
        console.error('Haptic feedback failed:', error);
      }
    }, [isNative]),

    warning: useCallback(async () => {
      if (!isNative) return;
      try {
        await Haptics.notification({ type: NotificationType.Warning });
      } catch (error) {
        console.error('Haptic feedback failed:', error);
      }
    }, [isNative]),

    error: useCallback(async () => {
      if (!isNative) return;
      try {
        await Haptics.notification({ type: NotificationType.Error });
      } catch (error) {
        console.error('Haptic feedback failed:', error);
      }
    }, [isNative]),

    vibrate: useCallback(async (duration: number = 300) => {
      if (!isNative) return;
      try {
        await Haptics.vibrate({ duration });
      } catch (error) {
        console.error('Haptic feedback failed:', error);
      }
    }, [isNative]),
  };

  // Status bar controls
  const statusBar = {
    show: useCallback(async () => {
      if (!isNative) return;
      try {
        await StatusBar.show();
      } catch (error) {
        console.error('Status bar control failed:', error);
      }
    }, [isNative]),

    hide: useCallback(async () => {
      if (!isNative) return;
      try {
        await StatusBar.hide();
      } catch (error) {
        console.error('Status bar control failed:', error);
      }
    }, [isNative]),

    setStyle: useCallback(async (style: 'dark' | 'light') => {
      if (!isNative) return;
      try {
        await StatusBar.setStyle({ style: style === 'dark' ? Style.Dark : Style.Light });
      } catch (error) {
        console.error('Status bar control failed:', error);
      }
    }, [isNative]),

    setColor: useCallback(async (color: string) => {
      if (!isNative) return;
      try {
        await StatusBar.setBackgroundColor({ color });
      } catch (error) {
        console.error('Status bar control failed:', error);
      }
    }, [isNative]),
  };

  // App controls
  const appControls = {
    exitApp: useCallback(async () => {
      if (!isNative) return;
      try {
        await App.exitApp();
      } catch (error) {
        console.error('Exit app failed:', error);
      }
    }, [isNative]),

    getInfo: useCallback(async () => {
      if (!isNative) return null;
      try {
        return await App.getInfo();
      } catch (error) {
        console.error('Get app info failed:', error);
        return null;
      }
    }, [isNative]),
  };

  return {
    isNative,
    networkStatus,
    appState,
    haptic,
    statusBar,
    appControls,
  };
}
