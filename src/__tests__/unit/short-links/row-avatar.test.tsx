import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

import { RowAvatar } from '@/features/short-links/components/short-link-list/row-avatar'
import { getRowKind } from '@/features/short-links/utils/row-kind'

/**
 * Ô tròn đầu hàng. Hai loại hàng dùng **cùng một ô** — nên thứ cần khoá không phải hình thức, mà
 * là: hàng nào lấy ảnh từ ngoài, hàng nào không, và ảnh đó đi qua đường nào.
 */

const linkRow = { content_type: 'URL' }
const pdfRow = { content_type: 'ARTIFACT', artifact: { kind: 'pdf' } as any }

describe('RowAvatar — hàng LINK', () => {
  it('ảnh đi qua /api/favicon của mình, KHÔNG gọi thẳng máy chủ bên thứ ba', () => {
    render(<RowAvatar kind={getRowKind(linkRow)} destinationUrl="https://vnexpress.net/bai" />)

    const img = screen.getByRole('presentation') as HTMLImageElement
    /**
     * Đây là lý do tồn tại của cả đường proxy: `src` trỏ thẳng ra ngoài thì mỗi hàng là một lời
     * khai "người này vừa mở trang quản trị Li2" kèm IP và Referer, gửi cho một bên thứ ba.
     */
    expect(img.getAttribute('src')).toBe(
      `/api/favicon?url=${encodeURIComponent('https://vnexpress.net/bai')}`
    )
    expect(img.getAttribute('src')).not.toContain('vnexpress.net/favicon')
  })

  it('URL được mã hoá — tham số của chính mình không bị URL đích cắt ngang', () => {
    render(
      <RowAvatar kind={getRowKind(linkRow)} destinationUrl="https://a.com/x?y=1&z=2#frag" />
    )

    const src = screen.getByRole('presentation').getAttribute('src')!
    // Nối thô thì `&z=2` thành tham số của /api/favicon, và `#frag` cắt mất phần sau.
    expect(src).toBe(`/api/favicon?url=${encodeURIComponent('https://a.com/x?y=1&z=2#frag')}`)
    expect(src.split('?').length).toBe(2)
  })

  it('ảnh hỏng → lùi về biểu tượng, không để ô trống', () => {
    render(<RowAvatar kind={getRowKind(linkRow)} destinationUrl="https://a.com" />)

    fireEvent.error(screen.getByRole('presentation'))

    expect(screen.queryByRole('presentation')).toBeNull()
    expect(screen.getByTestId('row-avatar-icon')).toBeTruthy()
  })

  /**
   * Route trả **204 No Content** khi site không có favicon. 204 là một phản hồi *thành công*, nên
   * `onLoad` chạy chứ không phải `onError` — bắt thiếu ca này thì ô để trống, tức trông như tính
   * năng hỏng, đúng rủi ro đã ghi trong intend.md.
   */
  it('route trả 204 (ảnh rỗng) → vẫn lùi về biểu tượng', () => {
    render(<RowAvatar kind={getRowKind(linkRow)} destinationUrl="https://a.com" />)

    const img = screen.getByRole('presentation')
    Object.defineProperty(img, 'naturalWidth', { value: 0, configurable: true })
    fireEvent.load(img)

    expect(screen.queryByRole('presentation')).toBeNull()
    expect(screen.getByTestId('row-avatar-icon')).toBeTruthy()
  })

  it('link KHÔNG có URL đích thì không gọi gì cả', () => {
    render(<RowAvatar kind={getRowKind(linkRow)} destinationUrl={null} />)

    expect(screen.queryByRole('presentation')).toBeNull()
    expect(screen.getByTestId('row-avatar-icon')).toBeTruthy()
  })
})

describe('RowAvatar — bề rộng màn hình', () => {
  /**
   * Ô QR cũ có `hidden md:flex` vì nó 90×90 — gần nửa bề ngang một điện thoại. Ô này 44px, nên
   * copy lại điều kiện ẩn đó là **mất hẳn ô hình trên mobile**, đo được: chủ sản phẩm mở trên cửa
   * sổ hẹp và không thấy gì ở chỗ cũ của QR.
   */
  it('hiện ở MỌI bề rộng — không mang điều kiện ẩn của ô QR cũ', () => {
    const { container } = render(<RowAvatar kind={getRowKind(pdfRow)} />)
    const box = container.querySelector('[data-testid="row-avatar"]')!

    expect(box.className.split(/\s+/)).not.toContain('hidden')
    expect(box.className).not.toContain('md:flex')
    expect(box.className.split(/\s+/)).toContain('flex')
  })
})

describe('RowAvatar — hàng ARTIFACT', () => {
  /** Artifact *là* nội dung, nó không trỏ đi đâu — không có "trang đích" để lấy favicon. */
  it('KHÔNG bao giờ tải ảnh từ ngoài, kể cả khi được truyền URL', () => {
    render(<RowAvatar kind={getRowKind(pdfRow)} destinationUrl="https://a.com" />)

    expect(screen.queryByRole('presentation')).toBeNull()
    expect(screen.getByTestId('row-avatar-icon')).toBeTruthy()
  })

  it.each([
    ['html', 'page'],
    ['site', 'page'],
    ['pdf', 'file'],
    ['image', 'file'],
    ['video', 'file'],
    ['sheet', 'file'],
    ['hologram', 'file'], // kind lạ: vẫn phải có biểu tượng, không được ô trống
  ])('kind "%s" có biểu tượng', (kind) => {
    render(
      <RowAvatar kind={getRowKind({ content_type: 'ARTIFACT', artifact: { kind } as any })} />
    )

    expect(screen.getByTestId('row-avatar-icon')).toBeTruthy()
  })
})

describe('RowAvatar — hàng đã gỡ', () => {
  const removed = {
    content_type: 'ARTIFACT',
    artifact: { kind: 'pdf', status: 'removed' } as any,
  }

  it('xám đi, và KHÔNG mang màu họ nữa', () => {
    const { container } = render(<RowAvatar kind={getRowKind(removed)} />)
    const box = container.querySelector('[data-testid="row-avatar"]')!

    expect(box.className).toContain('bg-slate-100')
    expect(box.className).not.toContain('bg-red-50')
  })

  /** Gạch ngang là tín hiệu của chữ; vắt qua một biểu tượng chỉ làm nó khó đọc. */
  it('KHÔNG dùng line-through — đó là tín hiệu của ô chữ cạnh tên', () => {
    const { container } = render(<RowAvatar kind={getRowKind(removed)} />)

    expect(container.querySelector('[data-testid="row-avatar"]')!.className).not.toContain(
      'line-through'
    )
  })
})
