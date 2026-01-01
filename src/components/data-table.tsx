"use client"

import React, { useEffect, useMemo, useState } from "react"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  PaginationState,
  SortingState,
} from "@tanstack/react-table"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ArrowUpDown } from "lucide-react"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

/** ---------- Helpers ---------- **/

// Pre-format all Date fields in data
function formatDates<T extends Record<string, any>>(data: T[]): T[] {
  return data.map(item => {
    const newItem: Record<string, any> = { ...item }
    for (const key in newItem) {
      if (newItem[key] instanceof Date) {
        newItem[key] = newItem[key].toISOString().slice(0, 19).replace("T", " ")
      } else if (typeof newItem[key] === "string" && !isNaN(Date.parse(newItem[key]))) {
        newItem[key] = new Date(newItem[key]).toISOString().slice(0, 19).replace("T", " ")
      }
    }
    return newItem as T
  })
}

// Simple debounce hook (no external dependency)
function useDebounce<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])

  return debounced
}

/** ---------- Props ---------- **/

interface DataTableProps<TData extends Record<string, any>, TValue = unknown> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  onRowClick?: (row: TData) => void
  initialPageSize?: number

  // server-side control
  serverSide?: boolean
  totalCount?: number // required if serverSide=true
  page?: number // 0-based page index from parent (optional controlled)
  pageSize?: number // pageSize from parent
  onPageChange?: (pageIndex: number) => void
  onPageSizeChange?: (size: number) => void
  onFilterChange?: (globalFilter: string) => void
  onSortChange?: (sorting: SortingState) => void

  // URL sync (optional)
  syncWithUrl?: boolean

  // optional row actions renderer
  rowActions?: (row: TData) => React.ReactNode
}

/** ---------- Component ---------- **/

export function DataTable<TData extends Record<string, any>, TValue = unknown>({
  columns,
  data,
  onRowClick,
  initialPageSize = 10,
  serverSide = false,
  totalCount = 0,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onFilterChange,
  onSortChange,
  syncWithUrl = false,
  rowActions,
}: DataTableProps<TData, TValue>) {
  // Local states (used for client-side and for controlled inputs)
  const [localSorting, setLocalSorting] = useState<SortingState>([])
  const [localPagination, setLocalPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: initialPageSize,
  })
  const [globalFilter, setGlobalFilter] = useState<string>("")

  // URL sync (Next.js navigation)
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()

  // Use parent's controlled page/pageSize if provided
  useEffect(() => {
    if (typeof page === "number") {
      setLocalPagination((s) => ({ ...s, pageIndex: page }))
    }
  }, [page])

  useEffect(() => {
    if (typeof pageSize === "number") {
      setLocalPagination((s) => ({ ...s, pageSize }))
    }
  }, [pageSize])

  // Sync with URL if requested
  useEffect(() => {
    if (!syncWithUrl) return
    // initialize from URL on mount
    const q = searchParams?.get("q") ?? ""
    const p = searchParams?.get("page")
    const ps = searchParams?.get("pageSize")
    const sort = searchParams?.get("sort") // e.g. "col:asc" or "col:desc"

    if (q !== globalFilter) setGlobalFilter(q)
    if (p && !isNaN(Number(p))) {
      setLocalPagination((s) => ({ ...s, pageIndex: Math.max(0, Number(p) - 1) }))
    }
    if (ps && !isNaN(Number(ps))) {
      setLocalPagination((s) => ({ ...s, pageSize: Math.max(1, Number(ps)) }))
    }
    if (sort) {
      const [col, dir] = sort.split(":")
      if (col && (dir === "asc" || dir === "desc")) {
        setLocalSorting([{ id: col, desc: dir === "desc" } as any])
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // run once on mount

  // write to URL when state changes (debounced to avoid spam)
  useEffect(() => {
    if (!syncWithUrl) return
    const params = new URLSearchParams(Array.from(searchParams.entries()))
    if (globalFilter) params.set("q", globalFilter)
    else params.delete("q")

    params.set("page", String(localPagination.pageIndex + 1))
    params.set("pageSize", String(localPagination.pageSize))

    const sort = localSorting[0]
    if (sort) {
      const dir = sort.desc ? "desc" : "asc"
      params.set("sort", `${String(sort.id)}:${dir}`)
    } else {
      params.delete("sort")
    }

    const url = `${pathname}?${params.toString()}`
    // replace keeps history clean for interactive changes
    router.replace(url)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalFilter, localPagination.pageIndex, localPagination.pageSize, localSorting, syncWithUrl])

  // Pre-format dates
  const safeData = useMemo(() => formatDates(data), [data])

  // Debounced filter value for sending to server or for letting table process
  const debouncedFilter = useDebounce(globalFilter, 300)

  // Table instance config
  const table = useReactTable({
    data: safeData,
    columns: useMemo(() => {
      // if rowActions provided, append an actions column at the end
      if (!rowActions) return columns
      const actionsCol: ColumnDef<TData, any> = {
        id: "__actions",
        header: "Actions",
        cell: ({ row }) => <div className="flex items-center space-x-2">{rowActions(row.original)}</div>,
        enableSorting: false,
        meta: { width: 150 },
      }
      return [...columns, actionsCol]
    }, [columns, rowActions]),
    state: {
      sorting: localSorting,
      pagination: localPagination,
      globalFilter: debouncedFilter,
    },
    onSortingChange: (updater) => {
      // updater can be a SortingState or an updater function (old => new)
      setLocalSorting((old) => {
        const next =
          typeof updater === "function"
            ? (updater as (old: SortingState) => SortingState)(old)
            : updater

        if (onSortChange) onSortChange(next)
        return next
      })
    },
    onPaginationChange: (updater) => {
      // updater can be a PaginationState or an updater function (old => new)
      setLocalPagination((old) => {
        const next =
          typeof updater === "function"
            ? (updater as (old: PaginationState) => PaginationState)(old)
            : updater

        // push upward only when serverSide is true (controlled)
        if (serverSide && onPageChange) {
          onPageChange(next.pageIndex)
        }
        if (serverSide && onPageSizeChange) {
          onPageSizeChange(next.pageSize)
        }

        return next
      })
    },
    onGlobalFilterChange: (val) => {
      setGlobalFilter(String(val ?? ""))
      if (onFilterChange) onFilterChange(String(val ?? ""))
    },
    getCoreRowModel: getCoreRowModel(),
    // conditional models: client-side filtering/sorting/pagination only when not serverSide
    ...(serverSide
      ? {
          manualPagination: true,
          pageCount: Math.max(0, Math.ceil((totalCount ?? 0) / (localPagination.pageSize || 1))),
        }
      : {
          getFilteredRowModel: getFilteredRowModel(),
          getSortedRowModel: getSortedRowModel(),
          getPaginationRowModel: getPaginationRowModel(),
        }),
  })

  // derived values
  const rows = table.getRowModel().rows
  const pageCount = serverSide
    ? Math.max(1, Math.ceil((totalCount ?? 0) / (localPagination.pageSize || 1)))
    : table.getPageCount()
  const pageIndex = table.getState().pagination.pageIndex
  const pageSizeState = table.getState().pagination.pageSize

  // Helpers for safe page changes in serverSide mode if parent didn't control page
  const safeSetPageIndex = (newIndex: number) => {
    const clamped = Math.max(0, Math.min(newIndex, pageCount - 1))
    if (serverSide) {
      // if parent provided onPageChange, call it; otherwise update local state
      if (onPageChange) onPageChange(clamped)
      else setLocalPagination((s) => ({ ...s, pageIndex: clamped }))
    } else {
      table.setPageIndex(clamped)
    }
  }

  const safeSetPageSize = (newSize: number) => {
    const sanitized = Math.max(1, newSize)
    if (serverSide) {
      if (onPageSizeChange) onPageSizeChange(sanitized)
      else setLocalPagination((s) => ({ ...s, pageSize: sanitized, pageIndex: 0 }))
    } else {
      table.setPageSize(sanitized)
    }
  }

  // Debounced input state (uncontrolled input uses globalFilter -> debouncedFilter)
  const [searchInput, setSearchInput] = useState(globalFilter)
  useEffect(() => setSearchInput(globalFilter), [globalFilter])

  useEffect(() => {
    // when debouncedFilter updates (after debounce), call filter callback if serverSide
    if (serverSide && onFilterChange) {
      onFilterChange(debouncedFilter)
    }
    // Update the table's internal global filter (so client-side filtering will react)
    table.setGlobalFilter(debouncedFilter)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedFilter])

  // update sort callback to notify parent when sorting changes (serverSide)
  useEffect(() => {
    if (serverSide && onSortChange) {
      onSortChange(localSorting)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localSorting])

  return (
    <div className="overflow-hidden rounded-lg border bg-background">
      {/* Global Search / Filters */}
      <div className="p-4 border-b">
        <input
          type="text"
          placeholder="Search all columns..."
          value={searchInput ?? ""}
          onChange={(e) => {
            setSearchInput(e.target.value)
            setGlobalFilter(e.target.value)
          }}
          className="w-full border rounded p-2 text-sm"
        />
      </div>

      {/* Table */}
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {!header.isPlaceholder && (
                    <div
                      className={
                        header.column.getCanSort()
                          ? "flex items-center space-x-1 cursor-pointer select-none"
                          : ""
                      }
                      onClick={
                        header.column.getCanSort()
                          ? header.column.getToggleSortingHandler()
                          : undefined
                      }
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        <ArrowUpDown
                          className={`h-4 w-4 transition-transform ${
                            header.column.getIsSorted()
                              ? header.column.getIsSorted() === "asc"
                                ? "rotate-180 text-primary"
                                : "text-primary"
                              : "text-muted-foreground"
                          }`}
                        />
                      )}
                    </div>
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>

        <TableBody>
          {rows.length > 0 ? (
            rows.map((row) => (
              <TableRow
                key={row.id}
                onClick={() => onRowClick?.(row.original)}
                className="cursor-pointer transition-colors hover:bg-muted/50"
                data-state={row.getIsSelected() ? "selected" : undefined}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="p-4 text-sm">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length + (rowActions ? 1 : 0)} className="h-24 text-center text-muted-foreground">
                <div className="flex flex-col items-center justify-center space-y-2">
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="opacity-40"
                  >
                    <path d="M3 6h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M8 6v12a2 2 0 002 2h4a2 2 0 002-2V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <div className="text-sm">No results found.</div>
                  <div className="text-xs text-muted-foreground">Try clearing filters or changing search terms.</div>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Pagination Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-t">
        {/* First / Prev */}
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => safeSetPageIndex(0)}
            disabled={pageIndex === 0}
          >
            {"⏮ First"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => safeSetPageIndex(pageIndex - 1)}
            disabled={pageIndex === 0}
          >
            Previous
          </Button>
        </div>

        {/* Page Info + Jump to Page */}
        <div className="flex items-center space-x-2">
          <span className="text-sm">
            Page {pageIndex + 1} of {pageCount}
          </span>
          <input
            type="number"
            min={1}
            max={pageCount}
            value={pageIndex + 1}
            onChange={(e) => {
              const value = e.target.value ? Number(e.target.value) - 1 : 0
              safeSetPageIndex(Math.min(Math.max(value, 0), pageCount - 1))
            }}
            className="w-16 border rounded p-1 text-sm"
          />
        </div>

        {/* Next / Last */}
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => safeSetPageIndex(pageIndex + 1)}
            disabled={pageIndex >= pageCount - 1}
          >
            Next
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => safeSetPageIndex(pageCount - 1)}
            disabled={pageIndex >= pageCount - 1}
          >
            {"⏭ Last"}
          </Button>
        </div>

        {/* Page Size Selector */}
        <select
          className="border rounded p-1 text-sm"
          value={pageSizeState}
          onChange={(e) => safeSetPageSize(Number(e.target.value))}
        >
          {[10, 25, 50, 100].map((size) => (
            <option key={size} value={size}>
              {size} / page
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
