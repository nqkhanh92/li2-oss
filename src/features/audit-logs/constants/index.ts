import { TFunction } from 'i18next'

// Helper function to get translated module label
export const getModuleLabel = (t: TFunction, module: string): string => {
  const key = `audit:filters.module_options.${module}`
  const translated = t(key)
  // Fallback to formatted module name if translation key doesn't exist
  return translated === key
    ? module.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
    : translated
}

// Helper function to get translated action label
export const getActionLabel = (t: TFunction, action: string): string => {
  const key = `audit:filters.action_options.${action}`
  const translated = t(key)
  // Fallback to formatted action name if translation key doesn't exist
  return translated === key
    ? action.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
    : translated
}

// Module types for filtering
export const getModuleOptions = (t: TFunction): { label: string; value: string }[] => [
  { label: t('audit:filters.module_options.touch_point'), value: 'touch_point' },
  { label: t('audit:filters.module_options.tag'), value: 'tag' },
  { label: t('audit:filters.module_options.collection'), value: 'collection' },
  { label: t('audit:filters.module_options.collection_member'), value: 'collection_member' },
  { label: t('audit:filters.module_options.organization'), value: 'organization' },
  { label: t('audit:filters.module_options.member'), value: 'member' },
  { label: t('audit:filters.module_options.integration'), value: 'integration' },
  { label: t('audit:filters.module_options.campaign'), value: 'campaign' },
  { label: t('audit:filters.module_options.permission'), value: 'permission' },
  { label: t('audit:filters.module_options.role'), value: 'role' },
  { label: t('audit:filters.module_options.utm_template'), value: 'utm_template' },
  { label: t('audit:filters.module_options.api_key'), value: 'api_key' },
]

// Action types for filtering
export const getActionOptions = (t: TFunction): { label: string; value: string }[] => [
  { label: t('audit:filters.action_options.create'), value: 'create' },
  { label: t('audit:filters.action_options.update'), value: 'update' },
  { label: t('audit:filters.action_options.delete'), value: 'delete' },
  { label: t('audit:filters.action_options.add'), value: 'add' },
  { label: t('audit:filters.action_options.remove'), value: 'remove' },
  { label: t('audit:filters.action_options.add_touchpoints'), value: 'add_touchpoints' },
  { label: t('audit:filters.action_options.remove_touchpoints'), value: 'remove_touchpoints' },
  { label: t('audit:filters.action_options.update_role'), value: 'update_role' },
  { label: t('audit:filters.action_options.bulk_add'), value: 'bulk_add' },
]

// Keep legacy exports for backward compatibility (deprecated)
export const MODULE_OPTIONS = [
  { label: 'Touch Point', value: 'touch_point' },
  { label: 'Tag', value: 'tag' },
  { label: 'Space', value: 'collection' },
  { label: 'Space Member', value: 'collection_member' },
  { label: 'Organization', value: 'organization' },
  { label: 'Member', value: 'member' },
  { label: 'Integration', value: 'integration' },
  { label: 'Campaign', value: 'campaign' },
  { label: 'Permission', value: 'permission' },
  { label: 'Role', value: 'role' },
] as const

export const ACTION_OPTIONS = [
  { label: 'Create', value: 'create' },
  { label: 'Update', value: 'update' },
  { label: 'Delete', value: 'delete' },
  { label: 'Add', value: 'add' },
  { label: 'Remove', value: 'remove' },
  { label: 'Add Touchpoints', value: 'add_touchpoints' },
  { label: 'Remove Touchpoints', value: 'remove_touchpoints' },
  { label: 'Update Role', value: 'update_role' },
  { label: 'Bulk Add', value: 'bulk_add' },
] as const

// Color mapping for action badges
export const ACTION_COLORS: Record<string, string> = {
  create:
    'bg-green-100 text-green-600 border border-green-600 dark:bg-green-900 dark:text-green-300',
  update: 'bg-blue-100 text-blue-600 border border-blue-600 dark:bg-blue-900 dark:text-blue-300',
  delete: 'bg-red-100 text-red-600 border border-red-600 dark:bg-red-900 dark:text-red-300',
  add: 'bg-purple-100 text-purple-600 border border-purple-600 dark:bg-purple-900 dark:text-purple-300',
  remove:
    'bg-orange-100 text-orange-600 border border-orange-600 dark:bg-orange-900 dark:text-orange-300',
  add_touchpoints:
    'bg-cyan-100 text-cyan-600 border border-cyan-600 dark:bg-cyan-900 dark:text-cyan-300',
  remove_touchpoints:
    'bg-amber-100 text-amber-600 border border-amber-600 dark:bg-amber-900 dark:text-amber-300',
  update_role:
    'bg-indigo-100 text-indigo-600 border border-indigo-600 dark:bg-indigo-900 dark:text-indigo-300',
  bulk_add:
    'bg-violet-100 text-violet-600 border border-violet-600 dark:bg-violet-900 dark:text-violet-300',
}

// Module color mapping
export const MODULE_COLORS: Record<string, string> = {
  touch_point: 'bg-slate-100 text-foreground dark:bg-slate-900 dark:text-slate-300',
  tag: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
  collection: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
  collection_member: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300',
  organization: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
  member: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900 dark:text-fuchsia-300',
  integration: 'bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-300',
  campaign: 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-300',
  permission: 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-300',
  role: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  utm_template: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
}
