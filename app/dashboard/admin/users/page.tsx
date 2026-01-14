'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useOrganizationId } from '@/lib/hooks/use-organization-id';
import { UserInviteForm } from '@/components/admin/UserInviteForm';
import { ArrowLeft, Trash2, Shield, Mail } from 'lucide-react';

interface OrgUser {
  id: string;
  email: string;
  name: string | null;
  role: 'admin' | 'member' | 'viewer';
  status: 'active' | 'pending';
  invitedAt?: string;
  joinedAt?: string;
}

export default function UsersPage() {
  const organizationId = useOrganizationId();
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!organizationId) return;

      try {
        const response = await fetch(`/api/v1/admin/users?org=${organizationId}`);
        if (!response.ok) throw new Error('Failed to fetch users');
        const data = await response.json();
        setUsers(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load users');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [organizationId]);

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this user?')) return;

    setDeleting(userId);
    try {
      const response = await fetch(`/api/v1/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error('Failed to delete user');

      setUsers(users.filter((u) => u.id !== userId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setDeleting(null);
    }
  };

  const handleInviteSuccess = (newUser: OrgUser) => {
    setUsers([newUser, ...users]);
    setShowInviteForm(false);
  };

  const activeUsers = users.filter((u) => u.status === 'active').length;
  const pendingInvites = users.filter((u) => u.status === 'pending').length;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/admin">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-gray-600 mt-2">Invite and manage team members in your organization</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <p className="text-sm text-gray-600">Total Users</p>
          <p className="text-2xl font-bold mt-1">{users.length}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-gray-600">Active</p>
          <p className="text-2xl font-bold mt-1">{activeUsers}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-gray-600">Pending Invites</p>
          <p className="text-2xl font-bold mt-1">{pendingInvites}</p>
        </Card>
      </div>

      {/* Invite Form */}
      {showInviteForm && (
        <Card className="p-6 bg-blue-50 border-blue-200">
          <UserInviteForm
            organizationId={organizationId!}
            onSuccess={handleInviteSuccess}
            onCancel={() => setShowInviteForm(false)}
          />
        </Card>
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Team Members</h2>
        {!showInviteForm && (
          <Button onClick={() => setShowInviteForm(true)}>
            <Mail className="h-4 w-4 mr-2" />
            Invite User
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-gray-600 mb-4">No users in your organization yet</p>
          <Button onClick={() => setShowInviteForm(true)}>Invite your first user</Button>
        </Card>
      ) : (
        <div className="space-y-2">
          {users.map((user) => (
            <Card key={user.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium">{user.name || user.email}</p>
                      <p className="text-sm text-gray-600">{user.email}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {user.status === 'pending' && (
                    <Badge className="bg-yellow-100 text-yellow-800">Pending invite</Badge>
                  )}
                  {user.status === 'active' && (
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  )}

                  {user.role === 'admin' && (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      Admin
                    </Badge>
                  )}
                  {user.role === 'member' && (
                    <Badge variant="outline">Member</Badge>
                  )}
                  {user.role === 'viewer' && (
                    <Badge variant="outline">Viewer</Badge>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteUser(user.id)}
                    disabled={deleting === user.id}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {user.status === 'active' && user.joinedAt && (
                <p className="text-xs text-gray-500 mt-2">
                  Joined {new Date(user.joinedAt).toLocaleDateString()}
                </p>
              )}
              {user.status === 'pending' && user.invitedAt && (
                <p className="text-xs text-gray-500 mt-2">
                  Invited {new Date(user.invitedAt).toLocaleDateString()}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
