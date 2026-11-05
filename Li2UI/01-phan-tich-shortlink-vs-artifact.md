# Phân tích bố cục UI: Short link đối chiếu Artifact

Ngày đọc: 2026-10-06. Nhánh: `feat/artifact`. Mọi `file:line` đọc từ cây hiện tại, đường dẫn tính từ
`src/` trừ khi ghi khác. Không sửa code nào.

Quy ước viết tắt đường dẫn:

- `SL/` = `features/short-links/components/`
- `AF/` = `features/artifacts/components/`
- `PAGE/` = `app/(protected)/org/[org_id]/`

---

## 1. Bản đồ màn hình Short link

### 1.1 Khung page dùng chung

Mọi page bên trong org đi qua `shared/components/layout/content-layout.tsx`:

| Phần | Lớp/giá trị | Nguồn |
|---|---|---|
| Thanh tiêu đề page | cao 60px, `px-4 md:px-12 border-b`, nội dung `max-w-7xl mx-auto` khi `compact` | `content-layout-nav.tsx:29-38` |
| Nút back | `ArrowLeft w-5 h-5 text-slate-500`, chỉ hiện khi `isBackable` | `content-layout-nav.tsx:40-47` |
| Tiêu đề | `h3 font-medium text-l text-foreground` | `content-layout-nav.tsx:52` |
| Vùng `extra` | `flex flex-1 items-center justify-end gap-2` | `content-layout-nav.tsx:55` |
| Thân page | `lg:px-12 md:px-6 py-6`, cuộn riêng, cao `calc(100dvh-52px-60px)` | `content-layout.tsx:56` |
| Giới hạn ngang | `max-w-7xl` (1280px) khi `compact`, `max-w-full` khi không | `content-layout.tsx:72-77` |
| Footer dính đáy | `h-15 sticky bottom-0 border-t border-slate-300 bg-background` | `content-layout.tsx:84` |

### 1.2 Danh sách — `PAGE/short-links/page.tsx`

| Thành phần | Bố cục | Component | Hook/API | Nguồn |
|---|---|---|---|---|
| Tiêu đề + CTA | Title "Short link", `extra` = nút ⋮ Import/Export + nút **Tạo short link** (`variant="secondary"`, icon Plus) | `ShortLinkHeaderActions`, `ImportExportAction` | — | `page.tsx:14-18`, `SL/short-link-list/short-link-header-actions.tsx:16-22` |
| Hàng công cụ | Trái: ô dán link nhanh (`PasteLinkHeader`, tối đa 10 link, popover textarea). Phải: search 250px, lọc ngày `date_range`, nút lọc tag/space (`Popover` 280px) | `DataFilterItem`, `ShortLinkFilterMenu` | `useGetTouchPoints(org_id,{pagination,search,sorting,filters})`, `useGetTagDropdowns`, `useGetCollectionsDropdown`, `useCreateTouchPoint` (dán nhanh) | `SL/short-link-list/index.tsx:263-301`, `paste-link-header.tsx:199-314`, `short-link-filter-menu.tsx:62-75` |
| Hàng header bảng | Checkbox chọn tất cả + khi có chọn: nút Move to collection, Xoá hàng loạt (`LoadingButton`), số đã chọn | `Checkbox`, `LoadingButton`, `useConfirmDialog` | `useBulkDeleteTouchPoint` | `index.tsx:303-357` |
| Bảng | `TableV2WithRef` tắt header, một cột, mỗi hàng là một **card**: `border-separate border-spacing-y-3`, pageSize 5, sort `created_at desc` | `TableV2WithRef`, `TableActionProvider` | — | `index.tsx:235-262`, `columns.tsx:29-46` |
| Card hàng | `flex items-center gap-2 bg-card border border-slate-300 rounded-[8px] p-3 md:pl-2 md:pr-4 md:py-4`, hover `border-primary`, click cả thẻ → detail. Trái → phải: Checkbox · ô QR `90×90 rounded-[15px]` (ảnh `path_qr_code` hoặc `QrRenderWithRef` 74) · cột nội dung: tên (`text-sm font-medium`), **short URL** (`text-s font-medium text-secondary-blue`) + nút copy (tím) + nút mở (xanh) + `→ đích` · phải: thanh số đo `bg-slate-50 border rounded-[6px]` (Eye lượt xem, lead, doanh thu nếu bật) · nút analytics vuông · `DataTableRowActions` ⋮ | `TouchPointCard` | `useTouchPointActions` (copy), hành động ⋮ từ `TableActionProvider`: edit, move_to_collection, download_qr, deep_link_analytics (Pro), delete | `touchpoint-card.tsx:208-345`, `index.tsx:127-233` |
| Hàng metadata | Chỉ desktop: icon tính năng đang bật (tối đa 3, `+n` tooltip) · Folder + badge space tím · Tag + badge màu (2 + `+n`) · phải: avatar 16px + `RelativeTime(created_at)` | `Badge`, `Tooltip`, `CustomAvatar`, `RelativeTime` | — | `touchpoint-card.tsx:349-507` |
| Skeleton | Khớp card: checkbox, QR 90, 2 dòng text, 3 ô phải, hàng metadata | `ShortLinkCardSkeleton` | — | `short-link-card-skeleton.tsx:3-55` |
| Trạng thái rỗng | Minh hoạ "trình duyệt giả" 480px có 3 card giả + thanh chart, tiêu đề `text-xl font-semibold`, mô tả, nút **Tạo** mặc định | `ShortLinkEmptyState` | — | `short-link-empty-state.tsx:30-88` |

### 1.3 Tạo — `PAGE/short-links/create/page.tsx` → `SL/short-link-create.tsx`

| Thành phần | Bố cục | Nguồn |
|---|---|---|
| Page server | Kiểm quota plan (`ensureOrgPlan` hai key), truyền `blocked`, `orgQuota` | `create/page.tsx:15-25` |
| Khung | `ContentLayout` title "Tạo short link", `backPath` về list, **footer dính**: `Huỷ` (`tertiary`) + `Tạo Link` (`LoadingButton type=submit form=FORM_ID`), căn giữa trong `max-w-7xl px-6 lg:px-12` | `short-link-create.tsx:77-94` |
| Chặn plan | `ContentBlock blocked blockBy="plan"` với banner ảnh | `short-link-create.tsx:95-110` |
| Form | `ShortLinkForm` trong `QrCustomizeProvider`. Bố cục 3 cột `flex flex-col xl:flex-row gap-5`: **sidebar trái** `xl:w-[252px] 2xl:w-[302px]` (card `rounded-xl border p-2`, mục `px-4 py-2 rounded-lg`, active `text-primary bg-primary/5`; mobile thành lưới ô 72px) · **card giữa gộp** `flex-1 bg-card rounded-xl border border-border` chứa tab Cơ bản (`p-6 gap-4`) hoặc section nâng cao (`p-6` + `SectionHeader` h2 `text-lg font-semibold` + mô tả) · **panel phải** `lg:w-[252px] 2xl:w-[302px] border-l` chỉ ở tab Cơ bản | `short-link-form/index.tsx:218-279`, `short-link-sidebar.tsx:38-106` |
| Tab Cơ bản | URL đích (`DestinationUrlField`) → cấu hình domain/slug (`ShortLinkConfiguration`) → `Separator` → Tên (`Input bg-slate-100`) → Tag (`TagSelect`) → Space (nút giả `bg-slate-100 rounded-[6px]` mở `CollectionSelectDialog`) → `Separator` → toggle Conversion tracking (`CustomSwitch` + popover Premium) | `basic-editing-tab.tsx:82-291` |
| Panel phải | `QrPreviewCard` (nhãn "Mã QR" + HelperTooltip, nút tải/copy 28px tròn **mờ ở chế độ tạo** với tooltip "Tạo short link trước đã", khung `GridPatternBg` chứa QR 90 + nút bút sửa QR góc) · `MetaPreviewCard` (xem trước OG, nút sửa mở `CustomDialogV2` meta) | `right-panel.tsx:31-45`, `qr-preview-card.tsx:34-131` |
| Section nâng cao | Mỗi section một component `ShortLink*Section`; gate plan bằng `PremiumOnlySection`, gate "coming soon" bằng `LockableSection`; lỗi form tự nhảy tab (`findFirstErrorTab`) | `index.tsx:181-206, 321-369` |
| Mật khẩu | `FormField access_control.password`: `Input size=sm type=password` + mắt · nút **Tạo ngẫu nhiên** (`secondary`, có giả bận 700ms bằng `Math.random`) | `sections/password-section.tsx:38-82` |
| Smart targeting | `DefaultDestinationField` → dòng ghi chú `bg-blue-50 text-blue-700` → banner legacy vàng → `DevicesSection` → `CountriesSection` | `sections/smart-targeting-section.tsx:76-120` |
| Hook form | `useShortLinkForm`: `useForm + zodResolver`, mặc định QR bật, bật `FormWarningProvider` khi dirty | `hooks/use-short-link-form.ts:38-59` |
| Submit | `useCreateTouchPoint(org_id,{noToast})`; thành công → E2EE dialog hoặc `ShortLinkCreatedDialog`; đóng dialog → `router.push(detail?type=short_link)` | `short-link-create.tsx:47-74, 121-127` |

### 1.4 Hộp thoại đã tạo — `SL/short-link-created-dialog.tsx`

`CustomDialogV2 initialOpen size="xs"` (480px, `rounded-[16px]`, `px-5 py-6`), title/description từ
`touchpoint:create_success_dialog`. Thân `flex flex-col gap-5 py-3`: nhãn **Short link** + `Input readOnly
font-mono` với adornment Copy → CheckCircle 2s · `QrRenderWithRef size=160 border` · hai nút `secondary sm
flex-1` **Sao chép QR** / **Tải QR** (`DownloadQrPopover`) · nút chính `size=sm w-full` **Tiếp tục** → detail.
(`short-link-created-dialog.tsx:59-124`.)

### 1.5 Chi tiết — `PAGE/short-links/[touch_point_id]/page.tsx` → `SL/short-link-edit.tsx`

| Thành phần | Bố cục | Hook | Nguồn |
|---|---|---|---|
| Header page | `ContentLayout title={<ShortLinkDetailHeader/>} isBackable={false}` + `navBarClassName` cho title chiếm hết chiều ngang. Header tự vẽ: `ArrowLeft` back · **short URL** `text-s font-medium truncate` + nút copy `variant=table size-7 text-secondary-purple` · phải: **thanh số đo** `bg-slate-50 border rounded-[6px] h-9` (ScanEye lượt xem · lead · doanh thu) · nút ⋮ `secondary size=icon` mở menu: Chia sẻ (`SharingModal`), Deep-link analytics (Pro), Xoá (`useConfirmDialog`) | `useShowTouchPoint` (suspense), `useTouchPointActions`, `useDeleteTouchPoint`, `usePlanFeatures` | `short-link-edit.tsx:121-135`, `short-link-detail-header.tsx:86-173` |
| Thân | Cùng `ShortLinkForm` như tạo, thêm nhóm sidebar **Phân tích** đứng đầu; `?tab=analytics` mở thẳng tab đó; tab analytics mở rộng `maxWidth 96rem` và tự thu sidebar app ở màn lg | `useUpdateTouchPoint` | `short-link-edit.tsx:61-93, 151-160`, `short-link-form/index.tsx:132-136, 174-177, 222-225` |
| Tab Phân tích | `AnalyticByTouchPoint` đọc `touch_point_id` từ `useParams` | — | `index.tsx:340-341`, `analytics/components/sections/analytic-by-touch-point.tsx:30` |
| Footer | Chỉ hiện khi form dirty và không ở tab analytics: `Huỷ` + `Lưu thay đổi` | — | `short-link-edit.tsx:136-149` |
| Sửa section | Mỗi section ghi vào form; lưu một lần qua footer (không có nút Lưu từng section) | — | `index.tsx:210-216` |

---

## 2. Bản đồ màn hình Artifact hiện tại

### 2.1 Danh sách — `PAGE/artifacts/page.tsx` → `AF/artifact-list/index.tsx`

| Thành phần | Bố cục | Component | Hook/API | Nguồn |
|---|---|---|---|---|
| Tiêu đề + CTA | Title "Artifact", `extra` = **chỉ** nút **Tạo artifact** (`secondary`, Plus) | `ArtifactHeaderActions` | — | `page.tsx:15-18`, `artifact-header-actions.tsx:14-22` |
| Hàng công cụ | **Không có**: không search, không lọc, không header bảng, không chọn hàng loạt. Ghi chú trong code: backend chỉ nhận `page + limit` | — | `useGetArtifacts(org_id, page, limit)` GET `/organizations/{org}/artifacts` | `index.tsx:18-26`, `hooks/use-artifacts.ts:32-43` |
| Bảng | `TableV2WithRef` cùng lớp CSS với short link, pageSize **20**, không sort, không selection | `TableV2WithRef` | — | `index.tsx:30-73` |
| Card hàng | Cùng lớp thẻ ngoài với short link (`border-slate-300 rounded-[8px] p-3 …`). Trái → phải: ô QR 90 (ảnh / QR render / icon kind khi chưa có link) · cột nội dung: **tên + badge trạng thái + badge kind xám + badge quyền xem xám** cùng một dòng; dòng 2: short URL xanh + nút mở (**không có nút copy**) hoặc "Liên kết đã bị xoá" hoặc `ArtifactStatusNote` · phải: nút tải về tròn (tím) · dung lượng · `RelativeTime(updated_at)` · ⋮ `tertiary h-8 w-8` mở `DropdownMenu` **tự dựng**: Cập nhật nội dung / Sao chép link (khoá kèm lý do khi draft) / Xoá (đỏ, tách dòng) | `ArtifactCard`, `ArtifactStatusBadge`, `ArtifactAccessBadge` | `useReplaceArtifact`, `useDeleteArtifact` qua dialog | `artifact-card.tsx:57-215` |
| Hàng metadata | **Không có** (không tag, space, người tạo) | — | — | — |
| Skeleton | `rounded-[16px] border-slate-200`, có hàng metadata thứ hai và ô `size-9` không tồn tại ở thẻ thật | `ArtifactCardSkeleton` | — | `artifact-card-skeleton.tsx:4-29` |
| Trạng thái rỗng | Icon `FileUp` trong ô 56px, tiêu đề, mô tả, nút **Tạo artifact đầu tiên** | `ArtifactEmptyState` | — | `artifact-empty-state.tsx:13-28` |

### 2.2 Tạo — `PAGE/artifacts/create/page.tsx` → `AF/artifact-create/index.tsx`

| Thành phần | Bố cục | Nguồn |
|---|---|---|
| Page server | Không kiểm plan/quota ở server (khác short link) | `create/page.tsx:3-5` |
| Khung | `ContentLayout` title "Tạo artifact", `backPath`, footer dính: `Huỷ` + **Xuất bản** (`LoadingButton type=button`, khoá kèm dòng lý do `aria-describedby`) | `index.tsx:181-215` |
| Thân | **Một cột** `max-w-2xl mx-auto flex flex-col gap-6`: `ArtifactDropzone` (label dashed `rounded-[16px] py-10`) → thanh tiến trình khi upload → Tên (`Label + Input`, không dùng `FormField`) → Đường dẫn (slug, không sửa được sau xuất bản) → **Ai xem được** (`ArtifactAccessFields`: 3–4 radio card `rounded-[12px]`, chọn Mật khẩu mở ô + nút Tạo ngẫu nhiên `crypto`) | `index.tsx:217-289`, `artifact-dropzone.tsx:52-128`, `artifact-access-fields.tsx:54-148` |
| State | `useState` rời (file, name, slug, accessMode, password), **không dùng react-hook-form/zod**, không `FormWarningProvider` | `index.tsx:50-62` |
| Submit | Hai request nối tiếp: `useCreateArtifact` (multipart, progress) → `usePublishArtifact` (slug, access_mode, password). Publish lỗi → toast + đi trang chi tiết (draft giữ lại) | `index.tsx:135-179` |
| Không có | Sidebar, panel xem trước QR/meta, chọn domain, tag/space, gate plan | — |

### 2.3 Hộp thoại đã tạo — `AF/artifact-created-dialog.tsx`

Sao chép gần nguyên `ShortLinkCreatedDialog` (`size="xs"`, Input readOnly + copy, QR 160, hai nút QR, nút
**Xem artifact**). Thêm: dòng "Quyền xem: {mode}" khi không công khai và `ArtifactPasswordReveal` khi chế
độ Mật khẩu (`:86-91`). QR luôn `getQrDefaultOptions`, không có `qr_customize_options`.

### 2.4 Chi tiết — `PAGE/artifacts/[artifact_id]/page.tsx` → `AF/artifact-detail/index.tsx`

| Thành phần | Bố cục | Hook | Nguồn |
|---|---|---|---|
| Header page | `ContentLayout title={artifact.name} backPath` (dùng back của Navbar). `extra`: khi `draft` nút phụ **Cập nhật nội dung** · `ArtifactPrimaryAction` (`draft`→Xuất bản, `live`→Cập nhật nội dung, `blocked`→Tải file khác, các mã khác khoá kèm lý do) · ⋮ `tertiary` chỉ có **Xoá** | `useShowArtifact` (không suspense: tự vẽ skeleton/404), `usePublishArtifact` | `index.tsx:113-181`, `artifact-primary-action.tsx:63-81` |
| Thân | **Một cột** `max-w-3xl mx-auto gap-6`: (1) badge trạng thái + short URL xanh + copy + mở, `ArtifactStatusNote`; (2) `ArtifactPreview` iframe 420px `rounded-[16px] border-slate-200` với nhãn "Xem trước nội dung" + nút Mở tab mới / Tải về; (3) **khối Quyền xem** `rounded-[16px] border-slate-200 bg-card p-4`: nhãn + badge + ghi chú theo chế độ + nút `Đổi mật khẩu` (chỉ password) + `Đổi`; (4) khối QR `p-4`: QR 90 + nút Tải QR; (5) bảng meta `MetaRow` (Loại, Kiểu nội dung, Dung lượng, Tạo lúc, Cập nhật lúc) | `useArtifactAccessModes` | `index.tsx:182-321`, `artifact-preview.tsx:112-168` |
| Không có | Tab, sidebar, thanh số đo lượt quét, tab phân tích, form sửa tên/tag/space, footer Lưu, menu Chia sẻ | — | `ArtifactDTO` không có `visits` (`core/types/artifact.type.ts:339-379`) nhưng có `touch_point_id:369` |
| Dialog thay file | `CustomDialogV2 size="sm"` (640px), 5 pha `select/uploading/done/failed/gone`; dropzone → bảng diff "Đang phục vụ → Sẽ thay bằng" → thanh dung lượng hai lớp → ô vàng đổi loại → khối xanh "QR giữ nguyên" (hoặc xám khi draft) → khối xám "File cũ bị thay hẳn" + link tải; footer nút phải `Huỷ` + `Cập nhật` (busy không mờ) | `useReplaceArtifact`, `useArtifactQuota` | `artifact-replace-dialog.tsx:177-421` |
| Dialog quyền xem | `CustomDialogV2 size="sm"`: `ArtifactAccessFields` + khối xanh `bg-secondary-blue/10 rounded-[12px]` "Mã QR và link ngắn không đổi" (+ câu rời mật khẩu) + ghi chú draft; footer `Huỷ` + `Lưu`; pha `done` hiện `ArtifactPasswordReveal` + `Xong` | `useUpdateArtifactAccess` PATCH | `artifact-access-dialog.tsx:96-156` |
| Dialog đổi mật khẩu | `size="xs"`: ô mật khẩu mới + Tạo ngẫu nhiên, dòng "Đặt lúc …", ô vàng cảnh báo khi đã gõ, footer `Huỷ` + `Lưu` khoá kèm lý do; pha `done` reveal | cùng hook | `artifact-password-dialog.tsx:79-178` |
| Dialog xoá | **`AlertDialog` của shadcn** (không phải `useConfirmDialog` như short link), nút `Xoá vĩnh viễn` nền `semantic-error`, điều hướng về list | `useDeleteArtifact` | `artifact-delete-button.tsx:78-103` |

### 2.5 Trang người xem `/a/<token>` (ngoài middleware)

Dựng bằng chuỗi HTML server-side `landingShell()` (`core/helpers/artifact-landing-shell.ts:18-86`):
font hệ thống, `color-scheme: light dark`, nút `#111`, khối trấn an `#f1f5f9`, brand mark SVG nội tuyến
`#2563eb`. Bốn cổng ở `artifact-gate-pages.ts`: mật khẩu (401, form POST, sai → "Còn {n} lần thử", khoá
sau `ARTIFACT_GATE_MAX_TRIES = 3` ở `artifact.type.ts:80` → 429 "Đã thử quá nhiều lần"), Google (401,
nút "Tiếp tục với Google"), Riêng tư (401 mời đăng nhập li2 / 403 từ chối + "Đăng nhập bằng tài khoản
khác"), 503. Bia mộ 410 cho `removed` đứng trước mọi cổng. Copy ở `artifact-landing.ts:19-69`.

---

## 3. Bảng đối chiếu từng màn

Ký hiệu: **LỆCH** = lệch pattern thật, nên sửa. **BẢN CHẤT** = khác vì tính năng khác, giữ.
**CHƯA CÓ DỮ LIỆU** = muốn khớp nhưng DTO/API chưa trả.

### 3.1 Danh sách

| Điểm | Short link | Artifact | Kết luận |
|---|---|---|---|
| Nút tạo trong `extra` | `secondary` + Plus, kèm ⋮ Import/Export | `secondary` + Plus, không ⋮ | Khớp. Thiếu Import/Export là BẢN CHẤT (chưa có việc import artifact) |
| Hàng công cụ (search, lọc ngày, lọc tag/space) | Có | Không | **LỆCH** nhưng chặn bởi API: `listForOrg` chỉ nhận `page/limit`. Việc của eng; UI nên để sẵn vị trí (xem §4.1) |
| Ô tạo nhanh (dán link) | `PasteLinkHeader` | Không | BẢN CHẤT một phần: artifact không tạo từ một dòng text. Tương đương gần nhất là **dropzone nhanh** ngay trên danh sách (tùy chọn, không bắt buộc) |
| Header bảng + chọn hàng loạt + xoá hàng loạt | Có | Không | **LỆCH**. Xoá hàng loạt artifact có nghĩa thật (lỗi `errors.quota_live` bảo "gỡ bớt một cái"). Cần `useBulkDelete` hoặc lặp `DELETE` |
| pageSize | 5 | 20 | **LỆCH** nhỏ, nên về 5 cho cùng nhịp cuộn |
| Checkbox đầu card | Có | Không | **LỆCH** (đi kèm mục chọn hàng loạt) |
| Ô QR 90×90 | Ảnh `path_qr_code` hoặc render | Giống, thêm icon kind khi draft | Khớp. Icon kind khi chưa có link là BẢN CHẤT (draft chưa có QR) |
| Dòng 1 | Tên | Tên + 3 badge | BẢN CHẤT có trạng thái/kind/quyền, nhưng **LỆCH** về vị trí: short link để badge ở hàng metadata, không chen vào dòng tên. Nên đưa kind + quyền xem xuống hàng metadata, chỉ giữ badge trạng thái cạnh tên |
| Dòng 2: short URL + copy + mở + đích | Có copy | **Không có copy** inline, copy chỉ trong ⋮ | **LỆCH**. Copy là việc số một với một link in QR |
| Thanh số đo lượt xem | Có | Không | CHƯA CÓ DỮ LIỆU: `ArtifactDTO` không có `visits`. Vị trí nên để sẵn |
| Nút analytics vuông | Có | Không | CHƯA CÓ DỮ LIỆU, nhưng `touch_point_id` đã có trong DTO nên có thể dẫn tới `/short-links/{tp}?tab=analytics` ngay hôm nay |
| Menu ⋮ | `DataTableRowActions` + `TableActionProvider` (hành động khai báo tập trung, có `warnType: 'dialog'`) | `DropdownMenu` tự dựng trong card, dialog gắn trong card | **LỆCH** về cơ chế. Nội dung menu đúng spec M1.2. Chuyển sang `TableActionProvider` để hàng loạt và từng hàng dùng chung một nguồn |
| Hàng metadata (tag, space, avatar, thời gian) | Có | Không | **LỆCH** một nửa: artifact chưa có tag/space (BẢN CHẤT hôm nay), nhưng kind/quyền xem/dung lượng/`updated_at`/người tạo hoàn toàn có thể xếp vào hàng metadata theo cùng lớp CSS |
| Skeleton | Khớp thẻ | Lệch bo góc, viền, số hàng | **LỆCH** (đã ghi ở `docs/artifact-ui-wave2.md` §B.1) |
| Trạng thái rỗng | Minh hoạ dày + CTA | Icon đơn + CTA | **LỆCH** mức thấp. Chỉ cần dày hơn một chút theo cùng khuôn (`pt-6 pb-14`, tiêu đề `text-xl`), không cần sao chép gradient |

### 3.2 Tạo

| Điểm | Short link | Artifact | Kết luận |
|---|---|---|---|
| Khung + footer dính `Huỷ`/`Tạo` | Có | Có, nhãn **Xuất bản** | Khớp. Nhãn "Xuất bản" là BẢN CHẤT (tạo = upload + publish). Giữ dòng lý do khoá dưới nút, đây là điểm artifact làm **tốt hơn** nhà |
| Gate plan ở server | Có (`ensureOrgPlan`) | Không | **LỆCH**. Quota artifact tồn tại (`useArtifactQuota`), nên trang tạo cũng nên chặn trước bằng `ContentBlock blocked` thay vì để 403 lúc upload |
| Bố cục 3 cột (sidebar / card / panel phải) | Có | Một cột `max-w-2xl` | **LỆCH** về khung. Artifact có đủ nội dung cho **2 cột**: card giữa (file, tên, đường dẫn, ai xem được) + panel phải (QR preview mờ "Xuất bản trước đã" + tóm tắt file). Sidebar trái là BẢN CHẤT không cần: chỉ có một nhóm thiết lập, không có section nâng cao |
| Field dùng `Form/FormField/FormLabel` (react-hook-form + zod) | Có | `Label + Input + useState` | **LỆCH** cơ chế. Hệ quả nhìn thấy: không có cảnh báo rời trang khi đang nhập (`FormWarningProvider`), lỗi hiện kiểu khác. Nên chuyển về `useForm + zodResolver` |
| Thứ tự field | Đích → domain/slug → tên → tag → space → toggle | File → tên → slug → ai xem được | Khớp tinh thần (nguồn nội dung đứng đầu). Slug không sửa được sau publish là BẢN CHẤT, giữ dòng hint |
| Tên tự điền | Từ meta title của đích | Từ tên file | Khớp |
| Panel QR preview | `QrPreviewCard` mờ nút tải/copy ở chế độ tạo | Không | **LỆCH**. Tái dùng nguyên `QrPreviewCard` với `isEditMode={false}`; QR render từ placeholder cho tới khi có `short_url` |
| Chọn domain/slug bằng `ShortLinkConfiguration` | Có | Ô slug trần | **LỆCH** một phần: `ShortLinkConfiguration` nhận `control` của react-hook-form và kiểm slug trùng; artifact dùng cùng `slugSchema` nên **có thể tái dùng** nếu form đổi sang RHF. Nếu chưa, tối thiểu giữ cùng lớp `Input bg-slate-100` |
| Mật khẩu | `password-section.tsx` giả bận 700ms, `Math.random` | `ArtifactAccessFields`: `crypto`, tức thì | Artifact đúng hơn. **Không** kéo artifact về theo short link; ngược lại là ứng viên sửa cho short link sau |
| Quyền xem 4 chế độ | Short link chỉ có mật khẩu (section riêng) | Radio card trong form | BẢN CHẤT. Giữ radio card |

### 3.3 Hộp thoại đã tạo

| Điểm | Short link | Artifact | Kết luận |
|---|---|---|---|
| Cấu trúc | `xs`, link + QR 160 + hai nút QR + Tiếp tục | Giống hệt, thêm dòng chế độ + password reveal | Khớp. Khác là BẢN CHẤT. Đây là hai file gần trùng: ứng viên gộp thành một `LinkCreatedDialog` dùng chung với slot `children` (xem §4.3) |
| Nhãn nút | "Tiếp tục" | "Xem artifact" | Nhỏ, chấp nhận |

### 3.4 Chi tiết

| Điểm | Short link | Artifact | Kết luận |
|---|---|---|---|
| Header page | `ShortLinkDetailHeader`: back · **short URL + copy** · thanh số đo · ⋮ | Title = tên artifact · `extra` = 2–3 nút + ⋮ chỉ Xoá | **LỆCH lớn nhất**. Người dùng detail đến để lấy link; short link đưa link lên header, artifact giấu xuống thân. Đề xuất header cùng hình: back · short URL + copy (hoặc tên + badge trạng thái khi draft) · thanh số đo (lượt quét, chờ DTO) · nút chính (`ArtifactPrimaryAction`) · ⋮ (Chia sẻ, Mở analytics, Tải về, Xoá) |
| Nút chính ở header | Không (lưu qua footer) | Có (`Cập nhật nội dung` / `Xuất bản`) | BẢN CHẤT: thay file là hành động rời, không phải field form. Giữ nút chính trong header, bên trái ⋮ |
| Thân | Sidebar tab + card gộp, tab Phân tích | Một cột 5 khối | **LỆCH** về khung, nhưng không nên sao chép sidebar 13 mục. Artifact có đúng 3 "tab" có nghĩa: **Nội dung** (preview + meta + QR), **Quyền xem**, **Phân tích**. Đề xuất giữ khung card gộp giữa + panel phải của short link, dùng sidebar ngắn 3 mục qua `ShortLinkSidebar` (component đã nhận `groups` prop, nhưng `SidebarItemKey` là union đóng; cần nới kiểu hoặc tạo bản generic nhỏ) |
| Tab Phân tích | `AnalyticByTouchPoint` đọc `touch_point_id` từ `useParams` | Không | CHƯA CÓ UI nhưng dữ liệu có: artifact có `touch_point_id`. `AnalyticByTouchPoint` cần nhận `tpId` prop thay vì chỉ `useParams` (sửa một dòng ở `analytic-by-touch-point.tsx:30`) |
| Khối QR | Panel phải `QrPreviewCard` (tải, copy, sửa QR) | Khối ngang QR 90 + nút Tải | **LỆCH**. Tái dùng `QrPreviewCard isEditMode` (ẩn nút bút sửa nếu artifact chưa lưu `qr_customize_options`) |
| Khối Quyền xem | Section mật khẩu trong form, lưu qua footer | Khối riêng có nút `Đổi` mở dialog | BẢN CHẤT: đổi quyền có hiệu lực ngay và có pha reveal mật khẩu, không phải field lưu chung. Giữ dialog; chỉ đổi vị trí vào tab/khối theo khung mới |
| Bảng meta `MetaRow` | Không có (meta nằm trong form) | Có 5 dòng | BẢN CHẤT (file có kích thước, loại). Bỏ dòng `content_type` theo wave2 §C.9; chuyển vào panel phải dưới QR |
| Footer Lưu | Khi dirty | Không có | BẢN CHẤT hôm nay (không sửa tên/tag). Nếu thêm sửa tên/tag thì dùng đúng footer này |
| Dialog xoá | `useConfirmDialog` | `AlertDialog` shadcn | **LỆCH** cơ chế, nội dung artifact tốt hơn (nói hệ quả QR). Chuyển sang `useConfirmDialog` với `confirmButtonText: 'Xoá vĩnh viễn'` và giữ nguyên copy |
| Chia sẻ | `SharingModal` trong ⋮ | Không | **LỆCH**. `SharingModal` chỉ cần `url`, dùng lại thẳng |
| Viền panel 16px | `border-slate-300` (funnels, export) | `border-slate-200` | **LỆCH** (wave2 §B.5) |
| Trạng thái `removed` | — | Badge trung tính, không nút, note "QR vẫn chạy" | BẢN CHẤT, giữ |

### 3.5 Naming và khoảng cách

| Điểm | Kết luận |
|---|---|
| i18n: short link dùng `common:buttons.create {field}`; artifact dùng khoá riêng `list.create_cta` | **LỆCH** nhỏ. Dùng `common:buttons.create` với `field: t('artifact:module')` để cùng cách đọc "Tạo + danh từ" |
| Tên route `artifacts/[artifact_id]` so với `short-links/[touch_point_id]` | Khớp quy ước |
| Khoảng cách card `gap-6` ở detail artifact so với `gap-5` giữa cột của short link form | Về `gap-5` khi vào khung cột |
| Icon sidebar app `FileCode2` (`shared/constants/menu-list.tsx:157`) | **LỆCH** nghĩa (wave2 §B.2): nói "code" cho tính năng nhận 4 loại file |

---

## 4. Đề xuất bố cục lại Artifact

Nguyên tắc: dùng lại khung và lớp CSS của short link; chỉ khác ở chỗ bản chất bắt buộc (file, 4 chế
độ quyền, thay file giữ QR, trạng thái `removed`). Ưu tiên sửa file đang có.

### 4.1 Danh sách (`AF/artifact-list/*`)

Sửa `index.tsx`:
- Bọc `TableV2WithRef` trong `TableActionProvider` với hành động: `edit` (mở detail), `update_content`
  (render tùy chỉnh, chỉ `live/draft`), `copy_link` (khoá kèm lý do khi chưa có `short_url`),
  `download_qr` (chép nguyên khối từ `SL/short-link-list/index.tsx:162-200`), `delete`
  (`warnType: 'dialog'`, title/desc lấy `artifact:detail.delete_confirm_*`).
- Thêm `toolsRender` giống `SL/short-link-list/index.tsx:263-357`: hàng công cụ (search + lọc ngày + lọc
  trạng thái/kind/quyền xem) **nhưng hiện disabled kèm tooltip "Sắp có"** cho tới khi API lọc xong,
  hoặc để trống hàng và chỉ thêm header bảng (checkbox chọn tất cả + xoá hàng loạt). Tôi khuyên
  **chỉ thêm header bảng + chọn hàng loạt** ngay, hàng lọc chờ API; đừng hiện ô lọc không hoạt động.
- `pageSize: 5`, `enableRowSelection: true`.

Sửa `artifact-card.tsx` theo đúng khung `touchpoint-card.tsx`:
- Thêm checkbox đầu thẻ (`:217-225`).
- Dòng 1: tên + **chỉ** `ArtifactStatusBadge`. Dòng 2: short URL + **copy** + mở (chép `:258-279`).
  Draft: thay dòng 2 bằng `ArtifactStatusNote`.
- Phải: thanh số đo lượt quét (ẩn cho tới khi DTO có `visits`; để sẵn khối) · nút analytics vuông dẫn
  `/short-links/{touch_point_id}?tab=analytics` khi có · `DataTableRowActions`.
- Hàng metadata desktop: icon kind + nhãn · `ArtifactAccessBadge` · dung lượng · nút tải về tròn · phải:
  avatar người tạo (cần `profiles` trong DTO, nếu chưa có thì bỏ) + `RelativeTime(updated_at)`.
- Sửa `artifact-card-skeleton.tsx` khớp thẻ mới (`rounded-[8px] border-slate-300`).
- `artifact-empty-state.tsx`: dùng khuôn `ShortLinkEmptyState` (`pt-6 pb-14`, minh hoạ nhỏ 3 thẻ giả
  mang icon kind), không gradient.

Component mới: **không**. Tất cả từ `shared/` và `short-links/`.

### 4.2 Tạo (`AF/artifact-create/index.tsx`)

- Chuyển state sang `useForm + zodResolver` (schema mới `features/artifacts/schemas/artifact-form.schema.ts`:
  `file`, `name`, `slug` dùng `slugSchema`, `access_mode`, `password` refine ≥ 8 khi `password`).
  Lợi: `FormField/FormMessage` cùng kiểu hiện lỗi, `FormWarningProvider` cảnh báo rời trang.
- Khung **2 cột** sao chép `short-link-form/index.tsx:237-278`: card gộp `flex-1 bg-card rounded-xl border`
  (`p-6 gap-4`: dropzone → `Separator` → Tên → Đường dẫn → `Separator` → Ai xem được) + panel phải
  `lg:w-[252px] 2xl:w-[302px] border-l`: `QrPreviewCard isEditMode={false}` (nút mờ, tooltip đổi copy
  thành "Xuất bản trước đã") + khối tóm tắt file (icon kind, tên, dung lượng, câu `office_notice`).
  Không sidebar trái.
- `create/page.tsx`: kiểm quota server-side như `short-links/create/page.tsx:15-23` và truyền `blocked`
  vào `ContentBlock`.
- Giữ footer, giữ dòng lý do khoá nút.
- Component tái dùng: `Form*`, `Separator`, `QrPreviewCard`, `ContentBlock`, `LoadingButton`.
  Component mới: không (khối tóm tắt file là vài dòng JSX trong panel).

### 4.3 Hộp thoại đã tạo

Gộp `ShortLinkCreatedDialog` và `ArtifactCreatedDialog` thành một component chung
`shared/components/customize/link-created-dialog.tsx` nhận `shortUrl`, `qrOptions`, `title`, `description`,
`continueLabel`, `children` (slot cho dòng chế độ + `ArtifactPasswordReveal`). Hai file hiện tại thành
wrapper mỏng. Nếu không muốn đụng short link lúc này, giữ `ArtifactCreatedDialog` như hiện tại: nó đã khớp.

### 4.4 Chi tiết (`AF/artifact-detail/index.tsx`)

Header: tạo `AF/artifact-detail/artifact-detail-header.tsx` theo đúng hình `short-link-detail-header.tsx`:
- `ArrowLeft` back · khi `live` có `short_url`: short URL + copy (`variant=table size-7
  text-secondary-purple`); khi khác: tên + `ArtifactStatusBadge`.
- Phải: thanh số đo (chỉ render khi có `visits`), `ArtifactPrimaryAction size=sm`, ⋮ `secondary size=icon`:
  Chia sẻ (`SharingModal url={short_url}`), Mở tab mới, Tải về, Xoá (`useConfirmDialog`, giữ copy).
- `ContentLayout title={<ArtifactDetailHeader/>} isBackable={false} navBarClassName` y như
  `short-link-edit.tsx:122-135`.

Thân: khung `flex flex-col xl:flex-row gap-5` của `short-link-form/index.tsx:223`:
- **Sidebar trái 3 mục** Nội dung / Quyền xem / Phân tích. Dùng `ShortLinkSidebar` nếu nới
  `SidebarItemKey` sang generic `string`; nếu không, viết `ArtifactDetailSidebar` ~40 dòng chép lớp CSS
  `short-link-sidebar.tsx:66-106` (cả bản mobile ô 72px). Đồng bộ `?tab=` như short link.
- **Card giữa gộp**: tab Nội dung = `ArtifactPreview` (viền `border-slate-300`) + bảng meta (bỏ
  `content_type`). Tab Quyền xem = khối hiện tại (`index.tsx:222-286`) chuyển nguyên vào, giữ hai dialog.
  Tab Phân tích = `AnalyticByTouchPoint tpId={artifact.touch_point_id}` (cần sửa component nhận prop).
- **Panel phải** chỉ ở tab Nội dung: `QrPreviewCard isEditMode` (nút tải/copy bật, nút bút ẩn vì artifact
  chưa lưu tuỳ chỉnh QR) + `ArtifactAccessBadge` + ghi chú trạng thái.
- Khi `removed`: không sidebar, một card bia mộ với `ArtifactStatusNote`, như hiện tại.

Dialog thay file, quyền xem, đổi mật khẩu: **giữ nguyên**, chỉ đổi điểm gọi. Dialog xoá: chuyển
`useConfirmDialog`, giữ copy; `ArtifactDeleteDialog` còn lại cho nơi cần `AlertDialog` có thể xoá sau.

### 4.5 Việc phụ thuộc eng (không thuộc UI)

- `visits` trong `ArtifactDTO` (list + detail) để thanh số đo và cột lượt quét có số.
- `listForOrg` nhận `search`, `status`, `kind`, `access_mode`, `created_at` range, `sorting`.
- `profiles` (người tạo) trong DTO nếu muốn avatar ở hàng metadata.
- Bulk delete endpoint hoặc chấp nhận gọi `DELETE` lặp ở FE.

### 4.6 Những gì cố ý không làm

- Không sao chép sidebar 13 mục và các section nâng cao: artifact không có targeting, UTM, pixel.
- Không thêm `PasteLinkHeader` tương đương: tạo artifact cần file, không tạo nhanh từ một ô.
- Không kéo cách tạo mật khẩu của artifact về theo `password-section.tsx` của short link.
- Không đổi trang `/a/<token>`: CSP `default-src 'none'` cấm font và stylesheet ngoài; chỉ đồng bộ màu
  nút về `--color-primary` và giữ brand mark như wave2 §C.6 đã đề xuất.
