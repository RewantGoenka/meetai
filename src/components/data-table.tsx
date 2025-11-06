"use client"

import { useState } from "react"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  PaginationState,
  SortingState,
} from "@tanstack/react-table"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ArrowUpDown } from "lucide-react"

interface DataTableProps<TData extends Record<string, any>, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  onRowClick?: (row: TData) => void
  initialPageSize?: number
}

// pre-format all Date fields in data
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

export function DataTable<TData extends Record<string, any>, TValue>({
  columns,
  data,
  onRowClick,
  initialPageSize = 10,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: initialPageSize,
  })
  const [globalFilter, setGlobalFilter] = useState("")

  //Pre-format all dates in the data before passing to table
  const safeData = formatDates(data)

  const table = useReactTable({
    data: safeData,
    columns,
    state: { sorting, pagination, globalFilter },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const rows = table.getRowModel().rows
  const pageCount = table.getPageCount()
  const pageIndex = table.getState().pagination.pageIndex
  const pageSize = table.getState().pagination.pageSize

  return (
    <div className="overflow-hidden rounded-lg border bg-background">
      {/* Global Search */}
      <div className="p-4 border-b">
        <input
          type="text"
          placeholder="Search all columns..."
          value={globalFilter ?? ""}
          onChange={(e) => setGlobalFilter(e.target.value)}
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
              <TableCell
                colSpan={columns.length}
                className="h-24 text-center text-muted-foreground"
              >
                No results found.
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
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            {"⏮ First"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
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
              const page = e.target.value ? Number(e.target.value) - 1 : 0
              table.setPageIndex(Math.min(Math.max(page, 0), pageCount - 1))
            }}
            className="w-16 border rounded p-1 text-sm"
          />
        </div>

        {/* Next / Last */}
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.setPageIndex(pageCount - 1)}
            disabled={!table.getCanNextPage()}
          >
            {"⏭ Last"}
          </Button>
        </div>

        {/* Page Size Selector */}
        <select
          className="border rounded p-1 text-sm"
          value={pageSize}
          onChange={(e) => table.setPageSize(Number(e.target.value))}
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
