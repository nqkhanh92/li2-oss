import { Tables } from './database.types'

export enum RolePermissionScope {
  OWN = 'own',
  ALL = 'all',
}

export const ROLE_PERMISSION_KEYS = {
  //dashboard section
  VIEW_DASHBOARD: 'view_dashboard',

  //analytic section
  VIEW_ANALYTICS: 'view_analytics',

  //touch points section
  VIEW_TOUCH_POINTS: 'view_touch_points',
  ADD_TOUCH_POINT: 'add_touch_point',
  EDIT_TOUCH_POINT: 'edit_touch_point',
  DELETE_TOUCH_POINT: 'delete_touch_point',

  //tags section
  VIEW_TAGS: 'view_tags',
  ADD_TAG: 'add_tag',
  EDIT_TAG: 'edit_tag',
  DELETE_TAG: 'delete_tag',

  //integrations section
  VIEW_INTEGRATIONS: 'view_integrations',
  ADD_INTEGRATION: 'add_integration',
  EDIT_INTEGRATION: 'edit_integration',
  DELETE_INTEGRATION: 'delete_integration',

  //assets section
  VIEW_ASSETS: 'view_assets',
  ADD_ASSET: 'add_asset',
  EDIT_ASSET: 'edit_asset',
  DELETE_ASSET: 'delete_asset',

  //campaigns section
  VIEW_CAMPAIGNS: 'view_campaign',
  ADD_CAMPAIGN: 'add_campaign',
  EDIT_CAMPAIGN: 'edit_campaign',
  DELETE_CAMPAIGN: 'delete_campaign',

  //organization section
  MANAGE_ORGANIZATION: 'manage_organization',
  DELETE_ORAGNIZATION: 'delete_organization',
  MANAGE_MEMBERS: 'manage_members',

  VIEW_ORGANIZATION: 'view_organization',
  VIEW_MEMBERS: 'view_members',

  VIEW_UTM_TEMPLATES: 'view_utm_templates',
  ADD_UTM_TEMPLATE: 'add_utm_template',
  EDIT_UTM_TEMPLATE: 'edit_utm_template',
  DELETE_UTM_TEMPLATE: 'delete_utm_template',

  //collections section
  VIEW_COLLECTIONS: 'view_collections',
  ADD_COLLECTION: 'add_collection',
  EDIT_COLLECTION: 'edit_collection',
  DELETE_COLLECTION: 'delete_collection',
  MANAGE_COLLECTION_MEMBERS: 'manage_collection_members',

  MANAGE_DOMAINS: 'manage_domains',

  //funnels section
  VIEW_FUNNELS: 'view_funnels',
  ADD_FUNNEL: 'add_funnel',
  EDIT_FUNNEL: 'edit_funnel',
  DELETE_FUNNEL: 'delete_funnel',

  //api_keys
  MANAGE_API_KEYS: 'manage_api_keys',

  //audit logs section
  VIEW_AUDIT_LOGS: 'view_audit_logs',
  EXPORT_AUDIT_LOGS: 'export_audit_logs',

  //event rules section
  VIEW_EVENT_RULES: 'view_event_rules',
  ADD_EVENT_RULE: 'add_event_rule',
  EDIT_EVENT_RULE: 'edit_event_rule',
  DELETE_EVENT_RULE: 'delete_event_rule',
} as const

export type RolePermissionKey = (typeof ROLE_PERMISSION_KEYS)[keyof typeof ROLE_PERMISSION_KEYS]

export const noScopePermissionKeys: RolePermissionKey[] = [
  ROLE_PERMISSION_KEYS.VIEW_DASHBOARD,
  ROLE_PERMISSION_KEYS.VIEW_ANALYTICS,
  ROLE_PERMISSION_KEYS.MANAGE_ORGANIZATION,
  ROLE_PERMISSION_KEYS.MANAGE_MEMBERS,
  ROLE_PERMISSION_KEYS.VIEW_ORGANIZATION,
  ROLE_PERMISSION_KEYS.VIEW_MEMBERS,
  ROLE_PERMISSION_KEYS.VIEW_UTM_TEMPLATES,
  ROLE_PERMISSION_KEYS.VIEW_COLLECTIONS,
  ROLE_PERMISSION_KEYS.VIEW_CAMPAIGNS,

  //Add
  ROLE_PERMISSION_KEYS.ADD_ASSET,
  ROLE_PERMISSION_KEYS.ADD_CAMPAIGN,
  ROLE_PERMISSION_KEYS.ADD_TAG,
  ROLE_PERMISSION_KEYS.ADD_TOUCH_POINT,
  ROLE_PERMISSION_KEYS.ADD_INTEGRATION,
  ROLE_PERMISSION_KEYS.ADD_UTM_TEMPLATE,
  ROLE_PERMISSION_KEYS.ADD_COLLECTION,
  ROLE_PERMISSION_KEYS.MANAGE_COLLECTION_MEMBERS,

  //Funnels
  ROLE_PERMISSION_KEYS.VIEW_FUNNELS,
  ROLE_PERMISSION_KEYS.ADD_FUNNEL,
  ROLE_PERMISSION_KEYS.EDIT_FUNNEL,
  ROLE_PERMISSION_KEYS.DELETE_FUNNEL,

  //Audit Logs
  ROLE_PERMISSION_KEYS.VIEW_AUDIT_LOGS,
  ROLE_PERMISSION_KEYS.EXPORT_AUDIT_LOGS,

  //API KEYS
  ROLE_PERMISSION_KEYS.MANAGE_API_KEYS,

  //Domains
  ROLE_PERMISSION_KEYS.MANAGE_DOMAINS,

  //
  ROLE_PERMISSION_KEYS.DELETE_ORAGNIZATION,

  //Event Rules
  ROLE_PERMISSION_KEYS.VIEW_EVENT_RULES,
  ROLE_PERMISSION_KEYS.ADD_EVENT_RULE,
  ROLE_PERMISSION_KEYS.EDIT_EVENT_RULE,
  ROLE_PERMISSION_KEYS.DELETE_EVENT_RULE,
]

export type RolePermission = {
  permission_key: RolePermissionKey
  scope: RolePermissionScope
}

export type Role = Tables<'roles'> & {
  permissions: RolePermission[]
}
