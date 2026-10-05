import { describe, expect, it } from 'vitest'
import { parseInviteEmails } from '@/lib/admin/invite'

describe('parseInviteEmails', () => {
  it('normalizes whitespace, casing, separators, and duplicates', () => {
    expect(parseInviteEmails(' A@Example.com, b@example.com\na@example.com ')).toEqual([
      'a@example.com',
      'b@example.com',
    ])
  })

  it('returns an empty list for blank input', () => {
    expect(parseInviteEmails(' ,\n  ')).toEqual([])
  })
})
