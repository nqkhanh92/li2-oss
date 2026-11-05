import { Tables } from '@/shared/types/database.types'

export type Invitation = Tables<'org_invitations'>

export enum InvitationStatus {
  INVITED = 'INVITED',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
}
