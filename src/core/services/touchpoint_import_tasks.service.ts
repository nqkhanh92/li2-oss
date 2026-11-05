import { queryBuilderByParams } from '@/shared/lib/utils'
import { BaseService } from './base.service'
import { SearchFilterPagination } from '@/shared/types'
import { logger } from '@/infrastructure/logging/logger'
import { PostgrestFilterBuilder } from '@supabase/postgrest-js'
import { z } from 'zod'
import { nonScopePolicies } from '@/shared/lib/permission/policy'
import { ensurePolicy } from '@/shared/lib/permission/permissions'
import { AppError, BadRequestError } from '../../infrastructure/response/errors/domain.errors'
import {
  touchpointImportTasksRepo,
  TouchpointImportTasksRepository,
} from '../repositories/touchpoint_import_tasks.repository'
import {
  createTouchpointImportTasksSchema,
  csvImportSchema,
  sheetsImportSchema,
} from '@/shared/schemas/touch-points/touchpoint_import_tasks'
import { TablesInsert } from '@/shared/types/database.types'
import { redis } from '@/infrastructure/cache/redis'
import { getColumns } from '@/features/touch-points/constants/import'
import { aiProviderService } from './ai-provider.service'
import { TouchPointExportType } from '../types/touch-point.type'
import { ADVANCED_FEATURE_KEYS } from '@/shared/types/plan-permission'
import { ensureOrgPlan } from '@/shared/lib/plan/plans'
import { simpleUploadFile } from '@/shared/lib/storage/upload'
import { integrationService } from './integration.service'
import { GoogleSheetsIntegrationService } from '@/infrastructure/external/integrations/google-sheets.service'
import { googleSheetsConfigSchema } from '@/shared/schemas/integrations'

const log = logger.child({ module: 'touchpoint_import_tasks-service' })

/**
 * Service class for managing touch point import tasks in the proximity marketing system.
 * Handles import task creation, retrieval, AI-powered column mapping, and Redis queue management.
 *
 * @extends BaseService<TouchpointImportTasksRepository>
 */
export class TouchPointImportTasksService extends BaseService<TouchpointImportTasksRepository> {
  /**
   * Creates an instance of TouchPointImportTasksService.
   *
   * @param {TouchpointImportTasksRepository} repo - The touchpoint import tasks repository instance
   */
  constructor(repo: TouchpointImportTasksRepository) {
    super(repo)
  }

  /**
   * Automatically maps CSV headers to touch point columns using AI.
   * Validates that the organization has the import touchpoints feature enabled.
   *
   * @param {string} orgId - The organization ID
   * @param {string[]} headers - CSV headers from the import file
   * @param {string[]} columns - Available touch point column names
   * @returns {Promise<any>} The AI-generated column mapping
   * @throws {Error} When organization doesn't have import feature access
   */
  async autoMappingImport(orgId: string, headers: string[], columns: string[]) {
    await ensureOrgPlan(orgId, ADVANCED_FEATURE_KEYS.IMPORT_TOUCHPOINTS)

    const autoMapping = await aiProviderService.generateColumnMapping(
      headers,
      columns as (keyof TouchPointExportType)[]
    )
    return autoMapping
  }

  /**
   * Retrieves a touchpoint import task by its ID with optional user filtering.
   *
   * @param {string} id - The touchpoint import task ID
   * @param {string} orgId - The organization ID
   * @param {Object} [options] - Optional parameters for user filtering
   * @param {string} [options.userId] - User ID for filtering by owner
   * @returns {Promise<any>} The touchpoint import task details
   */
  async getTouchpointImportTasksById(
    id: string,
    orgId: string,
    options?: {
      userId?: string
    }
  ) {
    const { userId } = options ?? {}
    const modifier = (query: PostgrestFilterBuilder<any, any, any>) => {
      if (userId) {
        query = query.eq('user_id', userId)
      }
      return query
    }
    return this.repo.getTouchpointImportTasksDetail(id, orgId, modifier)
  }

  /**
   * Retrieves all touchpoint import tasks for an organization with optional filtering and pagination.
   * Supports search by name and user filtering.
   *
   * @param {string} orgId - The organization ID
   * @param {Object} [options] - Optional parameters for filtering
   * @param {string} [options.userId] - User ID for filtering by owner
   * @param {SearchFilterPagination} [options.queryParams] - Query parameters for search, filtering, and pagination
   * @returns {Promise<any>} Array of touchpoint import tasks matching the criteria
   */
  async getAllTouchpointImportTasks(
    orgId: string,
    options?: {
      userId?: string
      queryParams?: SearchFilterPagination
    }
  ) {
    const { userId, queryParams } = options ?? {}

    const modifier = (query: PostgrestFilterBuilder<any, any, any>) => {
      if (queryParams) {
        query = queryBuilderByParams(query, queryParams)
        if (queryParams.search) {
          query = query.ilike('name', `%${queryParams.search}%`)
        }
      }
      if (userId) {
        query = query.eq('user_id', userId)
      }
      return query
    }

    return this.repo.findAllByOrganization(orgId, modifier)
  }

  /**
   * Creates a new touchpoint import task and adds it to the Redis processing queue.
   * Handles permission checks and pushes the task to the 'touch_point:import' queue.
   *
   * @param {string} orgId - The organization ID
   * @param {TablesInsert<'touchpoint_import_tasks'>} validatedData - Validated import task data
   * @param {string} userId - The user ID creating the import task
   * @returns {Promise<string>} The created import task ID
   * @throws {BadRequestError} When validation fails
   * @throws {AppError} When any other error occurs during creation
   */
  async createTouchpointImportTasks(
    orgId: string,
    userId: string,
    data: z.infer<typeof createTouchpointImportTasksSchema>
  ) {
    let createdImportTaskId: string = ''
    try {
      //** Permission check */
      await ensurePolicy(orgId, nonScopePolicies.add_touch_point)
      let validatedData: { file_path: string; transform: Record<string, any> }
      switch (data.type) {
        case 'csv':
          validatedData = await this.parseCsvImportTasks(data)
          break
        case 'sheets':
          validatedData = await this.parseSheetsImportTasks(orgId, data)
          break
      }
      const createdImportTask = await this.repo.create({
        ...validatedData,
        org_id: orgId,
        user_id: userId,
      })
      createdImportTaskId = createdImportTask.id
      await redis.rpush(
        'touch_point:import',
        JSON.stringify({
          task_id: createdImportTaskId,
        })
      )
      return createdImportTaskId
    } catch (error: any) {
      if (error instanceof BadRequestError) {
        throw error.toResponse()
      }
      throw new AppError(error?.message)
    }
  }

  async parseCsvImportTasks(data: z.infer<typeof csvImportSchema>) {
    const validatedData = csvImportSchema.parse(data)
    const uploadResponse = await simpleUploadFile({
      folder: 'touchpoint-import-tasks',
      file: validatedData.file,
      allowedTypes: ['text/csv'],
    })

    return {
      file_path: uploadResponse.path,
      transform: validatedData.transform,
    }
  }

  async parseSheetsImportTasks(orgId: string, data: z.infer<typeof sheetsImportSchema>) {
    const validatedData = sheetsImportSchema.parse(data)
    const integration = await integrationService.findById(orgId, validatedData.integration_id)
    const sheetsService = new GoogleSheetsIntegrationService(
      integration.config as z.infer<typeof googleSheetsConfigSchema>['config'],
      validatedData.integration_id
    )
    const csv = await sheetsService.getCsvFile(validatedData.spreadsheet_id, validatedData.sheet_id)

    const uploadResponse = await simpleUploadFile({
      folder: 'touchpoint-import-tasks',
      file: csv,
      allowedTypes: ['text/csv'],
    })

    return {
      file_path: uploadResponse.path,
      transform: validatedData.transform,
    }
  }
}

export const touchPointImportTasksService =
  process.env.NODE_ENV !== 'production'
    ? new TouchPointImportTasksService(touchpointImportTasksRepo)
    : globalThis._touchPointImportTasksService ??
      (globalThis._touchPointImportTasksService = new TouchPointImportTasksService(
        touchpointImportTasksRepo
      ))
