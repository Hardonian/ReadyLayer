'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { CheckCircle2, Circle, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'

export interface FirstProofChecklistItem {
  id: string
  label: string
  status: 'pending' | 'completed' | 'failed'
  description?: string
}

interface FirstProofChecklistProps {
  items: FirstProofChecklistItem[]
  title?: string
  description?: string
}

export function FirstProofChecklist({
  items,
  title = 'First Proof Checklist',
  description = 'Complete these steps to see ReadyLayer in action',
}: FirstProofChecklistProps) {
  const completedCount = items.filter(item => item.status === 'completed').length
  const totalCount = items.length
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{completedCount}/{totalCount}</div>
            <div className="text-xs text-muted-foreground">completed</div>
          </div>
        </div>
        {/* Progress bar */}
        <div className="mt-4 h-2 bg-surface-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map((item, index) => {
            const Icon = item.status === 'completed' ? CheckCircle2 : 
                        item.status === 'failed' ? AlertCircle : Circle
            const iconColor = item.status === 'completed' ? 'text-green-500' :
                             item.status === 'failed' ? 'text-red-500' :
                             'text-muted-foreground'
            
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-surface-hover transition-colors"
              >
                <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${iconColor}`} />
                <div className="flex-1 min-w-0">
                  <div className={`font-medium ${
                    item.status === 'completed' ? 'text-foreground' :
                    item.status === 'failed' ? 'text-red-600' :
                    'text-muted-foreground'
                  }`}>
                    {item.label}
                  </div>
                  {item.description && (
                    <div className="text-sm text-muted-foreground mt-1">
                      {item.description}
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
