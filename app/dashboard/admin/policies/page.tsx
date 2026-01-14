'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useOrganizationId } from '@/lib/hooks/use-organization-id';
import { PolicyTemplateSelector } from '@/components/dashboard/PolicyTemplateSelector';
import { ArrowLeft, Plus, Copy, Trash2, FileText } from 'lucide-react';

interface OrgPolicy {
  id: string;
  name: string;
  description: string;
  template: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  ruleCount: number;
  applicableRepos: number;
}

export default function PoliciesPage() {
  const organizationId = useOrganizationId();
  const [policies, setPolicies] = useState<OrgPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);

  useEffect(() => {
    const fetchPolicies = async () => {
      if (!organizationId) return;

      try {
        const response = await fetch(`/api/v1/admin/policies?org=${organizationId}`);
        if (!response.ok) throw new Error('Failed to fetch policies');
        const data = await response.json();
        setPolicies(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load policies');
      } finally {
        setLoading(false);
      }
    };

    fetchPolicies();
  }, [organizationId]);

  const handleDeletePolicy = async (policyId: string) => {
    if (!confirm('Are you sure you want to delete this policy?')) return;

    try {
      const response = await fetch(`/api/v1/admin/policies/${policyId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete policy');

      setPolicies(policies.filter((p) => p.id !== policyId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete policy');
    }
  };

  const handleDuplicatePolicy = async (policyId: string) => {
    try {
      const response = await fetch(`/api/v1/admin/policies/${policyId}/duplicate`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to duplicate policy');

      const newPolicy = await response.json();
      setPolicies([newPolicy, ...policies]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to duplicate policy');
    }
  };

  const handleCreateFromTemplate = async (template: string) => {
    // This would open an editor to create the policy from template
    setShowTemplateSelector(false);
  };

  const defaultPolicy = policies.find((p) => p.isDefault);
  const customPolicies = policies.filter((p) => !p.isDefault);

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
          <h1 className="text-3xl font-bold">Organization Policies</h1>
          <p className="text-gray-600 mt-2">Create and manage code review policies at the organization level</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Template Selector */}
      {showTemplateSelector && (
        <Card className="p-6 bg-blue-50 border-blue-200">
          <PolicyTemplateSelector onSelect={handleCreateFromTemplate} />
        </Card>
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Available Policies</h2>
        {!showTemplateSelector && (
          <Button onClick={() => setShowTemplateSelector(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Policy
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : policies.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">No policies created yet</p>
          <Button onClick={() => setShowTemplateSelector(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create your first policy
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Default Policy */}
          {defaultPolicy && (
            <div>
              <h3 className="text-sm font-semibold text-gray-600 mb-3">DEFAULT POLICY</h3>
              <Card className="p-6 border-2 border-blue-200 bg-blue-50">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold">{defaultPolicy.name}</h3>
                      <Badge className="bg-blue-600">Default</Badge>
                    </div>
                    <p className="text-gray-600">{defaultPolicy.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-white rounded-lg">
                  <div>
                    <p className="text-xs text-gray-600">Rules</p>
                    <p className="text-lg font-semibold">{defaultPolicy.ruleCount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Applied To</p>
                    <p className="text-lg font-semibold">{defaultPolicy.applicableRepos} repos</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Last Updated</p>
                    <p className="text-sm">
                      {new Date(defaultPolicy.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1">Edit</Button>
                  <Button
                    variant="outline"
                    onClick={() => handleDuplicatePolicy(defaultPolicy.id)}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicate
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {/* Custom Policies */}
          {customPolicies.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-600 mb-3">CUSTOM POLICIES</h3>
              <div className="space-y-3">
                {customPolicies.map((policy) => (
                  <Card key={policy.id} className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold">{policy.name}</h3>
                        <p className="text-gray-600 text-sm">{policy.description}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-xs text-gray-600">Rules</p>
                        <p className="text-lg font-semibold">{policy.ruleCount}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Applied To</p>
                        <p className="text-lg font-semibold">{policy.applicableRepos} repos</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Last Updated</p>
                        <p className="text-sm">
                          {new Date(policy.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1">Edit</Button>
                      <Button
                        variant="outline"
                        onClick={() => handleDuplicatePolicy(policy.id)}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => handleDeletePolicy(policy.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
