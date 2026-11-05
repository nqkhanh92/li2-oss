'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { useCallback, useEffect, useRef, useState } from 'react'

export interface PaginationState {
  pageIndex: number

  pageSize: number
}

export interface ColumnSort {
  desc: boolean

  id: string
}

export type SortingState = ColumnSort[]

const defaultPagination: PaginationState = {
  pageIndex: 0,

  pageSize: 10,
}

/**
 * Parse value from URL param string to appropriate type
 */
function parseValue(value: string): string | number | boolean {
  // Check for boolean
  if (value === 'true') return true
  if (value === 'false') return false

  // Check for number
  if (!isNaN(Number(value)) && value !== '') {
    return Number(value)
  }

  // Return as string
  return value
}

export function useFilters(
  initialState: {
    pagination?: PaginationState

    search?: string

    sorting?: SortingState

    filters?: Record<
      string,
      string | number | boolean | string[] | number[] | boolean[] | Record<any, any>
    >
  } = {},
  useUrlParams: boolean = true
) {
  const router = useRouter()

  const pathname = usePathname()

  const searchParams = useSearchParams()
  const didInitRef = useRef(false)
  const isInitialMount = useRef(true)

  // Parse URL params and merge with defaults on initial mount
  const getInitialState = () => {
    if (!isInitialMount.current || !useUrlParams) {
      return {
        pagination: initialState.pagination || defaultPagination,
        search: initialState.search || '',
        sorting: initialState.sorting || [],
        filters: initialState.filters || {},
      }
    }

    // Parse pagination from URL
    const pageParam = searchParams.get('page')
    const pageSizeParam = searchParams.get('pageSize')
    const pagination = {
      pageIndex:
        pageParam !== null
          ? parseInt(pageParam)
          : (initialState.pagination?.pageIndex ?? defaultPagination.pageIndex),
      pageSize:
        pageSizeParam !== null
          ? parseInt(pageSizeParam)
          : (initialState.pagination?.pageSize ?? defaultPagination.pageSize),
    }

    // Parse search from URL
    const searchParam = searchParams.get('search')
    const search = searchParam !== null ? searchParam : initialState.search || ''

    // Parse sorting from URL
    const sortParam = searchParams.get('sort')
    let sorting: SortingState = initialState.sorting || []
    if (sortParam) {
      sorting = sortParam.split(',').map((sort) => {
        const [id, order] = sort.split(':')
        return {
          id,
          desc: order === 'desc',
        }
      })
    }

    // Parse filters from URL
    const allParams = Array.from(searchParams.entries())
    const filterParams = new Map<string, any>()

    allParams.forEach(([key, value]) => {
      const arrayMatch = key.match(/^(.+?)\[(\d+)\]$/)
      const objectMatch = key.match(/(\w+)\[(\w+)\]/)

      if (arrayMatch) {
        const [_, arrayKey, index] = arrayMatch
        if (!filterParams.has(arrayKey)) {
          filterParams.set(arrayKey, [])
        }
        const arr = filterParams.get(arrayKey)
        arr[parseInt(index)] = parseValue(value)
        filterParams.set(arrayKey, arr)
      } else if (objectMatch) {
        const [_, objectKey, objectSubKey] = objectMatch
        if (!filterParams.has(objectKey)) {
          filterParams.set(objectKey, {})
        }
        const obj = filterParams.get(objectKey)
        obj[objectSubKey] = parseValue(value)
        filterParams.set(objectKey, obj)
      } else if (!['page', 'pageSize', 'sort', 'search'].includes(key)) {
        filterParams.set(key, parseValue(value))
      }
    })

    const filters =
      filterParams.size > 0
        ? { ...(initialState.filters || {}), ...Object.fromEntries(filterParams) }
        : initialState.filters || {}

    return { pagination, search, sorting, filters }
  }

  const initial = getInitialState()

  // Split state into separate pieces
  const [pagination, setPaginationState] = useState<PaginationState>(initial.pagination)

  const [search, setSearchState] = useState(initial.search)

  const [sorting, setSortingState] = useState<SortingState>(initial.sorting)

  const [filters, setFiltersState] = useState<
    Record<string, string | number | boolean | string[] | number[] | boolean[]>
  >(initial.filters)

  // Update URL and maintain synchronization

  const updateURL = useCallback(() => {
    if (!useUrlParams) return

    const params = new URLSearchParams()

    // Add pagination only if different from initial state
    const initPagination = initialState.pagination || defaultPagination
    if (pagination.pageIndex !== initPagination.pageIndex) {
      params.set('page', pagination.pageIndex.toString())
    }

    if (pagination.pageSize !== initPagination.pageSize) {
      params.set('pageSize', pagination.pageSize.toString())
    }

    // Add search only if different from initial state

    const initSearch = initialState.search || ''
    if (search !== initSearch) {
      params.set('search', search)
    }

    // Add sorting only if different from initial state

    const initSorting = initialState.sorting || []
    const sortingChanged = JSON.stringify(sorting) !== JSON.stringify(initSorting)
    if (sortingChanged && sorting.length > 0) {
      const sortParams = sorting

        .map((sort) => `${sort.id}:${sort.desc ? 'desc' : 'asc'}`)

        .join(',')

      params.set('sort', sortParams)
    }

    // Add filters only if different from initial state

    const initFilters = initialState.filters || {}
    Object.entries(filters).forEach(([key, value]) => {
      const initValue = initFilters[key]
      const hasChanged = JSON.stringify(value) !== JSON.stringify(initValue)

      if (hasChanged && value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          value.forEach((item, index) => {
            params.append(`${key}[${index}]`, item.toString())
          })
        } else if (typeof value === 'object') {
          for (const [k, v] of Object.entries(value)) {
            params.append(`${key}[${k}]`, `${v}`)
          }
        } else {
          params.set(key, value.toString())
        }
      }
    })

    // Update URL without refreshing the page
    const current = new URLSearchParams(window.location.search).toString()
    const next = params.toString()
    if (current !== next) {
      router.push(`${pathname}?${params.toString()}`, { scroll: false })
    }
  }, [router, pathname, pagination, search, sorting, filters, initialState, useUrlParams])

  // Mark that initial mount is complete
  useEffect(() => {
    isInitialMount.current = false
  }, [])

  // Update URL whenever any state changes

  useEffect(() => {
    if (didInitRef.current) {
      updateURL()
    } else {
      didInitRef.current = true
    }
  }, [updateURL])

  // Pagination handlers

  const setPagination = useCallback(
    (newPagination: Partial<PaginationState>) => {
      setPaginationState((prev) => {
        const updated = { ...prev, ...newPagination }

        if (JSON.stringify(updated) === JSON.stringify(prev)) return prev

        return updated
      })
    },

    []
  )

  // Search handlers

  const setSearch = useCallback((newSearch: string) => {
    setSearchState(newSearch)

    setPaginationState((prev) => ({ ...prev, pageIndex: 0 }))
  }, [])

  // Sorting handlers

  const setSorting = useCallback(
    (sortBy: string, sortOrder: 'asc' | 'desc') => {
      setSortingState((prev) => {
        // Find if the column is already being sorted

        const existingIndex = prev.findIndex((sort) => sort.id === sortBy)

        if (existingIndex !== -1) {
          // Update existing sort

          const newSort = [...prev]

          newSort[existingIndex] = { id: sortBy, desc: sortOrder === 'desc' }

          return newSort
        } else {
          // Add new sort

          return [...prev, { id: sortBy, desc: sortOrder === 'desc' }]
        }
      })

      setPaginationState((prev) => ({ ...prev, pageIndex: 0 }))
    },

    []
  )

  const removeSorting = useCallback((sortBy: string) => {
    setSortingState((prev) => prev.filter((sort) => sort.id !== sortBy))

    setPaginationState((prev) => ({ ...prev, pageIndex: 0 }))
  }, [])

  // Filter handlers

  const setAllFilters = useCallback(
    (newFilters: Record<string, string | number | boolean | string[] | number[] | boolean[]>) => {
      setFiltersState(newFilters)

      setPaginationState((prev) => ({ ...prev, pageIndex: 0 }))
    },

    []
  )

  const setFilter = useCallback(
    (key: string, value: string | number | boolean | null | string[] | number[] | boolean[]) => {
      setFiltersState((prev) => {
        const newFilters = { ...prev }

        if (value === null) {
          delete newFilters[key]
        } else {
          newFilters[key] = value
        }

        return newFilters
      })

      setPaginationState((prev) => ({ ...prev, pageIndex: 0 }))
    },

    []
  )

  const removeFilter = useCallback((key: string) => {
    setFiltersState((prev) => {
      const newFilters = { ...prev }

      delete newFilters[key]

      return newFilters
    })

    setPaginationState((prev) => ({ ...prev, pageIndex: 0 }))
  }, [])

  // Reset all states

  const resetFilters = useCallback(() => {
    setPaginationState(defaultPagination)

    setSearchState('')

    setSortingState([])

    setFiltersState({})
  }, [])

  return {
    // States

    pagination,

    search,

    sorting,

    filters,

    // Handlers

    setPagination: setPaginationState,

    setSearch,

    setSorting: setSortingState,

    setFilter,

    setAllFilters,

    removeFilter,

    removeSorting,

    resetFilters,
  }
}
