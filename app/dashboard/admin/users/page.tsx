'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Trash2, Shield, User } from 'lucide-react'

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [showInviteForm, setShowInviteForm] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Members</h1>
          <p className="text-muted-foreground mt-2">
            Manage users and their roles in your organization
          </p>
        </div>
        <Button onClick={() => setShowInviteForm(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Invite User
        </Button>
      </div>

      {showInviteForm && (
        <Card>
          <CardHeader>
            <CardTitle>Invite Team Member</CardTitle>
            <CardDescription>
              Send an invitation to a new team member
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* TODO: Render UserInviteForm component */}
            <p className="text-sm text-muted-foreground">Invite form component coming soon</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Active Members</CardTitle>
          <CardDescription>
            {users.length} member{users.length !== 1 ? 's' : ''} in your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-8">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">
                No team members yet. Invite someone to get started!
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* TODO: Render user list with role management */}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
