'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useOrganizationId } from '@/lib/hooks/use-organization-id';
import { Users, FileText, Bell, Settings, ArrowRight } from 'lucide-react';

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalPolicies: number;
  pendingInvites: number;
}

export default function AdminPage() {
  const router = useRouter();
  const organizationId = useOrganizationId();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      if (!organizationId) return;

      try {
        const response = await fetch(`/api/v1/admin/stats?org=${organizationId}`);
        if (!response.ok) throw new Error('Failed to fetch admin stats');
        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load stats');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [organizationId]);

  if (!organizationId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Not authorized</h2>
          <p className="text-gray-500">You must be an organization admin to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Organization Settings</h1>
        <p className="text-gray-600 mt-2">Manage users, policies, and notifications for your organization</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : stats ? (
        <>
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold mt-1">{stats.totalUsers}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Users</p>
                  <p className="text-2xl font-bold mt-1">{stats.activeUsers}</p>
                </div>
                <Users className="h-8 w-8 text-green-500" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Organization Policies</p>
                  <p className="text-2xl font-bold mt-1">{stats.totalPolicies}</p>
                </div>
                <FileText className="h-8 w-8 text-purple-500" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending Invites</p>
                  <p className="text-2xl font-bold mt-1">{stats.pendingInvites}</p>
                  {stats.pendingInvites > 0 && (
                    <Badge className="mt-2 bg-yellow-100 text-yellow-800">Action needed</Badge>
                  )}
                </div>
                <Bell className="h-8 w-8 text-orange-500" />
              </div>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Users Management */}
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2">User Management</h3>
              <p className="text-gray-600 text-sm mb-4">Invite, manage, and remove team members from your organization</p>
              <Link href="/dashboard/admin/users">
                <Button variant="outline" className="w-full group">
                  Manage Users
                  <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </Card>

            {/* Policy Management */}
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <FileText className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2">Policies</h3>
              <p className="text-gray-600 text-sm mb-4">Define and manage code review policies at the organization level</p>
              <Link href="/dashboard/admin/policies">
                <Button variant="outline" className="w-full group">
                  Manage Policies
                  <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </Card>

            {/* Notifications */}
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Bell className="h-6 w-6 text-orange-600" />
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2">Notifications</h3>
              <p className="text-gray-600 text-sm mb-4">Configure Slack and email notifications for your team</p>
              <Link href="/dashboard/settings">
                <Button variant="outline" className="w-full group">
                  Configure
                  <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </Card>
          </div>

          {/* Organization Settings */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold">Organization Settings</h3>
                <p className="text-gray-600 text-sm mt-1">General organization configuration and preferences</p>
              </div>
              <Settings className="h-6 w-6 text-gray-400" />
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">Default Policy for New Repositories</p>
                  <p className="text-sm text-gray-600">Policy applied automatically to new repos</p>
                </div>
                <Badge variant="outline">Not configured</Badge>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">Enforce Signed Commits</p>
                  <p className="text-sm text-gray-600">Require GPG signing for all commits</p>
                </div>
                <Badge variant="outline">Disabled</Badge>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">Require Policy Acknowledgment</p>
                  <p className="text-sm text-gray-600">Users must acknowledge org policies before reviewing code</p>
                </div>
                <Badge variant="outline">Disabled</Badge>
              </div>
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}
