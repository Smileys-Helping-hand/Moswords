'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff, BellRing, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { notificationService } from '@/lib/notification-service';

export default function NotificationSettings() {
  const { toast } = useToast();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsSupported(notificationService.isSupported());
    setPermission(notificationService.getPermissionStatus());
  }, []);

  const handleEnableNotifications = async () => {
    setIsLoading(true);
    try {
      const granted = await notificationService.initialize();
      
      if (granted) {
        setPermission('granted');
        toast({
          title: 'Notifications Enabled! 🎉',
          description: 'You\'ll now receive notifications for new messages',
        });
        
        // Send test notification
        setTimeout(() => {
          notificationService.sendTestNotification();
        }, 500);
      } else {
        setPermission(notificationService.getPermissionStatus());
        toast({
          variant: 'destructive',
          title: 'Permission Denied',
          description: 'Please enable notifications in your browser settings',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to enable notifications',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestNotification = async () => {
    await notificationService.sendTestNotification();
    toast({
      title: 'Test Sent',
      description: 'Check if you received the notification',
    });
  };

  const getStatusIcon = () => {
    switch (permission) {
      case 'granted':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'denied':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusBadge = () => {
    switch (permission) {
      case 'granted':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Enabled</Badge>;
      case 'denied':
        return <Badge variant="destructive">Blocked</Badge>;
      default:
        return <Badge variant="secondary">Not Configured</Badge>;
    }
  };

  if (!isSupported) {
    return (
      <Card className="glass-card border-white/10">
        <CardHeader>
          <div className="flex items-center gap-3">
            <BellOff className="w-6 h-6 text-muted-foreground" />
            <div>
              <CardTitle>Notifications Not Supported</CardTitle>
              <CardDescription>
                Your browser doesn't support push notifications
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            To enable notifications, please use a modern browser like Chrome, Safari, Firefox, or Edge.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <Card className="glass-card border-white/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BellRing className="w-6 h-6 text-primary" />
              <div>
                <CardTitle>Push Notifications</CardTitle>
                <CardDescription>
                  Get notified about new messages and mentions
                </CardDescription>
              </div>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status */}
          <div className="flex items-center gap-3 p-4 rounded-lg glass-card border border-white/10">
            {getStatusIcon()}
            <div className="flex-1">
              <p className="text-sm font-medium">
                {permission === 'granted' && 'Notifications are enabled'}
                {permission === 'denied' && 'Notifications are blocked'}
                {permission === 'default' && 'Notifications not configured'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {permission === 'granted' && 'You\'ll receive notifications for new messages'}
                {permission === 'denied' && 'Enable notifications in your browser settings'}
                {permission === 'default' && 'Click the button below to enable notifications'}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            {permission !== 'granted' && (
              <Button
                onClick={handleEnableNotifications}
                disabled={isLoading || permission === 'denied'}
                className="gap-2"
              >
                <Bell className="w-4 h-4" />
                {isLoading ? 'Requesting...' : 'Enable Notifications'}
              </Button>
            )}
            {permission === 'granted' && (
              <Button
                onClick={handleTestNotification}
                variant="outline"
                className="gap-2"
              >
                <BellRing className="w-4 h-4" />
                Send Test Notification
              </Button>
            )}
          </div>

          {/* Help Text */}
          {permission === 'denied' && (
            <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <p className="text-sm text-yellow-400 mb-2 font-medium">
                Notifications are blocked
              </p>
              <p className="text-xs text-yellow-400/80">
                To enable notifications:
              </p>
              <ol className="text-xs text-yellow-400/80 mt-2 space-y-1 list-decimal list-inside">
                <li>Click the lock or info icon in your address bar</li>
                <li>Find "Notifications" in the permissions list</li>
                <li>Change it from "Block" to "Allow"</li>
                <li>Refresh this page</li>
              </ol>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Features */}
      <Card className="glass-card border-white/10">
        <CardHeader>
          <CardTitle className="text-lg">Notification Features</CardTitle>
          <CardDescription>
            What you'll receive notifications for
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {[
              'New direct messages',
              'Channel mentions (@mentions)',
              'Group chat messages',
              'Important announcements',
              'When someone responds to your thread',
            ].map((feature, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-3 text-sm"
              >
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span>{feature}</span>
              </motion.li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Privacy Notice */}
      <Card className="glass-card border-white/10">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground">
              <p className="font-medium mb-1">Privacy Notice</p>
              <p>
                Notifications are sent directly to your device and respect your system's
                Do Not Disturb settings. Message previews are truncated for privacy.
                You can disable notifications at any time.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
