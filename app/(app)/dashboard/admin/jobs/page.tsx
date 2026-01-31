'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle,
  RefreshCw,
  Play,
  Pause,
  Ban
} from 'lucide-react'
import { useToast } from '@/lib/hooks/use-toast'

interface Job {
  id: string
  type: string
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'dead' | 'canceled'
  progress: {
    retryCount: number
    maxRetries: number
  }
  timestamps: {
    createdAt: string
    startedAt?: string
    completedAt?: string
  }
  payload: {
    type: string
  }
  tenantId?: string
  repositoryId?: string
}

interface JobsResponse {
  data: Job[]
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
}

const statusIcons = {
  queued: <Clock className="h-4 w-4 text-yellow-500" />,
  running: <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />,
  succeeded: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  failed: <XCircle className="h-4 w-4 text-red-500" />,
  dead: <AlertCircle className="h-4 w-4 text-gray-500" />,
  canceled: <Ban className="h-4 w-4 text-orange-500" />,
}

const statusBadges = {
  queued: <Badge variant="secondary">Queued</Badge>,
  running: <Badge variant="default" className="bg-blue-500">Running</Badge>,
  succeeded: <Badge variant="default" className="bg-green-500">Succeeded</Badge>,
  failed: <Badge variant="destructive">Failed</Badge>,
  dead: <Badge variant="outline">Dead</Badge>,
  canceled: <Badge variant="secondary">Canceled</Badge>,
}

export default function JobsAdminPage(): React.JSX.Element {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 20,
    offset: 0,
    hasMore: false,
  })
  const [polling, setPolling] = useState(true)
  const { toast } = useToast()

  const fetchJobs = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        limit: String(pagination.limit),
        offset: String(pagination.offset),
      })

      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }

      if (typeFilter !== 'all') {
        params.append('type', typeFilter)
      }

      const response = await fetch(`/api/jobs?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch jobs')
      }

      const result = (await response.json()) as JobsResponse
      setJobs(result.data)
      setPagination(result.pagination)
    } catch (_error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch jobs. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [pagination.limit, pagination.offset, statusFilter, typeFilter, toast])

  useEffect(() => {
    fetchJobs()

    // Polling for status updates
    let interval: NodeJS.Timeout | null = null
    if (polling) {
      interval = setInterval(fetchJobs, 5000) // Poll every 5 seconds
    }

    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [fetchJobs, polling])

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleString()
  }

  const formatDuration = (start?: string, end?: string) => {
    if (!start) return '-'
    const startTime = new Date(start).getTime()
    const endTime = end ? new Date(end).getTime() : Date.now()
    const duration = endTime - startTime
    const seconds = Math.floor(duration / 1000)
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ${seconds % 60}s`
    const hours = Math.floor(minutes / 60)
    return `${hours}h ${minutes % 60}m`
  }

  const jobTypes = Array.from(new Set(jobs.map((j) => j.type)))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Jobs</h1>
          <p className="text-muted-foreground mt-2">
            Monitor and manage background job processing
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPolling(!polling)}
          >
            {polling ? (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Resume
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchJobs}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Job Queue</CardTitle>
          <CardDescription>
            Background jobs are processed asynchronously. Jobs may take longer if workers are busy.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="queued">Queued</SelectItem>
                  <SelectItem value="running">Running</SelectItem>
                  <SelectItem value="succeeded">Succeeded</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="dead">Dead</SelectItem>
                  <SelectItem value="canceled">Canceled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {jobTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading && jobs.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No jobs found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Jobs will appear here when background tasks are created
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-left py-3 px-4 font-medium">Type</th>
                    <th className="text-left py-3 px-4 font-medium">Created</th>
                    <th className="text-left py-3 px-4 font-medium">Duration</th>
                    <th className="text-left py-3 px-4 font-medium">Retries</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {statusIcons[job.status]}
                          {statusBadges[job.status]}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <code className="text-sm bg-muted px-2 py-1 rounded">
                          {job.type}
                        </code>
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {formatDate(job.timestamps.createdAt)}
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {formatDuration(job.timestamps.startedAt, job.timestamps.completedAt)}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {job.progress.retryCount > 0 ? (
                          <span className="text-orange-500">
                            {job.progress.retryCount}/{job.progress.maxRetries}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0/{job.progress.maxRetries}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pagination.hasMore && (
            <div className="mt-6 flex justify-center">
              <Button
                variant="outline"
                onClick={() => {
                  setPagination((prev) => ({ ...prev, offset: prev.offset + prev.limit }))
                }}
                disabled={loading}
              >
                Load More
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Queued Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {jobs.filter((j) => j.status === 'queued').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Waiting to be processed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Running Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {jobs.filter((j) => j.status === 'running').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently being processed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Failed Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {jobs.filter((j) => j.status === 'failed' || j.status === 'dead').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Require attention or retry
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
