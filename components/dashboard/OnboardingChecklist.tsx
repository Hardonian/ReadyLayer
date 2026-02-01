'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Zap } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { staggerContainer, staggerItem } from '@/lib/design/motion'
import { trackOnboardingEvent } from '@/lib/telemetry/analytics'

export interface ChecklistItem {
  id: string
  title: string
  description: string
  completed: boolean
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
  estimatedMinutes?: number
}

interface OnboardingChecklistProps {
  items: ChecklistItem[]
  title?: string
  subtitle?: string
  onItemClick?: (itemId: string) => void
  onComplete?: () => void
  compact?: boolean
}

export function OnboardingChecklist({
  items,
  title = 'Get Started with ReadyLayer',
  subtitle = 'Follow these steps to enforce code quality in your repos',
  onItemClick,
  onComplete,
  compact = false,
}: OnboardingChecklistProps): React.JSX.Element {
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  const [localItems] = useState(items)

  const completedCount = localItems.filter((item) => item.completed).length
  const progress = (completedCount / localItems.length) * 100
  const isFullyComplete = completedCount === localItems.length

  // Track onboarding start on first render
  useEffect(() => {
    trackOnboardingEvent('started', undefined, {
      totalSteps: items.length,
    })
  }, [items.length])

  // Track completion status changes
  useEffect(() => {
    if (isFullyComplete && onComplete) {
      trackOnboardingEvent('completed', undefined, {
        totalSteps: items.length,
        completedSteps: completedCount,
      })
      onComplete()
    }
  }, [isFullyComplete, onComplete, items.length, completedCount])

  // Track step completion
  useEffect(() => {
    const completedItems = localItems.filter((item) => item.completed)
    if (completedItems.length > 0) {
      const lastCompleted = completedItems[completedItems.length - 1]
      trackOnboardingEvent('step-completed', lastCompleted.title, {
        stepIndex: items.findIndex((item) => item.id === lastCompleted.id) + 1,
        totalSteps: items.length,
        progress: Math.round(progress),
      })
    }
  }, [localItems, items, progress])

  const handleItemClick = (itemId: string) => {
    if (onItemClick) {
      onItemClick(itemId)
    }
    const clickedItem = items.find((item) => item.id === itemId)
    if (clickedItem) {
      trackOnboardingEvent('step-completed', clickedItem.title, {
        stepIndex: items.findIndex((item) => item.id === itemId) + 1,
        totalSteps: items.length,
        progress: Math.round(progress),
      })
    }
    setExpandedItem(expandedItem === itemId ? null : itemId)
  }

  if (compact) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {completedCount} of {localItems.length} steps completed
              </span>
              <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-primary/10">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="space-y-4"
    >
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <div className="space-y-2">
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              {title}
            </CardTitle>
            {subtitle && <CardDescription>{subtitle}</CardDescription>}
          </div>

          {/* Progress Bar */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Progress</span>
              <span className="text-muted-foreground">
                {completedCount} of {localItems.length}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-primary/10">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Completion Message */}
          <AnimatePresence>
            {isFullyComplete && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-4 flex items-center gap-2 rounded-lg bg-green-100/50 p-3 text-sm text-green-800"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>🎉 All set! ReadyLayer is ready to enforce your code quality.</span>
              </motion.div>
            )}
          </AnimatePresence>
        </CardHeader>

        <CardContent className="space-y-2">
          {localItems.map((item, index) => (
            <motion.div
              key={item.id}
              variants={staggerItem}
              onClick={() => handleItemClick(item.id)}
              className="cursor-pointer"
            >
              <div
                className={`flex items-start gap-3 rounded-lg p-3 transition-colors ${
                  expandedItem === item.id
                    ? 'bg-primary/10'
                    : item.completed
                      ? 'bg-green-50/50'
                      : 'bg-secondary/30 hover:bg-secondary/50'
                }`}
              >
                {/* Checkbox */}
                <motion.div
                  initial={false}
                  animate={{ scale: item.completed ? 1.1 : 1 }}
                  className="mt-0.5 flex-shrink-0"
                >
                  {item.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </motion.div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className={`font-medium ${item.completed ? 'text-muted-foreground' : ''}`}>
                      {index + 1}. {item.title}
                    </h4>
                    {item.estimatedMinutes && (
                      <span className="text-xs text-muted-foreground">
                        ~{item.estimatedMinutes}min
                      </span>
                    )}
                  </div>
                  <AnimatePresence>
                    {expandedItem === item.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="mt-2 space-y-3"
                      >
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                        {item.action && (
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (item.action?.onClick) item.action.onClick()
                            }}
                            {...(item.action.href && { asChild: true })}
                          >
                            {item.action.href ? (
                              <a href={item.action.href}>{item.action.label}</a>
                            ) : (
                              item.action.label
                            )}
                          </Button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Chevron */}
                <motion.div
                  animate={{ rotate: expandedItem === item.id ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex-shrink-0 text-muted-foreground"
                >
                  {expandedItem === item.id ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </motion.div>
              </div>
            </motion.div>
          ))}
        </CardContent>
      </Card>
    </motion.div>
  )
}

export default OnboardingChecklist
