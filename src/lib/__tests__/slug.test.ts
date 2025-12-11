/// <reference types="vitest" />
import { describe, expect, it } from 'vitest'
import { generateSlug, validateSlug, validateUrl } from '../slug'

describe('slug utils', () => {
  it('generates slug with allowed charset/length', () => {
    const slug = generateSlug()
    expect(slug).toMatch(/^[a-z0-9]{7}$/)
  })

  it('validates slug rules', () => {
    expect(validateSlug('abc-123').success).toBe(true)
    expect(validateSlug('ABCD').success).toBe(false)
    expect(validateSlug('a').success).toBe(false)
  })

  it('validates url', () => {
    expect(validateUrl('https://example.com').success).toBe(true)
    expect(validateUrl('not-url').success).toBe(false)
  })
})

