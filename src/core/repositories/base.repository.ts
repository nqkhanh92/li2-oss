import { supabaseService } from '@/infrastructure/database/supabase'
import {
  Database,
  TablesInsert,
  TablesUpdate,
  Tables as TablesType,
} from '@/shared/types/database.types'
import { PostgrestFilterBuilder, PostgrestQueryBuilder } from '@supabase/postgrest-js'

type Tables = Database['public']['Tables']
type TableName = keyof Tables
type RowType<T extends TableName> = Tables[T]['Row']
type UpdateType<T extends TableName> = TablesUpdate<T>

export class BaseRepository<T extends TableName> {
  protected table: T
  protected query = () => supabaseService.from(this.table)
  protected getSupaInstance = () => supabaseService

  constructor(table: T) {
    this.table = table
  }

  async checkIfExist(id: any): Promise<boolean> {
    const { data, error } = await this.query().select('*').eq('id', id).single()
    if (error) throw error
    return !!data
  }

  async findAll(select: string = '*'): Promise<RowType<T>[]> {
    const { data, error } = await this.query().select(select).returns<RowType<T>[]>()
    if (error) throw error
    return data
  }

  async findById(id: any): Promise<RowType<T> | null> {
    const { data, error } = await this.query().select('*').eq('id', id).single()
    if (error) throw error

    if (data) {
      return data as unknown as RowType<T>
    }
    return null
  }

  async create(_data: TablesInsert<T>): Promise<RowType<T>> {
    const { data, error } = await this.query()
      .insert(_data as any)
      .select('*')
      .returns<RowType<T>>()
      .single()
    if (error) throw error
    return data as RowType<T>
  }

  async bulkCreate(_data: TablesInsert<T>[]): Promise<RowType<T>[]> {
    const { data, error } = await this.query()
      .insert(_data as any)
      .select('*')
      .returns<RowType<T>[]>()
    if (error) throw error
    return data
  }

  async update(id: any, _data: UpdateType<T>): Promise<RowType<T>> {
    const { data, error } = await this.query()
      .update(_data as any)
      .eq('id', id)
      .select('*')
      .returns<RowType<T>[]>()
      .single()
    if (error) throw error
    return data
  }
  async updateMany(ids: any[], _data: UpdateType<T>): Promise<RowType<T>[]> {
    const { data, error } = await this.query()
      .update(_data as any)
      .in('id', ids)
      .select('*')
      .returns<RowType<T>[]>()
    if (error) throw error
    return data
  }

  async delete(
    id: any,
    modifier?: (q: PostgrestFilterBuilder<any, any, any>) => PostgrestFilterBuilder<any, any, any>
  ): Promise<void> {
    let query = this.query().delete().eq('id', id)
    if (modifier) query = modifier(query)
    const { error } = await query
    if (error) throw error
  }
  async bulkDelete(
    ids: any[],
    modifier?: (q: PostgrestFilterBuilder<any, any, any>) => PostgrestFilterBuilder<any, any, any>
  ): Promise<number | null> {
    let query = this.query().delete({ count: 'exact' }).in('id', ids)
    if (modifier) query = modifier(query)
    const { error, count } = await query
    if (error) throw error
    return count
  }

  async deleteAndGet(
    id: any,
    modifier?: (q: PostgrestFilterBuilder<any, any, any>) => PostgrestFilterBuilder<any, any, any>
  ): Promise<RowType<T>> {
    let query = this.query().delete().eq('id', id)
    if (modifier) query = modifier(query)
    const { data, error } = await query.select('*').single().returns<RowType<T>>()
    if (error) throw error
    return data
  }
}
