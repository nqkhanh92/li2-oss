import { useDebounceFn } from '@/shared/hooks/use-debounce'
import { cn } from '@/shared/lib/utils'
import React, { HTMLAttributes, useEffect, useMemo, useRef, useState } from 'react'

export type BaseSubMenuItem = {
  key: string
  label: string
}
type SubMenuItemProps<T extends BaseSubMenuItem> = {
  item: T
  renderItem?: (item: T, selected: boolean) => React.ReactNode
}

type SubMenuProps<T extends BaseSubMenuItem> = {
  items?: T[]
  renderItem?: (item: T, selected: boolean) => React.ReactNode
}
type SubMenuOptions = {
  mode: 'fixed' | 'sticky'
  bottomSpace?: boolean
}
export interface SubMenuContextType<T> {
  items: T[]
  setItems: React.Dispatch<React.SetStateAction<T[]>>
  current: T | null
  setCurrent: (item: T | null) => void
}

export function createSubMenuContext<T>({
  initialItems,
  options,
}: {
  initialItems: readonly T[]
  options?: SubMenuOptions
}) {
  const Context = React.createContext<SubMenuContextType<T> | undefined>(undefined)

  const Provider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [items, setItems] = useState<T[]>([...initialItems])
    const [current, setCurrent] = useState<T | null>(null)

    const [bottomHeight, setBottomHeight] = useState(0)
    useEffect(() => {
      const lastItem = items[items.length - 1] as T extends BaseSubMenuItem ? T : never
      if (!lastItem) return

      const targetId = `submenu-content-${lastItem.key}`
      let resizeObserver: ResizeObserver | null = null
      let mutationObserver: MutationObserver | null = null

      const setup = () => {
        const element = document.getElementById(targetId)
        if (!element) {
          requestAnimationFrame(setup) // Retry on next frame if not yet rendered
          return
        }

        const updateHeight = () => {
          setBottomHeight(element.offsetHeight)
        }

        // Observe height changes
        resizeObserver = new ResizeObserver(updateHeight)
        resizeObserver.observe(element)

        // Observe content changes (optional if content affects height)
        mutationObserver = new MutationObserver(updateHeight)
        mutationObserver.observe(element, { childList: true, subtree: true })

        updateHeight() // Initial height
      }

      setup()

      return () => {
        resizeObserver?.disconnect()
        mutationObserver?.disconnect()
      }
    }, [items])

    return (
      <Context.Provider value={{ items, setItems, current, setCurrent }}>
        <div>
          <div>{children}</div>
          {!!options?.bottomSpace && (
            <div
              style={{
                minHeight: `calc(100vh - 52px - 60px - ${bottomHeight}px)`,
              }}
            />
          )}
        </div>
      </Context.Provider>
    )
  }

  const useSubMenu = () => {
    const context = React.useContext(Context)
    if (!context) throw new Error('useSubMenu must be used within SubMenuProvider')
    return context
  }

  return { SubMenuProvider: Provider, useSubMenu }
}

export function defineSubmenu<const T extends BaseSubMenuItem>(
  initialItems: readonly T[],
  options?: SubMenuOptions
) {
  const { mode = 'sticky', bottomSpace } = options || {}
  const { SubMenuProvider, useSubMenu } = createSubMenuContext<T>({
    initialItems,
    options: { mode, bottomSpace },
  })
  const SubMenuItem: React.FC<SubMenuItemProps<T>> = ({ item, renderItem }) => {
    const { current, setCurrent } = useSubMenu()
    return (
      <div
        key={item.key}
        onClick={() => {
          const containerEl = document.getElementsByClassName('content-layout-div')[0]
          const targetEl = document.getElementById(`submenu-content-${item.key}`)
          if (containerEl && targetEl) {
            const containerTop = containerEl.getBoundingClientRect().top
            const targetTop = targetEl.getBoundingClientRect().top
            const scrollTop = containerEl.scrollTop + (targetTop - containerTop - 8)
            containerEl.scrollTo({
              top: scrollTop,
              behavior: 'smooth',
            })
          }
        }}
        className={cn(
          'text-sm font-medium py-2',
          current?.key === item.key ? 'text-primary' : 'text-slate-600'
        )}
      >
        {renderItem?.(item, current?.key === item.key) || item.label}
      </div>
    )
  }
  const SubMenuContent: React.FC<
    { itemKey: T['key'] } & React.HTMLAttributes<HTMLDivElement> & {
        children?: React.ReactNode
      }
  > = ({ itemKey, children, ...props }) => {
    const ref = useRef<HTMLDivElement>(null)
    const { current, setCurrent, items } = useSubMenu()

    //** */
    useEffect(() => {
      const el = ref.current
      if (!el) return

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && current?.key !== itemKey) {
            setCurrent(items.find((item) => item.key === itemKey) || null)
          }
        },
        {
          threshold: 0.5, // adjust as needed
          rootMargin: '0px 0px -50% 0px',
        }
      )

      observer.observe(el)
      return () => observer.disconnect()
    }, [itemKey, setCurrent, current])

    return (
      <div {...props} ref={ref} id={`submenu-content-${itemKey}`}>
        {children}
      </div>
    )
  }

  const SubMenu: React.FC<
    SubMenuProps<T> & HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode, containerClassname?: string }
  > = ({ children, renderItem, containerClassname, ...props }) => {
    const { current, items } = useSubMenu()
    return (
      <div {...props} className={cn('relative flex h-full', props.className)}>
        <div className={cn(mode === 'sticky' ? 'sticky top-0 z-10 self-start' : 'fixed z-10', containerClassname)}>
          {items?.map((item) => {
            return <SubMenuItem renderItem={renderItem} item={item} />
          })}
        </div>
        <div id="submenu-content-list flex-1">{children}</div>
      </div>
    )
  }

  return { SubMenuItem, SubMenu, useSubMenu, SubMenuProvider, SubMenuContent }
}
