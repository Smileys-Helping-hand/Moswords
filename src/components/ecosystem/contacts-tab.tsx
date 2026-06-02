'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ContactsTab() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>📇 Shared Contacts</CardTitle>
          <CardDescription>Manage contacts shared across the ecosystem</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Contacts feature is coming soon!</p>
          <p className="text-sm text-muted-foreground mt-2">
            Your contacts from Moswords will sync automatically with awechat, financeplay, and other connected apps.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
