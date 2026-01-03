'use client'

import React, { useState } from 'react'
import { useOrganizationId } from '@/lib/hooks'
import { Container } from '@/components/ui/container'
import { Card, CardContent, CardHeader, CardTitle, ErrorState, Skeleton, Button } from '@/components/ui'
import { motion } from 'framer-motion'
import { fadeIn } from '@/lib/design/motion'
import { FileText, Download, Search, Filter } from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase/client'

export default function AuditPage() {
  const { organizationId, loading } = useOrganizationId()
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    if (!organizationId) return
    setExporting(true)
    try {
      const supabase = createSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // Would call export API endpoint
      const response = await fetch(`/api/v1/evidence/export?organizationId=${organizationId}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `readylayer-audit-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <Container className="py-8">
        <Skeleton className="h-10 w-64 mb-4" />
        <Skeleton className="h-96 w-full" />
      </Container>
    )
  }

  if (!organizationId) {
    return (
      <Container className="py-8">
        <ErrorState message="Organization ID required. Please connect a repository first." />
      </Container>
    )
  }

  return (
    <Container className="py-8">
      <motion.div className="space-y-6" variants={fadeIn} initial="hidden" animate="visible">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <FileText className="h-8 w-8" />
              Audit Trail
            </h1>
            <p className="text-muted-foreground mt-1">
              Evidence explorer and deterministic audit exports
            </p>
          </div>
          <Button onClick={handleExport} disabled={exporting}>
            <Download className="h-4 w-4 mr-2" />
            {exporting ? 'Exporting...' : 'Export Audit Pack'}
          </Button>
        </div>

        {/* Search & Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by run ID, policy ID, finding ID..."
                  className="w-full pl-10 pr-4 py-2 border rounded-lg bg-surface"
                />
              </div>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Evidence List */}
        <Card>
          <CardHeader>
            <CardTitle>Evidence Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Evidence records will appear here</p>
              <p className="text-sm mt-2">
                Each record includes run_id, policy_id, finding_id, timestamps, and deterministic hashes
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Export Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Export Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between p-3 bg-surface-muted rounded-lg">
                <span className="font-medium">Format</span>
                <span>JSON / CSV</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-surface-muted rounded-lg">
                <span className="font-medium">Includes</span>
                <span>run_id, policy_id, finding_id, timestamps, hashes, override reasons</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-surface-muted rounded-lg">
                <span className="font-medium">Time Range</span>
                <span>Last 30 days</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </Container>
  )
}
