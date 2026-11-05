import { BaseRepository } from './base.repository'
import { PostgrestFilterBuilder } from '@supabase/postgrest-js'
import { TouchPointImportTasks } from '../types/touchpoint_import_tasks.type'

export class TouchpointImportTasksRepository extends BaseRepository<'touchpoint_import_tasks'> {
  constructor() {
    super('touchpoint_import_tasks')
  }

  async getTouchpointImportTasksDetail(
    id: string,
    orgId: string,
    modifier?: (q: PostgrestFilterBuilder<any, any, any>) => PostgrestFilterBuilder<any, any, any>
  ) {
    let query = this.query()
      .select(
        `
          *,
          profiles ( id, name, email ),
        `
      )
      .eq('id', id)
      .eq('organization_id', orgId)

    if (modifier) query = modifier(query)
    const { data, error } = await query.returns<TouchPointImportTasks>().single()
    if (error) throw error
    return data
  }

  async findAllByOrganization(
    orgId: string,
    modifier?: (q: PostgrestFilterBuilder<any, any, any>) => PostgrestFilterBuilder<any, any, any>
  ) {
    let query = this.query()
      .select(
        `
          *,
          profiles ( id, name, email ),
        `
      )
      .eq('organization_id', orgId)

    if (modifier) query = modifier(query)
    const { data, error } = await query.returns<TouchPointImportTasks>().single()
    if (error) throw error
    return data
  }
}
export const touchpointImportTasksRepo =
  globalThis._touchpointImportTasksRepo ?? new TouchpointImportTasksRepository()

if (process.env.NODE_ENV !== 'production')
  globalThis._touchpointImportTasksRepo = touchpointImportTasksRepo
