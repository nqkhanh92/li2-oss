/**
 * API Key Service
 *
 * Manages API key lifecycle including creation, verification, regeneration, and deletion.
 * Supports both standard API keys and bot API keys with associated user profiles.
 * Uses SHA-256 hashing with salt for secure key storage.
 *
 * @module api-key.service
 */

import { apiKeyRepo, ApiKeyRepository } from '../repositories/api-key.repository'
import { memberRepo } from '../repositories/member.repository'
import { profileRepo } from '../repositories/profile.repository'
import { organizationRepo } from '../repositories/organization.repository'
import { BaseService } from './base.service'
import { ensurePolicy, getPermissionScopeOrThrow } from '@/shared/lib/permission/permissions'
import { nonScopePolicies } from '@/shared/lib/permission/policy'
import { ROLE_PERMISSION_KEYS } from '@/shared/types/role-permission'
import { requestContext } from '@/shared/types/request'
import { ApiKeyType, CreateApiKeyRequest } from '@/shared/types/api-key'
import { AppError, NotFoundError } from '@/infrastructure/response/errors/domain.errors'
import crypto from 'crypto'
import { createClient } from '@/infrastructure/database/supabase/server'
import { v4 as uuidv4 } from 'uuid'
import { orgAuditLogService } from './org-audit-log.service'

/** Prefix for all API keys (e.g., 'li2_sk_') */
const API_KEY_PREFIX = 'li2_sk_'

/** Total length of the API key in bytes */
const API_KEY_LENGTH = 32

/** Length of the key prefix used for lookup (API_KEY_PREFIX + 4 chars) */
const PREFIX_LENGTH = 11

/** Length of the key suffix used for lookup (last 4 chars) */
const SUFFIX_LENGTH = 4

/** Length of the salt used for hashing in bytes */
const SALT_LENGTH = 32

/**
 * Generates a new API key with cryptographic hash and salt
 *
 * Creates a secure API key using crypto.randomBytes and hashes it with SHA-256.
 * The key is stored as a hash with salt, while prefix and suffix are used for efficient lookup.
 *
 * @returns Object containing the plain key (shown only once), hash, prefix, suffix, and salt
 * @example
 * const { key, hash, prefix, suffix, salt } = generateApiKey()
 * // key: 'li2_sk_AbCd1234...'
 * // prefix: 'li2_sk_AbCd'
 * // suffix: 'xyz9'
 */
function generateApiKey(): {
  key: string
  hash: string
  prefix: string
  suffix: string
  salt: string
} {
  // Generate random API key
  const randomBytes = crypto.randomBytes(API_KEY_LENGTH - PREFIX_LENGTH)
  const key = `${API_KEY_PREFIX}${randomBytes.toString('base64url')}`

  // Extract prefix and suffix for lookup
  const prefix = key.substring(0, PREFIX_LENGTH) // e.g., 'li2_sk_abcd'
  const suffix = key.substring(key.length - SUFFIX_LENGTH) // e.g., 'wxyz'

  // Generate random salt
  const salt = crypto.randomBytes(SALT_LENGTH).toString('hex')

  // Hash the key with salt: hash(key + salt)
  const hash = crypto
    .createHash('sha256')
    .update(key + salt)
    .digest('hex')

  return { key, hash, prefix, suffix, salt }
}

/**
 * Generates a unique email address for a bot user
 *
 * Creates an email in the format: {orgSlug}+bot{randomNumber}@quik.bot
 * The random number is a 4-digit zero-padded number (0000-9999)
 *
 * @param orgSlug - The organization slug to use in the email
 * @returns A unique bot email address
 * @example
 * await generateBotEmail('acme-corp')
 * // Returns: 'acme-corp+bot0123@quik.bot'
 */
async function generateBotEmail(orgSlug: string): Promise<string> {
  const botNumber = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0')
  return `${orgSlug}+bot${botNumber}@quik.bot`
}

/**
 * Service for managing API keys and bot users
 *
 * Provides methods for:
 * - Creating API keys (standard and bot types)
 * - Verifying API keys with hash comparison
 * - Regenerating API keys
 * - Managing bot user profiles and organization membership
 * - Audit logging for all API key operations
 *
 * All operations require 'manage_organization' permission.
 */
export class ApiKeyService extends BaseService<ApiKeyRepository> {
  /**
   * Creates a new ApiKeyService instance
   * @param repo - The API key repository instance
   */
  constructor(repo: ApiKeyRepository) {
    super(repo)
  }

  /**
   * Retrieves all API keys for an organization
   *
   * @param orgId - The organization ID
   * @returns Array of API keys belonging to the organization
   * @throws {PermissionError} If user lacks 'manage_organization' permission
   */
  async findAll(orgId: string) {
    await ensurePolicy(orgId, nonScopePolicies.manage_api_keys)
    return await this.repo.findByOrganization(orgId)
  }

  /**
   * Retrieves a single API key by ID
   *
   * @param orgId - The organization ID
   * @param id - The API key ID
   * @returns The API key if found
   * @throws {PermissionError} If user lacks 'manage_organization' permission
   */
  async findOneById(orgId: string, id: string) {
    await ensurePolicy(orgId, nonScopePolicies.manage_organization)
    return await this.repo.findOneById(id, orgId)
  }

  /**
   * Creates a new API key for an organization
   *
   * For bot-type keys:
   * - Creates a bot user profile with generated email
   * - Adds bot as organization member with Editor role
   * - Associates bot user ID with the API key
   *
   * The plain API key is only returned once during creation.
   *
   * @param orgId - The organization ID
   * @param request - API key creation request with name, type, permissions, and expiration
   * @returns Created API key with secret_key (shown only once)
   * @throws {AppError} If API key name already exists
   * @throws {NotFoundError} If organization or user profile not found
   * @throws {PermissionError} If user lacks 'manage_organization' permission
   */
  async createOne(orgId: string, request: CreateApiKeyRequest) {
    await ensurePolicy(orgId, nonScopePolicies.manage_api_keys)

    const existingApiKey = await this.repo.checkIfExistByName(orgId, request.name)
    if (existingApiKey) {
      throw new AppError('API key already exists', {
        key: 'common:messages.error.api_key_already_exists',
      })
    }

    const userId = requestContext.getStore()?.userId!

    // Get organization details
    const org = await organizationRepo.findById(orgId)
    if (!org) {
      throw new NotFoundError('Organization not found')
    }

    // Get creator profile
    const creatorProfile = await profileRepo.findById(userId)
    if (!creatorProfile) {
      throw new NotFoundError('User profile not found')
    }

    // Generate API key with salt
    const { key, hash, prefix, suffix, salt } = generateApiKey()

    let botUserId: string | null = null

    // If bot type, create bot profile
    if (request.key_type === ApiKeyType.BOT) {
      const botEmail = await generateBotEmail(org.org_slug ?? org.id)
      const botDisplayName = `${request.name} (Bot)`

      // Create bot profile using Supabase client
      const supabase = await createClient()
      const { data: botProfile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: uuidv4(),
          email: botEmail,
          display_name: botDisplayName,
        })
        .select()
        .single()

      if (profileError || !botProfile) {
        throw new AppError('Failed to create bot profile')
      }

      // Get member role (default role for bots)
      const { data: roles } = await supabase
        .from('roles')
        .select('id')
        .eq('name', 'Editor')
        .eq('is_default', true)
        .single()

      if (!roles) {
        throw new AppError('Member role not found')
      }

      // Add bot to organization as member with is_bot flag
      const { error: memberError } = await supabase.from('org_members').insert({
        user_id: botProfile.id,
        org_id: orgId,
        role_id: roles.id,
        is_bot: true,
      })

      if (memberError) {
        throw new AppError('Failed to add bot to organization')
      }

      botUserId = botProfile.id
    }

    // Create API key record
    const apiKey = await this.repo.create({
      name: request.name,
      key_type: request.key_type,
      key_hash: hash,
      key_prefix: prefix,
      key_suffix: suffix,
      salt: salt,
      organization_id: orgId,
      created_by: userId,
      bot_user_id: botUserId,
      permissions: request.permissions,
      expires_at: request.expires_at,
      is_active: true,
    })

    orgAuditLogService.generateChangesAndLogEvent(
      {
        module: 'api_key',
        action: 'create',
        target_id: apiKey.id,
        target_name: apiKey.name,
        target_table: 'api_keys',
        organization_id: orgId,
        user_id: userId,
      },
      {},
      apiKey
    )

    // Return API key with secret (only time it's shown)
    return {
      ...apiKey,
      secret_key: key,
    }
  }

  /**
   * Updates an existing API key
   *
   * Logs the changes to audit log for compliance tracking.
   *
   * @param orgId - The organization ID
   * @param id - The API key ID to update
   * @param updates - Object containing fields to update
   * @returns Updated API key
   * @throws {NotFoundError} If API key not found
   * @throws {PermissionError} If user lacks 'manage_organization' permission
   */
  async updateOne(orgId: string, id: string, updates: any) {
    await ensurePolicy(orgId, nonScopePolicies.manage_api_keys)

    const userId = requestContext.getStore()?.userId!

    const existingKey = await this.repo.findOneById(id, orgId)
    if (!existingKey) {
      throw new NotFoundError('API key not found')
    }

    const updateResult = await this.repo.updateById(id, orgId, updates)
    orgAuditLogService.generateChangesAndLogEvent(
      {
        module: 'api_key',
        action: 'update',
        target_id: id,
        target_name: existingKey.name,
        target_table: 'api_keys',
        organization_id: orgId,
        user_id: userId,
      },
      existingKey,
      updateResult
    )

    return await this.repo.updateById(id, orgId, updates)
  }

  /**
   * Regenerates an API key with new credentials
   *
   * Creates a new key, hash, prefix, suffix, and salt while maintaining
   * the same API key record. Resets last_used_at timestamp.
   *
   * The new plain API key is only returned once.
   *
   * @param orgId - The organization ID
   * @param id - The API key ID to regenerate
   * @returns Updated API key with new secret_key (shown only once)
   * @throws {NotFoundError} If API key not found
   * @throws {PermissionError} If user lacks 'manage_organization' permission
   */
  async regenerateKey(orgId: string, id: string) {
    // Generate new API key with salt
    const { key, hash, prefix, suffix, salt } = generateApiKey()

    // Update the API key with new credentials
    const updatedKey = await this.updateOne(orgId, id, {
      key_hash: hash,
      key_prefix: prefix,
      key_suffix: suffix,
      salt: salt,
      updated_at: new Date().toISOString(),
      last_used_at: null,
    })

    // Return API key with secret (only time it's shown)
    return {
      ...updatedKey,
      secret_key: key,
    }
  }

  /**
   * Deletes an API key and associated bot user if applicable
   *
   * For bot-type keys:
   * - Removes the bot from organization members
   * - Cleans up bot user profile association
   *
   * @param orgId - The organization ID
   * @param id - The API key ID to delete
   * @returns Success status object
   * @throws {PermissionError} If user lacks 'manage_organization' permission
   */
  async deleteOne(orgId: string, id: string) {
    await ensurePolicy(orgId, nonScopePolicies.manage_api_keys)

    const userId = requestContext.getStore()?.userId!

    // Get API key to check if it has a bot user
    const apiKey = await this.repo.findOneById(id, orgId)

    // Delete the API key
    await this.repo.deleteById(id, orgId)

    orgAuditLogService.generateChangesAndLogEvent(
      {
        module: 'api_key',
        action: 'delete',
        target_id: id,
        target_name: apiKey.name,
        target_table: 'api_keys',
        organization_id: orgId,
        user_id: userId,
      },
      apiKey,
      {}
    )

    // If it was a bot key, also remove the bot from org_members
    if (apiKey.bot_user_id) {
      const supabase = await createClient()
      const { data: botMember } = await supabase
        .from('org_members')
        .select('id')
        .eq('user_id', apiKey.bot_user_id)
        .eq('org_id', orgId)
        .single()

      if (botMember) {
        await memberRepo.deleteById(botMember.id, orgId)
      }
    }

    return { success: true }
  }

  /**
   * Verifies an API key and returns associated data
   *
   * Process:
   * 1. Extracts prefix and suffix from provided key
   * 2. Looks up key record by prefix/suffix
   * 3. Verifies hash using stored salt
   * 4. Checks expiration date
   * 5. Updates last_used_at timestamp (async)
   *
   * @param apiKey - The plain API key to verify
   * @returns API key data if valid, null if invalid or expired
   * @example
   * const keyData = await apiKeyService.verifyApiKey('li2_sk_...')
   * if (keyData) {
   *   // Key is valid
   * }
   */
  async verifyApiKey(apiKey: string) {
    // Extract prefix and suffix from the provided API key
    const prefix = apiKey.substring(0, PREFIX_LENGTH)
    const suffix = apiKey.substring(apiKey.length - SUFFIX_LENGTH)

    // Find API key by prefix and suffix
    const keyData = await this.repo.findByPrefixAndSuffix(prefix, suffix)

    if (!keyData) {
      return null
    }

    // Verify the hash using the stored salt
    const expectedHash = crypto
      .createHash('sha256')
      .update(apiKey + keyData.salt)
      .digest('hex')

    if (expectedHash !== keyData.key_hash) {
      return null
    }

    // Check if expired
    if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
      return null
    }

    // Update last used timestamp (fire and forget)
    this.repo.updateLastUsedAt(keyData.id).catch(() => {})

    return keyData
  }
}

/**
 * Singleton instance of ApiKeyService
 *
 * Use this instance for all API key operations throughout the application.
 */
export const apiKeyService = new ApiKeyService(apiKeyRepo)
