'use client'

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Users, Shield, Bell, Zap, Server } from 'lucide-react'

export default function AdminPage(): React.JSX.Element {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Organization Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage organization-wide settings, users, and policies
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/admin/jobs">
            <Button variant="outline" className="flex items-center gap-2">
              <Server className="h-4 w-4" />
              View Jobs
            </Button>
          </Link>
          <Link href="/dashboard/admin/jobforge">
            <Button variant="outline" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              JobForge Admin
            </Button>
          </Link>
        </div>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Users</span>
          </TabsTrigger>
          <TabsTrigger value="policies" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Policies</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">Integrations</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>
                Invite and manage team members for your organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Invite teammates, assign roles, and keep the review surface owned by the right people.
              </p>
              <Button asChild variant="outline"><Link href="/dashboard/admin/users">Manage team members</Link></Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="policies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Policies</CardTitle>
              <CardDescription>
                Configure organization-wide security and compliance policies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Create versioned policy packs with checksums and traceable rule decisions.
              </p>
              <Button asChild variant="outline"><Link href="/dashboard/admin/policies">Manage policy packs</Link></Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Configure how your team receives notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Review delivery is configured from the connected repository and notification integrations.
              </p>
              <Button asChild variant="outline"><Link href="/dashboard/settings">Open settings</Link></Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Integrations</CardTitle>
              <CardDescription>
                Connect third-party services like Slack, Email, and webhooks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Connect Git providers and inspect the repositories that feed governed runs.
              </p>
              <Button asChild variant="outline"><Link href="/dashboard/repos">Manage repositories</Link></Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
