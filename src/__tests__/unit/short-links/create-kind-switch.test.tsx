import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

import { CreateKindSwitch } from '@/features/short-links/components/unified-create/create-kind-switch'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

const setup = (value: 'link' | 'artifact' = 'link') => {
  const onChange = vi.fn()
  render(<CreateKindSwitch value={value} onChange={onChange} />)
  return { onChange }
}

describe('CreateKindSwitch', () => {
  it('hiện đúng hai lựa chọn', () => {
    setup()

    expect(screen.getAllByRole('tab')).toHaveLength(2)
    expect(screen.getByTestId('create-kind-link')).toBeTruthy()
    expect(screen.getByTestId('create-kind-artifact')).toBeTruthy()
  })

  /**
   * Chặn đúng cái hỏng âm thầm: công tắc vẽ ra nhưng bấm vào không đổi gì, hoặc luôn báo cùng một
   * loại. Khi đó trang vẫn trông đúng và vẫn tạo được link — chỉ artifact là không tới được, y
   * như hồi quy 2026-10-27.
   */
  it('bấm nhánh kia BÁO ĐÚNG nhánh kia', () => {
    const { onChange } = setup('link')

    fireEvent.click(screen.getByTestId('create-kind-artifact'))

    expect(onChange).toHaveBeenCalledWith('artifact')
  })

  it('bấm từ artifact về link cũng báo đúng', () => {
    const { onChange } = setup('artifact')

    fireEvent.click(screen.getByTestId('create-kind-link'))

    expect(onChange).toHaveBeenCalledWith('link')
  })

  it('aria-selected theo đúng giá trị đang chọn, không phải luôn ở nhánh đầu', () => {
    setup('artifact')

    expect(screen.getByTestId('create-kind-artifact').getAttribute('aria-selected')).toBe('true')
    expect(screen.getByTestId('create-kind-link').getAttribute('aria-selected')).toBe('false')
  })

  // Chỉ ô đang chọn nhận Tab — mẫu tablist chuẩn. Không có nó thì mỗi lần Tab qua công tắc phải
  // bấm hai lần mới ra khỏi.
  it('chỉ ô đang chọn nằm trong luồng Tab', () => {
    setup('link')

    expect(screen.getByTestId('create-kind-link').getAttribute('tabindex')).toBe('0')
    expect(screen.getByTestId('create-kind-artifact').getAttribute('tabindex')).toBe('-1')
  })

  it('phím mũi tên chuyển nhánh', () => {
    const { onChange } = setup('link')

    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'ArrowRight' })

    expect(onChange).toHaveBeenCalledWith('artifact')
  })

  it('mũi tên quay vòng, không kẹt ở đầu danh sách', () => {
    const { onChange } = setup('link')

    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'ArrowLeft' })

    expect(onChange).toHaveBeenCalledWith('artifact')
  })
})
