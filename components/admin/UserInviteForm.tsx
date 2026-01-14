'use client';

import { useState, FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, X, Plus } from 'lucide-react';

interface UserInviteFormProps {
  organizationId: string;
  onSuccess: (user: any) => void;
  onCancel: () => void;
}

interface InviteeRow {
  id: string;
  email: string;
  role: 'admin' | 'member' | 'viewer';
}

export function UserInviteForm({
  organizationId,
  onSuccess,
  onCancel,
}: UserInviteFormProps) {
  const [invitees, setInvitees] = useState<InviteeRow[]>([
    { id: '1', email: '', role: 'member' },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addRow = () => {
    setInvitees([
      ...invitees,
      { id: Date.now().toString(), email: '', role: 'member' },
    ]);
  };

  const removeRow = (id: string) => {
    if (invitees.length > 1) {
      setInvitees(invitees.filter((row) => row.id !== id));
    }
  };

  const updateRow = (
    id: string,
    field: 'email' | 'role',
    value: string
  ) => {
    setInvitees(
      invitees.map((row) =>
        row.id === id ? { ...row, [field]: value } : row
      )
    );
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const validInvitees = invitees.filter((row) => row.email.trim());
    if (validInvitees.length === 0) {
      setError('Please enter at least one email address');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/v1/admin/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          invitees: validInvitees,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send invites');
      }

      const data = await response.json();
      if (data.users && data.users.length > 0) {
        onSuccess(data.users[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invites');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Invite Team Members</h3>
        <button
          type="button"
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {invitees.map((row, index) => (
          <div key={row.id} className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-sm text-gray-600">Email</label>
              <Input
                type="email"
                placeholder="user@example.com"
                value={row.email}
                onChange={(e) => updateRow(row.id, 'email', e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="w-32">
              <label className="text-sm text-gray-600">Role</label>
              <select
                value={row.role}
                onChange={(e) =>
                  updateRow(row.id, 'role', e.target.value as any)
                }
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="viewer">Viewer</option>
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => removeRow(row.id)}
              disabled={invitees.length === 1}
              className="text-red-600 hover:text-red-700 disabled:text-gray-400 disabled:cursor-not-allowed p-2"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addRow}
        className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
      >
        <Plus className="h-4 w-4" />
        Add another email
      </button>

      <div className="flex gap-2 pt-4 border-t">
        <Button
          type="submit"
          disabled={loading}
          className="flex-1"
        >
          {loading ? 'Sending invites...' : 'Send Invites'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
