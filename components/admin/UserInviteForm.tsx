'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertCircle, CheckCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { createSupabaseClient } from '@/lib/supabase/client'
import { getApiErrorMessage } from '@/lib/utils/api-helpers'
import { parseInviteEmails } from '@/lib/admin/invite'

export interface UserInviteFormProps {
  organizationId: string
  onSuccess?: () => void
  onError?: (error: string) => void
}

export function UserInviteForm({
  organizationId,
  onSuccess,
  onError,
}: UserInviteFormProps): React.JSX.Element {
  const [emails, setEmails] = useState('')
  const [role, setRole] = useState('member')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const emailList = parseInviteEmails(emails)

      if (emailList.length === 0) {
        throw new Error('Please enter at least one email address')
      }

      const supabase = createSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Your session has expired. Sign in again to invite teammates.')

      const response = await fetch('/api/v1/admin/users/invite', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'x-organization-id': organizationId,
        },
        body: JSON.stringify({ emails: emailList, role }),
      })

      const payload = (await response.json().catch(() => ({}))) as {
        data?: { sentCount?: number }
        error?: unknown
      }
      if (!response.ok) throw new Error(getApiErrorMessage(payload as Record<string, unknown>))

      const sentCount = payload.data?.sentCount ?? emailList.length

      setMessage({
        type: 'success',
        text: `Invitation${sentCount === 1 ? '' : 's'} sent to ${sentCount} teammate${sentCount === 1 ? '' : 's'}.`,
      })
      setEmails('')
      setRole('member')
      onSuccess?.()
    } catch (error) {
      const errorText = error instanceof Error ? error.message : 'Failed to send invitations'
      setMessage({ type: 'error', text: errorText })
      onError?.(errorText)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="invite-emails" className="text-sm font-medium">Email Addresses</label>
        <textarea
          id="invite-emails"
          value={emails}
          onChange={e => setEmails(e.target.value)}
          placeholder="Enter email addresses, separated by commas or new lines"
          className="w-full px-3 py-2 border rounded-md min-h-24"
          disabled={loading}
        />
        <p className="text-xs text-muted-foreground">
          Separate multiple emails with commas or new lines
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Role</label>
        <Select value={role} onValueChange={setRole} disabled={loading}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="member">Member</SelectItem>
            <SelectItem value="lead">Team Lead</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
          {message.type === 'error' ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <CheckCircle className="h-4 w-4" />
          )}
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" disabled={loading || !organizationId}>
        {loading ? 'Sending...' : 'Send Invitations'}
      </Button>
    </form>
  )
}
