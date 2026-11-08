import React from "react";

export interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (row: T) => React.ReactNode;
  align?: "left" | "center" | "right";
  className?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
}

export default function DataTable<T extends { id?: string | number }>({
  columns,
  data,
  onRowClick,
  emptyMessage = "No records found.",
}: DataTableProps<T>) {
  return (
    <div className="w-full overflow-x-auto rounded-card border border-border-subtle bg-surface shadow-soft">
      <table className="w-full text-left border-collapse text-sm">
        <thead>
          <tr className="bg-surface-subtle border-b border-border-subtle text-content-secondary font-medium text-xs uppercase tracking-wider">
            {columns.map((col, idx) => (
              <th
                key={idx}
                className={`px-4 py-3 ${
                  col.align === "right"
                    ? "text-right"
                    : col.align === "center"
                    ? "text-center"
                    : "text-left"
                } ${col.className || ""}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-6 py-8 text-center text-sm text-content-muted"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIdx) => (
              <tr
                key={row.id || rowIdx}
                onClick={() => onRowClick && onRowClick(row)}
                className={`transition-colors ${
                  onRowClick ? "cursor-pointer hover:bg-cream-100" : ""
                }`}
              >
                {columns.map((col, colIdx) => {
                  const content = col.cell
                    ? col.cell(row)
                    : col.accessorKey
                    ? (row[col.accessorKey] as unknown as React.ReactNode)
                    : null;

                  return (
                    <td
                      key={colIdx}
                      className={`px-4 py-3.5 text-content-primary ${
                        col.align === "right"
                          ? "text-right"
                          : col.align === "center"
                          ? "text-center"
                          : "text-left"
                      } ${col.className || ""}`}
                    >
                      {content}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

