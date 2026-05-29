/**
 * Real-time contact syncing system
 * Syncs contacts across devices and with external systems (Nexus, etc.)
 */

import { useCallback, useEffect, useRef, useState } from 'react';

interface Contact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  userId: string;
  lastSynced: Date;
  syncedWith: string[]; // List of external systems this contact is synced with
  customData?: Record<string, any>;
}

interface SyncEvent {
  type: 'add' | 'update' | 'delete' | 'sync';
  contact: Contact;
  timestamp: Date;
  synkedWith: string[];
}

/**
 * Hook for real-time contact syncing
 */
export function useContactSync() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncQueue = useRef<SyncEvent[]>([]);
  const syncTimer = useRef<NodeJS.Timeout | null>(null);

  // Load contacts from server
  const loadContacts = useCallback(async () => {
    try {
      const response = await fetch('/api/contacts');
      if (!response.ok) throw new Error('Failed to load contacts');
      const data = await response.json();
      setContacts(data.contacts || []);
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  }, []);

  // Add contact with sync
  const addContact = useCallback(
    async (contact: Omit<Contact, 'id' | 'lastSynced' | 'syncedWith'>) => {
      const newContact: Contact = {
        ...contact,
        id: `contact-${Date.now()}-${Math.random()}`,
        lastSynced: new Date(),
        syncedWith: [],
      };

      // Add locally first (optimistic update)
      setContacts((prev) => [...prev, newContact]);

      // Queue for sync
      syncQueue.current.push({
        type: 'add',
        contact: newContact,
        timestamp: new Date(),
        synkedWith: [],
      });

      // Trigger sync
      flushSyncQueue();

      return newContact;
    },
    []
  );

  // Update contact
  const updateContact = useCallback(
    async (contactId: string, updates: Partial<Contact>) => {
      setContacts((prev) =>
        prev.map((c) =>
          c.id === contactId
            ? {
                ...c,
                ...updates,
                lastSynced: new Date(),
              }
            : c
        )
      );

      const contact = contacts.find((c) => c.id === contactId);
      if (contact) {
        syncQueue.current.push({
          type: 'update',
          contact: { ...contact, ...updates, lastSynced: new Date() },
          timestamp: new Date(),
          synkedWith: [],
        });

        flushSyncQueue();
      }
    },
    [contacts]
  );

  // Delete contact
  const deleteContact = useCallback(async (contactId: string) => {
    const contact = contacts.find((c) => c.id === contactId);

    setContacts((prev) => prev.filter((c) => c.id !== contactId));

    if (contact) {
      syncQueue.current.push({
        type: 'delete',
        contact,
        timestamp: new Date(),
        synkedWith: [],
      });

      flushSyncQueue();
    }
  }, [contacts]);

  // Sync contact to external system (Nexus, Discord, etc.)
  const syncContactTo = useCallback(
    async (contactId: string, system: 'nexus' | 'discord' | 'slack') => {
      const contact = contacts.find((c) => c.id === contactId);
      if (!contact) return;

      try {
        setIsSyncing(true);
        const response = await fetch(`/api/contacts/${contactId}/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ system }),
        });

        if (!response.ok) throw new Error(`Failed to sync to ${system}`);

        const updated = await response.json();
        setContacts((prev) =>
          prev.map((c) =>
            c.id === contactId ? updated.contact : c
          )
        );
      } catch (error) {
        console.error(`Error syncing contact to ${system}:`, error);
        throw error;
      } finally {
        setIsSyncing(false);
      }
    },
    [contacts]
  );

  // Flush pending syncs
  const flushSyncQueue = useCallback(async () => {
    if (syncQueue.current.length === 0) return;

    if (syncTimer.current) {
      clearTimeout(syncTimer.current);
    }

    // Batch syncs every 500ms
    syncTimer.current = setTimeout(async () => {
      const events = syncQueue.current;
      syncQueue.current = [];

      try {
        setIsSyncing(true);
        const response = await fetch('/api/contacts/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ events }),
        });

        if (!response.ok) throw new Error('Sync failed');

        const result = await response.json();

        // Update contacts with synced state
        if (result.contacts) {
          setContacts(result.contacts);
        }
      } catch (error) {
        console.error('Error flushing sync queue:', error);
        // Re-queue events on failure
        syncQueue.current = events;
      } finally {
        setIsSyncing(false);
      }
    }, 500);
  }, []);

  // Load contacts on mount
  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  return {
    contacts,
    isSyncing,
    addContact,
    updateContact,
    deleteContact,
    syncContactTo,
    loadContacts,
  };
}

/**
 * Detect when a contact is added to friends
 * Automatically updates contact sync status
 */
export function useContactAutoDetection() {
  return useCallback((userId: string, onContactDetected: (contact: Contact) => void) => {
    // Listen for friend additions
    const handleFriendAdded = async (event: CustomEvent<{ friendId: string }>) => {
      try {
        const response = await fetch(`/api/users/${event.detail.friendId}`);
        if (!response.ok) return;

        const user = await response.json();

        const contact: Contact = {
          id: `auto-${user.id}`,
          name: user.displayName || user.name || 'Unknown',
          email: user.email,
          avatar: user.photoURL,
          userId,
          lastSynced: new Date(),
          syncedWith: [],
        };

        onContactDetected(contact);
      } catch (error) {
        console.error('Error detecting contact:', error);
      }
    };

    window.addEventListener(
      'friend-added',
      handleFriendAdded as EventListener
    );

    return () => {
      window.removeEventListener(
        'friend-added',
        handleFriendAdded as EventListener
      );
    };
  }, []);
}
