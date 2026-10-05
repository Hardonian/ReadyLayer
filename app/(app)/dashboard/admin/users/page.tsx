'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Plus, User, Users, AlertCircle, Loader2 } from 'lucide-react'
import { UserInviteForm } from '@/components/admin/UserInviteForm'
import { createSupabaseClient } from '@/lib/supabase/client'
import { getApiErrorMessage } from '@/lib/utils/api-helpers'
import { useOrganizationId } from '@/lib/hooks/use-organization-id'

interface AdminUser {
  id: string
  name: string
  email: string
  role: string
  joinedAt: string
}

interface UsersResponse {
  data?: { members?: AdminUser[] }
  error?: unknown
}

export default function UsersPage(): React.JSX.Element {
  const { organizationId, loading: organizationLoading, error: organizationError } = useOrganizationId()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showInviteForm, setShowInviteForm] = useState(false)

  const loadUsers = useCallback(async (): Promise<void> => {
    if (!organizationId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const supabase = createSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Your session has expired. Sign in again to continue.')

      const response = await fetch(`/api/v1/admin/users?organizationId=${encodeURIComponent(organizationId)}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'x-organization-id': organizationId,
        },
      })
      const payload = (await response.json().catch(() => ({}))) as UsersResponse
      if (!response.ok) throw new Error(getApiErrorMessage(payload as Record<string, unknown>))
      setUsers(payload.data?.members ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load team members')
    } finally {
      setLoading(false)
    }
  }, [organizationId])

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Team Members</h1>
          </div>
          <p className="text-muted-foreground mt-2">Invite reviewers and operators with explicit organization roles.</p>
        </div>
        <Button onClick={() => setShowInviteForm((visible) => !visible)} disabled={!organizationId} className="gap-2">
          <Plus className="h-4 w-4" />
          {showInviteForm ? 'Close invite' : 'Invite user'}
        </Button>
      </div>

      {(organizationError || error) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{organizationError || error}</AlertDescription>
        </Alert>
      )}

      {showInviteForm && organizationId && (
        <Card>
          <CardHeader>
            <CardTitle>Invite a teammate</CardTitle>
            <CardDescription>They will receive a secure Supabase invitation and join this organization after accepting it.</CardDescription>
          </CardHeader>
          <CardContent>
            <UserInviteForm
              organizationId={organizationId}
              onSuccess={() => {
                setShowInviteForm(false)
                void loadUsers()
              }}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Active members</CardTitle>
          <CardDescription>{users.length} member{users.length === 1 ? '' : 's'} in this organization</CardDescription>
        </CardHeader>
        <CardContent>
          {organizationLoading || loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading members...
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-10">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">No members yet. Send the first invitation to start the review team.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {users.map((user) => (
                <div key={user.id} className="flex items-center justify-between gap-4 py-4">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{user.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs rounded-full border px-2.5 py-1 capitalize">{user.role}</span>
                    <span className="hidden sm:inline text-xs text-muted-foreground">
                      Joined {new Date(user.joinedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
