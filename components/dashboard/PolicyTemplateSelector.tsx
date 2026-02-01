'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Shield, AlertTriangle, Zap } from 'lucide-react'

export interface PolicyTemplate {
  id: string
  name: string
  description: string
  category: 'security' | 'compliance' | 'quality' | 'performance'
  ruleCount: number
  minCoverage: number
  enforced: boolean
}

export interface PolicyTemplateSelectorProps {
  templates: PolicyTemplate[]
  onSelect?: (templateId: string) => void
  onApply?: (templateId: string) => void
  selected?: string[]
}

export function PolicyTemplateSelector({
  templates,
  onSelect,
  onApply,
  selected = [],
}: PolicyTemplateSelectorProps): React.JSX.Element {
  const categories = ['security', 'compliance', 'quality', 'performance']

  const getIcon = (category: string) => {
    switch (category) {
      case 'security':
        return <Shield className="h-5 w-5" />
      case 'compliance':
        return <AlertTriangle className="h-5 w-5" />
      case 'quality':
        return <Zap className="h-5 w-5" />
      default:
        return <Zap className="h-5 w-5" />
    }
  }

  return (
    <div className="space-y-6">
      {categories.map(category => (
        <div key={category}>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            {getIcon(category)}
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates
              .filter(t => t.category === category)
              .map(template => (
                <Card
                  key={template.id}
                  className={`cursor-pointer transition-all ${
                    selected.includes(template.id)
                      ? 'border-primary ring-2 ring-primary'
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => onSelect?.(template.id)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2">
                          {template.name}
                          {selected.includes(template.id) && (
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                          )}
                        </CardTitle>
                        <CardDescription>
                          {template.description}
                        </CardDescription>
                      </div>
                      {template.enforced && (
                        <Badge variant="secondary" className="ml-2">
                          Enforced
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Rules</p>
                        <p className="font-semibold">{template.ruleCount}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Min Coverage</p>
                        <p className="font-semibold">{template.minCoverage}%</p>
                      </div>
                    </div>
                    <Button
                      className="w-full"
                      variant={
                        selected.includes(template.id)
                          ? 'default'
                          : 'outline'
                      }
                      onClick={e => {
                        e.stopPropagation()
                        onApply?.(template.id)
                      }}
                    >
                      {selected.includes(template.id)
                        ? 'Applied'
                        : 'Apply Template'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      ))}
    </div>
  )
}
