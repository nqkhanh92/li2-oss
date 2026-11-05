import { TouchPointDetail, TouchPointExportType } from '@/core/types/touch-point.type'
import dayjs from 'dayjs'
import { TFunction } from 'i18next'

export const mappingColumnDescription: Record<keyof TouchPointExportType, string> = {
  name: 'The display name or title of the short link. Common headers: "Name", "Title", "Link Name", "Label". If no name exists, can fallback to slug or short code.',
  desc: 'A text description or notes about the link. Common headers: "Description", "Desc", "Notes", "Comment", "Details".',
  slug: 'The URL-friendly identifier used in the short link path (e.g., "my-link" in li2.vn/my-link). Common headers: "Slug", "Path", "URL Slug", "Custom Slug".',
  short_code:
    'The unique short code/identifier for the link (e.g., "abc123"). Common headers: "Short Code", "Code", "ID", "Link ID", "Short ID".',
  content_value:
    'The destination URL where the short link redirects to (the full original URL). Common headers: "Destination", "Destination URL", "Target URL", "Original URL", "Long URL", "Redirect URL", "Full URL".',
  qr_enabled:
    'Boolean flag indicating if QR code is enabled for this link. Common headers: "QR Enabled", "QR Code", "Enable QR", "QR".',
  tags: 'Comma-separated tags or labels for categorizing the link. Common headers: "Tags", "Labels", "Categories", "Keywords".',
  short_url:
    'The complete shortened URL (e.g., "li2.vn/abc123"). Common headers: "Short URL", "Short Link", "Shortened URL", "Link", "URL".',
  created_at:
    'The timestamp when the link was created. Common headers: "Created At", "Created", "Date Created", "Creation Date", "Timestamp".',
  created_by:
    "The email of the user who created the touch point. Common headers: 'Created By', 'Creator', 'User'.",
  collection_name:
    "The name of the collection this touch point belongs to. Common headers: 'Collection', 'Folder', 'Group'.",
  utm_source:
    'The UTM source parameter identifying where traffic originates (e.g., "google", "facebook", "newsletter"). Common headers: "UTM Source", "Source", "utm_source", "Traffic Source", "Campaign Source".',
  utm_medium:
    'The UTM medium parameter identifying the marketing medium (e.g., "cpc", "email", "social", "banner"). Common headers: "UTM Medium", "Medium", "utm_medium", "Marketing Medium", "Campaign Medium".',
  utm_campaign:
    'The UTM campaign parameter identifying the specific campaign name (e.g., "spring_sale", "product_launch"). Common headers: "UTM Campaign", "Campaign", "utm_campaign", "Campaign Name".',
  utm_term:
    'The UTM term parameter for paid search keywords. Common headers: "UTM Term", "Term", "utm_term", "Keyword", "Search Term".',
  utm_content:
    'The UTM content parameter for A/B testing and content-targeted ads. Common headers: "UTM Content", "Content", "utm_content", "Ad Content", "Creative".',
}

export type ExportColumn = {
  id: keyof TouchPointExportType
  i18nKey: string
  label: string
  checked: boolean
  transform?: (record: TouchPointDetail) => string | null
  importRequired?: boolean
  importDisabled?: boolean
  exportDisabled?: boolean
}

export function getColumns(t?: TFunction): ExportColumn[] {
  return [
    {
      id: 'content_value',
      i18nKey: 'export.columns.destination',
      label: t?.('export.columns.destination') || 'Destination',
      checked: true,
      transform: (record) => {
        if (!!record?.privacy_security?.e2e_encryption) {
          return t?.('export.encrypted') || 'Encrypted'
        }
        return record.content_value
      },
      importRequired: true,
    },
    {
      id: 'slug',
      i18nKey: 'export.columns.slug',
      label: t?.('export.columns.slug') || 'Slug',
      checked: false,
      transform: (record) => record.slug || '',
    },
    {
      id: 'name',
      i18nKey: 'export.columns.name',
      label: t?.('export.columns.name') || 'Name',
      checked: true,
      transform: (record) => record.name,
    },
    {
      id: 'short_url',
      i18nKey: 'export.columns.short_url',
      label: t?.('export.columns.short_url') || 'Short URL',
      checked: true,
      transform: (record) => record.short_url,
    },
    {
      id: 'qr_enabled',
      i18nKey: 'export.columns.qr_enabled',
      label: t?.('export.columns.qr_enabled') || 'QR Enabled',
      checked: false,
      transform: (record) => (record.variants_content?.QR?.enabled ? 'True' : 'False'),
      importDisabled: true,
      exportDisabled: true,
    },
    {
      id: 'tags',
      i18nKey: 'export.columns.tags',
      label: t?.('export.columns.tags') || 'Tags',
      checked: true,
      transform: (record) => (record.tp_tag_links ?? []).map((tag) => tag.tags.name).join(', '),
    },
    // {
    //   id: 'collection_name',
    //   i18nKey: 'export.columns.collection_name',
    //   label: t?.('export.columns.collection_name') || 'Collection Name',
    //   checked: false,
    //   transform: (record) => record.collections?.name || '',
    //   // importDisabled: true,
    // },
    {
      id: 'created_by',
      i18nKey: 'export.columns.created_by',
      label: t?.('export.columns.created_by') || 'Created By',
      checked: false,
      transform: (record) => record.profiles?.email || '',
      importDisabled: true,
    },
    {
      id: 'created_at',
      i18nKey: 'export.columns.created_at',
      label: t?.('export.columns.created_at') || 'Created At',
      checked: true,
      transform: (record) => dayjs(record.created_at).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      id: 'utm_source',
      i18nKey: 'export.columns.utm_source',
      label: t?.('export.columns.utm_source') || 'UTM Source',
      checked: false,
      transform: (record) => (record.utm_tags as { utm_source?: string } | null)?.utm_source || '',
    },
    {
      id: 'utm_medium',
      i18nKey: 'export.columns.utm_medium',
      label: t?.('export.columns.utm_medium') || 'UTM Medium',
      checked: false,
      transform: (record) => (record.utm_tags as { utm_medium?: string } | null)?.utm_medium || '',
    },
    {
      id: 'utm_campaign',
      i18nKey: 'export.columns.utm_campaign',
      label: t?.('export.columns.utm_campaign') || 'UTM Campaign',
      checked: false,
      transform: (record) =>
        (record.utm_tags as { utm_campaign?: string } | null)?.utm_campaign || '',
    },
    {
      id: 'utm_term',
      i18nKey: 'export.columns.utm_term',
      label: t?.('export.columns.utm_term') || 'UTM Term',
      checked: false,
      transform: (record) => (record.utm_tags as { utm_term?: string } | null)?.utm_term || '',
    },
    {
      id: 'utm_content',
      i18nKey: 'export.columns.utm_content',
      label: t?.('export.columns.utm_content') || 'UTM Content',
      checked: false,
      transform: (record) =>
        (record.utm_tags as { utm_content?: string } | null)?.utm_content || '',
    },
  ]
}
