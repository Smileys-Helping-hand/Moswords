'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function FriendsTab() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>👥 Friends</CardTitle>
          <CardDescription>Manage your friends across the ecosystem</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Friends feature is coming soon!</p>
          <p className="text-sm text-muted-foreground mt-2">
            You'll be able to add friends, see their status, and initiate connections with them across all apps.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
