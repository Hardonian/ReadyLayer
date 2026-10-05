import { describe, expect, it, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const {
  findMemberships,
  findPolicyPacks,
  createPolicyPack,
  findRepository,
} = vi.hoisted(() => ({
  findMemberships: vi.fn(),
  findPolicyPacks: vi.fn(),
  createPolicyPack: vi.fn(),
  findRepository: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn().mockResolvedValue({
    id: 'user_test',
    email: 'admin@example.com',
    name: 'Admin',
    organizationIds: ['org_test'],
  }),
  hasRole: vi.fn().mockResolvedValue(true),
}))

vi.mock('@/lib/authz', () => ({
  createAuthzMiddleware: () => vi.fn().mockResolvedValue(null),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    organizationMember: { findMany: findMemberships },
    policyPack: { findMany: findPolicyPacks, create: createPolicyPack },
    repository: { findFirst: findRepository },
  },
}))

import { GET, POST } from '@/app/api/v1/policies/gates/route'

describe('policy gates API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    findMemberships.mockResolvedValue([{ organizationId: 'org_test' }])
    findRepository.mockResolvedValue({ id: 'repo_test' })
  })

  it('projects policy pack rules into tenant-scoped gates', async () => {
    findPolicyPacks.mockResolvedValue([
      {
        id: 'pack_test',
        organizationId: 'org_test',
        repositoryId: null,
        version: '1.0.0',
        checksum: 'checksum_test',
        source: JSON.stringify({ name: 'Critical merge controls' }),
        organization: { name: 'Test Org' },
        repository: null,
        rules: [{
          id: 'rule_test',
          ruleId: 'critical-issues-block',
          enabled: true,
          severityMapping: { critical: 'block', high: 'warn' },
        }],
      },
    ])

    const response = await GET(new NextRequest('http://localhost/api/v1/policies/gates?organizationId=org_test'))
    const payload = await response.json() as { gates: Array<{ name: string; enforcementMode: string }> }

    expect(response.status).toBe(200)
    expect(payload.gates).toEqual([
      expect.objectContaining({
        name: 'Critical merge controls',
        enforcementMode: 'block',
      }),
    ])
    expect(findPolicyPacks).toHaveBeenCalledWith(expect.objectContaining({
      where: { organizationId: { in: ['org_test'] } },
    }))
  })

  it('creates a versioned policy pack for a new gate', async () => {
    createPolicyPack.mockImplementation(async ({ data }: { data: { organizationId: string; rules: { create: { ruleId: string; severityMapping: Record<string, string> } } } }) => ({
      id: 'pack_created',
      organizationId: data.organizationId,
      repositoryId: null,
      version: '1.0.123',
      checksum: 'checksum_created',
      source: JSON.stringify({ name: 'Critical merge controls' }),
      organization: { name: 'Test Org' },
      repository: null,
      rules: [{
        id: 'rule_created',
        ruleId: data.rules.create.ruleId,
        enabled: true,
        severityMapping: data.rules.create.severityMapping,
      }],
    }))

    const request = new NextRequest('http://localhost/api/v1/policies/gates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationId: 'org_test',
        template: 'critical-issues-block',
        enforcementMode: 'block',
      }),
    })
    const response = await POST(request)
    const payload = await response.json() as { data?: { gate?: { template: string; enforcementMode: string } } }

    expect(response.status).toBe(201)
    expect(payload.data?.gate).toEqual(expect.objectContaining({
      template: 'critical-issues-block',
      enforcementMode: 'block',
    }))
    expect(createPolicyPack).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        organizationId: 'org_test',
        rules: expect.objectContaining({
          create: expect.objectContaining({ ruleId: 'critical-issues-block' }),
        }),
      }),
    }))
  })
})
