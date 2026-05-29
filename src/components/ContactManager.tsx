'use client';

import { memo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Phone, Plus, Trash2, Edit, Share2, Zap, Search, Filter } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useToast } from '@/hooks/use-toast';
import UserAvatar from './user-avatar';
import { useContactSync } from '@/lib/contactSync';

interface Contact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  userId: string;
  lastSynced: Date;
  syncedWith: string[];
}

/**
 * Contact Manager Component
 * Complete contact management: add, edit, delete, sync
 */
const ContactManager = memo(function ContactManager() {
  const { toast } = useToast();
  const { contacts, addContact, updateContact, deleteContact, syncContactTo, isSyncing } = useContactSync();

  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());

  const filteredContacts = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddContact = async () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Name and email are required',
      });
      return;
    }

    try {
      await addContact({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        userId: '', // Will be set by server
      });

      setFormData({ name: '', email: '', phone: '' });
      setShowAddForm(false);

      toast({
        title: 'Contact Added',
        description: `${formData.name} has been added to your contacts`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to add contact',
      });
    }
  };

  const handleSyncContact = async (contactId: string, system: 'nexus' | 'discord' | 'slack') => {
    try {
      setSyncingIds((prev) => new Set(prev).add(`${contactId}-${system}`));
      await syncContactTo(contactId, system);

      toast({
        title: 'Synced Successfully',
        description: `Contact synced to ${system}`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Sync Failed',
        description: `Could not sync to ${system}`,
      });
    } finally {
      setSyncingIds((prev) => {
        const next = new Set(prev);
        next.delete(`${contactId}-${system}`);
        return next;
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Contacts</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage and sync contacts across all your services
          </p>
        </div>
        <Button onClick={() => setShowAddForm(true)} className="gap-2 rounded-lg">
          <Plus className="w-4 h-4" />
          Add Contact
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search contacts by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 rounded-lg"
        />
      </div>

      {/* Add Contact Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white/5 border border-border rounded-lg p-4 space-y-4"
          >
            <h3 className="font-semibold">Add New Contact</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-2">Name *</label>
                <Input
                  placeholder="Contact name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="rounded-lg"
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">Email *</label>
                <Input
                  placeholder="contact@example.com"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="rounded-lg"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium block mb-2">Phone (optional)</label>
                <Input
                  placeholder="+1 (555) 000-0000"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="rounded-lg"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                onClick={() => setShowAddForm(false)}
                className="rounded-lg"
              >
                Cancel
              </Button>
              <Button onClick={handleAddContact} className="rounded-lg">
                Add Contact
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contacts List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">
            {searchQuery ? `Results (${filteredContacts.length})` : `All Contacts (${contacts.length})`}
          </h3>
        </div>

        {filteredContacts.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            <p>{searchQuery ? 'No contacts match your search' : 'No contacts yet. Add one to get started.'}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredContacts.map((contact, index) => (
              <motion.div
                key={contact.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white/5 border border-border rounded-lg p-4 hover:bg-white/10 transition-colors group"
              >
                {/* Contact Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 flex-1">
                    <UserAvatar
                      src={contact.avatar || ''}
                      fallback={contact.name.substring(0, 2).toUpperCase()}
                    />

                    <div className="flex-1">
                      <p className="font-semibold">{contact.name}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {contact.email}
                        </span>
                        {contact.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {contact.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 hover:bg-white/10 rounded transition-colors">
                      <Edit className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => deleteContact(contact.id)}
                      className="p-2 hover:bg-red-500/20 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>

                {/* Sync Status */}
                <div className="text-xs text-muted-foreground mb-3">
                  Last synced: {new Date(contact.lastSynced).toLocaleDateString()}
                </div>

                {/* Sync Buttons */}
                <div className="flex gap-2 flex-wrap">
                  {['nexus', 'discord', 'slack'].map((system) => {
                    const isSynced = contact.syncedWith.includes(system);
                    const isSyncing = syncingIds.has(`${contact.id}-${system}`);

                    return (
                      <button
                        key={system}
                        onClick={() => handleSyncContact(contact.id, system as 'nexus' | 'discord' | 'slack')}
                        disabled={isSyncing}
                        className={`px-3 py-1 rounded text-sm font-medium flex items-center gap-1 transition-all ${
                          isSynced
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : 'bg-white/5 text-muted-foreground border border-border hover:bg-white/10'
                        } ${isSyncing ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <Zap className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
                        {system.charAt(0).toUpperCase() + system.slice(1)}
                        {isSynced && '✓'}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Sync Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/5 border border-border rounded-lg p-3 text-center">
          <p className="text-2xl font-bold">{contacts.length}</p>
          <p className="text-xs text-muted-foreground">Total Contacts</p>
        </div>

        <div className="bg-white/5 border border-border rounded-lg p-3 text-center">
          <p className="text-2xl font-bold">
            {contacts.filter((c) => c.syncedWith.includes('nexus')).length}
          </p>
          <p className="text-xs text-muted-foreground">Synced to Nexus</p>
        </div>

        <div className="bg-white/5 border border-border rounded-lg p-3 text-center">
          <p className="text-2xl font-bold">
            {contacts.filter((c) => c.syncedWith.includes('discord')).length}
          </p>
          <p className="text-xs text-muted-foreground">Synced to Discord</p>
        </div>

        <div className="bg-white/5 border border-border rounded-lg p-3 text-center">
          <p className="text-2xl font-bold">
            {contacts.filter((c) => c.syncedWith.includes('slack')).length}
          </p>
          <p className="text-xs text-muted-foreground">Synced to Slack</p>
        </div>
      </div>
    </div>
  );
});

ContactManager.displayName = 'ContactManager';

export default ContactManager;
