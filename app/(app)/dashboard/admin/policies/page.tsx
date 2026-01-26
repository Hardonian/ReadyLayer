'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Edit2, Copy, Trash2 } from 'lucide-react'

interface PolicySummary {
  id: string
  name: string
  description: string
}

export default function PoliciesPage(): React.ReactElement {
  const [policies] = useState<PolicySummary[]>([])
  const [showBuilder, setShowBuilder] = useState<boolean>(false)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Security Policies</h1>
          <p className="text-muted-foreground mt-2">
            Define and manage security policies for your organization
          </p>
        </div>
        <Button onClick={() => setShowBuilder(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Policy
        </Button>
      </div>

      {showBuilder && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Policy</CardTitle>
            <CardDescription>
              Use a template or build a custom security policy
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* TODO: Render PolicyBuilder component */}
            <p className="text-sm text-muted-foreground">Policy builder coming soon</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Policy Templates</CardTitle>
          <CardDescription>
            Pre-built templates for common compliance standards
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* TODO: Render PolicyTemplateSelector component */}
          <p className="text-sm text-muted-foreground">Policy templates coming soon</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Organization Policies</CardTitle>
          <CardDescription>
            {policies.length} polic{policies.length !== 1 ? 'ies' : 'y'} configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          {policies.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No policies configured yet. Create one to get started!
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {policies.map((policy) => (
                <div key={policy.id} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-medium">{policy.name}</p>
                    <p className="text-sm text-muted-foreground">{policy.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
