import { BaseRepository } from './base.repository'

export class SlugRepository extends BaseRepository<'slugs'> {
  constructor() {
    super('slugs')
  }

  /**
   * Check if a slug already exists in the slugs table
   * @param slug - The slug to check
   * @returns Promise<boolean> - true if slug exists, false otherwise
   */
  async checkSlugExists(slug: string): Promise<boolean> {
    const { data, error } = await this.query().select('id').eq('slug', slug).maybeSingle()

    if (error) {
      throw error
    }

    return !!data
  }

  /**
   * Which touch point does this slug resolve to — INCLUDING A SLUG IT NO LONGER USES (SL-1).
   *
   * `touch_points.slug` holds only the CURRENT ending; `updateTpSlug` inserts into `slugs` and never
   * deletes the old row (checklist S4), which is exactly why a previously printed QR keeps working.
   * `get_short_link` has to be able to resolve the ending a user is reading off that flyer, and the
   * touch-point table cannot answer it.
   *
   * ⛔ NOT ORG-SCOPED HERE, ON PURPOSE. `slugs.slug` is unique across all of Li2, so a slug from
   * another organization resolves to a `tp_id` the caller's org-scoped `getByIdForOrg` then refuses —
   * one 404, indistinguishable from "no such slug". Filtering on `organization_id` here would look
   * tighter and in fact be looser: that column is written by whoever inserted the row, and nothing
   * guarantees it for a `short_code` minted on the li2-be side.
   */
  async findTpIdBySlug(slug: string): Promise<string | null> {
    const { data, error } = await this.query()
      .select('tp_id')
      .eq('slug', slug)
      .maybeSingle()
      .overrideTypes<{ tp_id: string | null }>()

    if (error) throw error

    return data?.tp_id ?? null
  }
}
export const slugRepo = globalThis._slugRepo ?? new SlugRepository()

if (process.env.NODE_ENV !== 'production') globalThis._slugRepo = slugRepo
