'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2 } from 'lucide-react'

export interface PolicyRule {
  id: string
  name: string
  description: string
  enabled: boolean
  severity: 'critical' | 'high' | 'medium' | 'low'
}

export interface PolicyBuilderProps {
  onSave?: (policy: { name: string; rules: PolicyRule[] }) => void
  onCancel?: () => void
  initialPolicy?: { name: string; rules: PolicyRule[] }
}

export function PolicyBuilder({
  onSave,
  onCancel,
  initialPolicy,
}: PolicyBuilderProps): React.JSX.Element {
  const [name, setName] = useState(initialPolicy?.name || '')
  const [rules, setRules] = useState<PolicyRule[]>(initialPolicy?.rules || [])
  const [newRuleName, setNewRuleName] = useState('')

  const addRule = () => {
    if (!newRuleName.trim()) return

    const newRule: PolicyRule = {
      id: `rule_${Date.now()}`,
      name: newRuleName,
      description: '',
      enabled: true,
      severity: 'high',
    }

    setRules([...rules, newRule])
    setNewRuleName('')
  }

  const removeRule = (id: string) => {
    setRules(rules.filter(r => r.id !== id))
  }

  const toggleRule = (id: string) => {
    setRules(
      rules.map(r =>
        r.id === id ? { ...r, enabled: !r.enabled } : r
      )
    )
  }

  const handleSave = () => {
    if (!name.trim()) {
      alert('Please enter a policy name')
      return
    }

    onSave?.({ name, rules })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium">Policy Name</label>
        <Input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g., OWASP Top 10 Security Policy"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rules</CardTitle>
          <CardDescription>
            Add security rules to enforce with this policy
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {rules.map(rule => (
            <div
              key={rule.id}
              className="flex items-start gap-3 p-3 border rounded"
            >
              <Checkbox
                checked={rule.enabled}
                onCheckedChange={() => toggleRule(rule.id)}
              />
              <div className="flex-1">
                <p className="font-medium">{rule.name}</p>
                {rule.description && (
                  <p className="text-sm text-muted-foreground">
                    {rule.description}
                  </p>
                )}
              </div>
              <span className={`text-xs px-2 py-1 rounded ${
                rule.severity === 'critical' ? 'bg-red-100 text-red-800' :
                rule.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                rule.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {rule.severity.charAt(0).toUpperCase() + rule.severity.slice(1)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeRule(rule.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <div className="flex gap-2 pt-2 border-t">
            <Input
              value={newRuleName}
              onChange={e => setNewRuleName(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && addRule()}
              placeholder="Add new rule..."
            />
            <Button onClick={addRule} size="sm">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button onClick={handleSave}>Save Policy</Button>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
