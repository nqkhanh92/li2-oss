'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { axiosApiInstance } from '@/shared/lib/axios'
import type { APIResponse, PaginationResponse } from '@/shared/types'
import type {
  ArtifactAccessMode,
  ArtifactDTO,
  ArtifactQuotaDTO,
  ReplaceArtifactResult,
} from '@/core/types/artifact.type'

export const artifactKeys = {
  all: (org_id: string) => ['organizations', org_id, 'artifacts'] as const,
  /**
   * NOT under `all`: `invalidateQueries(all)` runs on every create/publish/delete and would refetch
   * this too — which is actually what we want, so why separate? Because `useDeleteArtifact` calls
   * `removeQueries` on prefixes of `all`, and a quota query that disappears from the cache the moment
   * an artifact is deleted is a dialog that loses its "còn trống" number mid-flow. Callers that change
   * usage invalidate this key explicitly.
   */
  quota: (org_id: string) => ['artifact-quota', org_id] as const,
  /** Cùng lý do nằm ngoài `all` như `quota`: không đổi theo artifact, không nên bị gỡ cùng chúng. */
  accessModes: (org_id: string) => ['artifact-access-modes', org_id] as const,
  list: (org_id: string, params: ArtifactListParams) =>
    ['organizations', org_id, 'artifacts', params] as const,
  detail: (org_id: string, artifact_id: string) =>
    ['organizations', org_id, 'artifacts', artifact_id] as const,
}

export type ArtifactListParams = {
  page: number
  limit: number
  /** Khớp tên artifact hoặc đường dẫn. */
  search?: string
  from_date?: string
  to_date?: string
  /** Nhiều trạng thái ngăn bằng dấu phẩy. */
  status?: string
}

export const useGetArtifacts = (org_id: string, params: ArtifactListParams) => {
  return useQuery<PaginationResponse<ArtifactDTO>>({
    queryKey: artifactKeys.list(org_id, params),
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<PaginationResponse<ArtifactDTO>>(
        `/organizations/${org_id}/artifacts`,
        { params }
      )
      return data
    },
    // Giữ trang cũ trong lúc gõ ô tìm kiếm: nếu không, mỗi lần đổi từ khoá bảng lại nháy về
    // skeleton rồi quay lại, và cảm giác là trang đang giật chứ không phải đang lọc.
    placeholderData: (previous) => previous,
  })
}

export const useShowArtifact = (org_id: string, artifact_id: string) => {
  return useQuery<ArtifactDTO>({
    queryKey: artifactKeys.detail(org_id, artifact_id),
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<APIResponse<ArtifactDTO>>(
        `/organizations/${org_id}/artifacts/${artifact_id}`
      )
      return data.data
    },
  })
}

/**
 * `{free}` in the replace dialog (S2/S6) and the two-axis quota bar on the list. Nothing else in the
 * artifact API returns usage, and the dialog must not compute it from the list: the list is one page
 * of rows, the quota is the whole org.
 */
export const useArtifactQuota = (org_id: string) => {
  return useQuery<ArtifactQuotaDTO>({
    queryKey: artifactKeys.quota(org_id),
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<APIResponse<ArtifactQuotaDTO>>(
        `/organizations/${org_id}/artifacts/quota`
      )
      return data.data
    },
  })
}

export type CreateArtifactPayload = {
  file: File
  name?: string
  onUploadProgress?: (percent: number) => void
}

export const useCreateArtifact = (org_id: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ file, name, onUploadProgress }: CreateArtifactPayload) => {
      const body = new FormData()
      body.append('file', file)
      if (name) body.append('name', name)

      const { data } = await axiosApiInstance.post<APIResponse<ArtifactDTO>>(
        `/organizations/${org_id}/artifacts`,
        body,
        {
          // axiosApiInstance defaults every request to `application/json`. Without overriding it
          // here the FormData goes up as JSON with no boundary, and `request.formData()` on the
          // server throws "Content-Type was not one of multipart/form-data". Same line every other
          // upload in this repo carries (touch-points, profile).
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (event) => {
            if (!onUploadProgress || !event.total) return
            onUploadProgress(Math.round((event.loaded / event.total) * 100))
          },
        }
      )
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: artifactKeys.all(org_id) })
      queryClient.invalidateQueries({ queryKey: artifactKeys.quota(org_id) })
    },
  })
}

/**
 * Chế độ xem org được chọn (spec §9: Google chỉ có khi server có OAuth client). `staleTime` dài vì
 * câu trả lời đổi theo deploy, không theo thao tác; `placeholderData` là ba chế độ pha 1 để hộp thoại
 * không trống trong lúc chờ — và nếu request hỏng thì người dùng vẫn có đủ ba chế độ luôn tồn tại.
 */
export const ARTIFACT_PHASE1_ACCESS_MODES: readonly ArtifactAccessMode[] = [
  'public',
  'private',
  'password',
]

export const useArtifactAccessModes = (org_id: string) => {
  return useQuery<{ modes: ArtifactAccessMode[] }>({
    queryKey: artifactKeys.accessModes(org_id),
    queryFn: async () => {
      const { data } = await axiosApiInstance.get<APIResponse<{ modes: ArtifactAccessMode[] }>>(
        `/organizations/${org_id}/artifacts/access-modes`
      )
      return data.data
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: { modes: [...ARTIFACT_PHASE1_ACCESS_MODES] },
  })
}

export type PublishArtifactPayload = {
  artifact_id: string
  slug?: string
  /** B1 — chọn chế độ xem ngay lúc xuất bản (spec R2b). Bỏ trống = để server giữ mặc định public. */
  access_mode?: ArtifactAccessMode
  password?: string
}

export const usePublishArtifact = (org_id: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ artifact_id, slug, access_mode, password }: PublishArtifactPayload) => {
      const { data } = await axiosApiInstance.post<APIResponse<ArtifactDTO>>(
        `/organizations/${org_id}/artifacts/${artifact_id}/publish`,
        {
          ...(slug ? { slug } : {}),
          ...(access_mode ? { access_mode } : {}),
          ...(access_mode === 'password' && password ? { password } : {}),
        }
      )
      return data.data
    },
    onSuccess: (artifact) => {
      queryClient.setQueryData(artifactKeys.detail(org_id, artifact.id), artifact)
      queryClient.invalidateQueries({ queryKey: artifactKeys.all(org_id) })
      queryClient.invalidateQueries({ queryKey: artifactKeys.quota(org_id) })
    },
  })
}

export type ReplaceArtifactPayload = {
  artifact_id: string
  file: File
  onUploadProgress?: (percent: number) => void
}

/**
 * Thay nội dung, giữ QR và short link (`POST …/replace`). Multipart như `useCreateArtifact`, cùng
 * dòng `Content-Type` ghi đè và cùng `onUploadProgress` — S3 của hộp thoại cần phần trăm THẬT.
 *
 * `onSuccess` như `usePublishArtifact`: ghi thẳng DTO mới vào cache chi tiết rồi invalidate danh
 * sách; thêm quota vì dung lượng đã dùng vừa đổi. KHÔNG cache-bust ảnh QR: `path_qr_code` không đổi
 * — đó là toàn bộ lý do tính năng tồn tại.
 */
export const useReplaceArtifact = (org_id: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ artifact_id, file, onUploadProgress }: ReplaceArtifactPayload) => {
      const body = new FormData()
      body.append('file', file)

      const { data } = await axiosApiInstance.post<APIResponse<ReplaceArtifactResult>>(
        `/organizations/${org_id}/artifacts/${artifact_id}/replace`,
        body,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (event) => {
            if (!onUploadProgress || !event.total) return
            onUploadProgress(Math.round((event.loaded / event.total) * 100))
          },
        }
      )
      return data.data
    },
    onSuccess: (artifact) => {
      // `previous_size_bytes` is a fact about the request, not about the artifact — it stays out of
      // the detail cache so a later refetch does not look like it "lost" a field.
      const { previous_size_bytes: _previous, ...dto } = artifact
      void _previous
      queryClient.setQueryData(artifactKeys.detail(org_id, artifact.id), dto)
      queryClient.invalidateQueries({ queryKey: artifactKeys.all(org_id) })
      queryClient.invalidateQueries({ queryKey: artifactKeys.quota(org_id) })
    },
  })
}

export type UpdateArtifactAccessPayload = {
  artifact_id: string
  access_mode: ArtifactAccessMode
  password?: string
}

/**
 * `PATCH …/{artifact_id}` — đổi quyền xem hoặc đổi mật khẩu (spec R12). `onSuccess` như
 * `usePublishArtifact`: ghi DTO mới vào cache chi tiết rồi invalidate danh sách. KHÔNG invalidate
 * quota: không byte nào đổi. Mật khẩu không được giữ lại ở đâu sau khi request đi.
 */
export const useUpdateArtifactAccess = (org_id: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ artifact_id, access_mode, password }: UpdateArtifactAccessPayload) => {
      const { data } = await axiosApiInstance.patch<APIResponse<ArtifactDTO>>(
        `/organizations/${org_id}/artifacts/${artifact_id}`,
        access_mode === 'password' ? { access_mode, password } : { access_mode }
      )
      return data.data
    },
    onSuccess: (artifact) => {
      queryClient.setQueryData(artifactKeys.detail(org_id, artifact.id), artifact)
      queryClient.invalidateQueries({ queryKey: artifactKeys.all(org_id) })
    },
  })
}

export type ChangeArtifactSlugPayload = {
  artifact_id: string
  slug: string
}

/**
 * `POST …/{artifact_id}/slug` — đổi đường dẫn của một artifact ĐÃ LIVE (spec wave 4 B2).
 *
 * `onSuccess` như `useUpdateArtifactAccess`: ghi DTO mới vào cache chi tiết rồi invalidate danh
 * sách. KHÔNG invalidate `quota`: không byte nào đổi, và `quota` nằm ngoài `all` chính vì nó không
 * nên bị gỡ theo mỗi thao tác artifact.
 *
 * DTO trả về mang `updated_at` mới, và đó là thứ FE cache-bust ảnh QR bằng: ảnh mới có thể được ghi
 * vào CÙNG `path_qr_code`, nên URL ảnh một mình không đủ để trình duyệt tải lại.
 */
export const useChangeArtifactSlug = (org_id: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ artifact_id, slug }: ChangeArtifactSlugPayload) => {
      const { data } = await axiosApiInstance.post<APIResponse<ArtifactDTO>>(
        `/organizations/${org_id}/artifacts/${artifact_id}/slug`,
        { slug }
      )
      return data.data
    },
    onSuccess: (artifact) => {
      queryClient.setQueryData(artifactKeys.detail(org_id, artifact.id), artifact)
      queryClient.invalidateQueries({ queryKey: artifactKeys.all(org_id) })
    },
  })
}

/**
 * Xoá cứng, không có thùng rác — người dùng đã quyết vậy. Điều đó khiến hook này khác các
 * mutation còn lại ở một điểm: nó phải **gỡ** query chi tiết chứ không chỉ đánh dấu cũ.
 * `artifactKeys.all` là tiền tố của `artifactKeys.detail`, nên chỉ gọi `invalidateQueries` thôi
 * là ra lệnh cho query của chính hàng vừa xoá đi lấy lại dữ liệu — và nó ăn 404, hiện toast lỗi
 * ngay sau một thao tác vừa thành công.
 */
export const useDeleteArtifact = (org_id: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (artifact_id: string) => {
      await axiosApiInstance.delete(`/organizations/${org_id}/artifacts/${artifact_id}`)
      return artifact_id
    },
    onSuccess: (artifact_id) => {
      queryClient.invalidateQueries({ queryKey: artifactKeys.all(org_id) })
      queryClient.invalidateQueries({ queryKey: artifactKeys.quota(org_id) })
      queryClient.removeQueries({ queryKey: artifactKeys.detail(org_id, artifact_id) })
    },
  })
}
