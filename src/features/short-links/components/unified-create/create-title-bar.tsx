'use client'

/**
 * Căn giữa công tắc loại ở thanh tiêu đề — CHỈ cho trang tạo.
 *
 * Công tắc đi qua `titleSlot` vào `content-layout-nav.tsx`, mà `<h3>` ở đó là tiêu đề của MỌI
 * trang trong app (hơn 70 trang). Nên không có dòng nào của `content-layout-nav` bị sửa: trang tạo
 * tự nới ô tiêu đề của riêng nó bằng `navBarClassName` (`CREATE_TITLE_NAV_CLASS`) — một prop sẵn
 * có, mặc định `undefined`, và chỉ trang nào truyền mới đổi. Cùng cách mà trang chi tiết artifact
 * đã dùng (`[&_#content-layout-title]:w-full`).
 *
 * Hai thanh trống hai bên chứ không `justify-center` trên một hàng ba ô: như vậy công tắc đứng
 * giữa kể cả khi `right` dài hay rỗng, nên bấm qua lại hai tab thì nó không nhảy ngang.
 */
export const CREATE_TITLE_NAV_CLASS =
  '[&_#content-layout-title]:flex-1 [&_#content-layout-title]:min-w-0'

export const CreateTitleBar = ({
  center,
  right,
}: {
  center: React.ReactNode
  right?: React.ReactNode
}) => (
  <div className="flex w-full items-center gap-3">
    <div className="flex-1" />
    <div className="shrink-0">{center}</div>
    <div className="flex flex-1 justify-end overflow-hidden">{right}</div>
  </div>
)
