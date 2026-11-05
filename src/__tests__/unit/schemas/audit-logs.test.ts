import { describe, it, expect } from 'vitest'
import {
  getAuditLogsQuerySchema,
  exportAuditLogsQuerySchema,
} from '../../../shared/schemas/audit-logs'

describe('Audit Logs Schemas', () => {
  describe('getAuditLogsQuerySchema', () => {
    it('should validate with default values', () => {
      const result = getAuditLogsQuerySchema.parse({})

      expect(result.page).toBe(1)
      expect(result.limit).toBe(50)
    })

    it('should coerce string numbers to integers', () => {
      const result = getAuditLogsQuerySchema.parse({
        page: '2',
        limit: '25',
      })

      expect(result.page).toBe(2)
      expect(result.limit).toBe(25)
      expect(typeof result.page).toBe('number')
      expect(typeof result.limit).toBe('number')
    })

    it('should enforce max limit of 100', () => {
      expect(() => {
        getAuditLogsQuerySchema.parse({ limit: '150' })
      }).toThrow()
    })

    it('should enforce positive integers for page and limit', () => {
      expect(() => {
        getAuditLogsQuerySchema.parse({ page: '0' })
      }).toThrow()

      expect(() => {
        getAuditLogsQuerySchema.parse({ page: '-1' })
      }).toThrow()

      expect(() => {
        getAuditLogsQuerySchema.parse({ limit: '0' })
      }).toThrow()
    })

    it('should accept optional filter fields', () => {
      const result = getAuditLogsQuerySchema.parse({
        module: 'collection',
        action: 'create',
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        target_id: '123e4567-e89b-12d3-a456-426614174001',
      })

      expect(result.module).toBe('collection')
      expect(result.action).toBe('create')
      expect(result.user_id).toBe('123e4567-e89b-12d3-a456-426614174000')
      expect(result.target_id).toBe('123e4567-e89b-12d3-a456-426614174001')
    })

    it('should accept optional date range filters', () => {
      const result = getAuditLogsQuerySchema.parse({
        start_date: '2024-01-01T00:00:00Z',
        end_date: '2024-12-31T23:59:59Z',
      })

      expect(result.start_date).toBe('2024-01-01T00:00:00Z')
      expect(result.end_date).toBe('2024-12-31T23:59:59Z')
    })

    it('should validate UUID format for user_id and target_id', () => {
      expect(() => {
        getAuditLogsQuerySchema.parse({ user_id: 'invalid-uuid' })
      }).toThrow()

      expect(() => {
        getAuditLogsQuerySchema.parse({ target_id: 'not-a-uuid' })
      }).toThrow()
    })

    it('should validate datetime format for dates', () => {
      expect(() => {
        getAuditLogsQuerySchema.parse({ start_date: 'invalid-date' })
      }).toThrow()

      expect(() => {
        getAuditLogsQuerySchema.parse({ end_date: '2024-13-45' })
      }).toThrow()
    })

    it('should allow all optional fields to be omitted', () => {
      const result = getAuditLogsQuerySchema.parse({ page: '1', limit: '20' })

      expect(result.module).toBeUndefined()
      expect(result.action).toBeUndefined()
      expect(result.user_id).toBeUndefined()
      expect(result.target_id).toBeUndefined()
      expect(result.start_date).toBeUndefined()
      expect(result.end_date).toBeUndefined()
    })
  })

  describe('exportAuditLogsQuerySchema', () => {
    it('should default format to csv', () => {
      const result = exportAuditLogsQuerySchema.parse({})

      expect(result.format).toBe('csv')
    })

    it('should accept csv format', () => {
      const result = exportAuditLogsQuerySchema.parse({ format: 'csv' })

      expect(result.format).toBe('csv')
    })

    it('should accept json format', () => {
      const result = exportAuditLogsQuerySchema.parse({ format: 'json' })

      expect(result.format).toBe('json')
    })

    it('should reject invalid formats', () => {
      expect(() => {
        exportAuditLogsQuerySchema.parse({ format: 'xml' })
      }).toThrow()

      expect(() => {
        exportAuditLogsQuerySchema.parse({ format: 'pdf' })
      }).toThrow()
    })

    it('should accept optional filter fields', () => {
      const result = exportAuditLogsQuerySchema.parse({
        format: 'json',
        module: 'collection_member',
        action: 'update_role',
        user_id: '123e4567-e89b-12d3-a456-426614174000',
      })

      expect(result.format).toBe('json')
      expect(result.module).toBe('collection_member')
      expect(result.action).toBe('update_role')
      expect(result.user_id).toBe('123e4567-e89b-12d3-a456-426614174000')
    })

    it('should accept date range filters', () => {
      const result = exportAuditLogsQuerySchema.parse({
        start_date: '2024-01-01T00:00:00Z',
        end_date: '2024-06-30T23:59:59Z',
      })

      expect(result.start_date).toBe('2024-01-01T00:00:00Z')
      expect(result.end_date).toBe('2024-06-30T23:59:59Z')
    })

    it('should validate UUID format for user_id', () => {
      expect(() => {
        exportAuditLogsQuerySchema.parse({ user_id: 'invalid' })
      }).toThrow()
    })

    it('should validate datetime format for dates', () => {
      expect(() => {
        exportAuditLogsQuerySchema.parse({ start_date: 'bad-date' })
      }).toThrow()
    })
  })
})
