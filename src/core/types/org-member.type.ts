import { Tables } from '@/shared/types/database.types'

export type OrgMember = Omit<Tables<'org_members'>, 'user_id' | 'role_id'> & {
  user_id: Tables<'profiles'>
  role_id: Tables<'roles'>
}
