'use client';

import { useMemo } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Columns3,
  Download,
  ExternalLink,
  FileText,
  Film,
  Image as ImageIcon,
  Images,
  Link as LinkIcon,
  Search,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  columnFilteringFeature,
  columnVisibilityFeature,
  createColumnHelper,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFn_equalsString,
  filterFn_includesString,
  globalFilteringFeature,
  metaHelper,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_basic,
  tableFeatures,
  useTable,
} from '@tanstack/react-table';
import { cn } from '@/lib/utils';
import { formatCompact, formatNumber } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlatformBadge, type BadgePlatform } from '@/components/dashboard/platform-badge';

const PAGE_SIZE = 20;
const MISSING = '-';

const TYPE_ORDER = ['image', 'video', 'carousel', 'reel', 'link', 'text', 'other'] as const;

const TYPE_ICON: Record<string, LucideIcon> = {
  image: ImageIcon,
  video: Film,
  reel: Film,
  carousel: Images,
  link: LinkIcon,
  text: FileText,
};

export interface PostsTableRow {
  id: string;
  platform: BadgePlatform;
  content: string | null;
  contentType: string | null;
  permalink: string | null;
  thumbnailUrl: string | null;
  /** Already formatted in APP_TIMEZONE, e.g. "Oct 1, 2026". */
  publishedAt: string;
  reactions: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  reach: number | null;
  views: number | null;
  engagement: number | null;
}

type MetricKey = 'reactions' | 'comments' | 'shares' | 'saves' | 'reach' | 'views' | 'engagement';

interface ColumnMeta {
  label: string;
  numeric?: boolean;
  /** Thumbnail has nothing useful to put in a spreadsheet. */
  csv?: boolean;
}

interface SortableColumn {
  getIsSorted: () => false | 'asc' | 'desc';
  getToggleSortingHandler: () => ((event: unknown) => void) | undefined;
}

const features = tableFeatures({
  columnMeta: metaHelper<ColumnMeta>(),
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { basic: sortFn_basic },
  columnFilteringFeature,
  globalFilteringFeature,
  filteredRowModel: createFilteredRowModel(),
  filterFns: { includesString: filterFn_includesString, equalsString: filterFn_equalsString },
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
  columnVisibilityFeature,
});

const helper = createColumnHelper<typeof features, PostsTableRow>();

const METRICS: ReadonlyArray<readonly [MetricKey, string]> = [
  ['reactions', 'Likes/Reactions'],
  ['comments', 'Comments'],
  ['shares', 'Shares'],
  ['saves', 'Saves'],
  ['reach', 'Reach'],
  ['views', 'Views'],
  ['engagement', 'Engagement'],
];

function missingLast(value: number | null): number | undefined {
  return value === null ? undefined : value;
}

function typeLabel(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function truncateContent(text: string, max = 80): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max).trimEnd()}…`;
}

function SortableHeader({
  column,
  label,
  align = 'left',
}: {
  column: SortableColumn;
  label: string;
  align?: 'left' | 'right';
}) {
  const sorted = column.getIsSorted();
  const Icon = sorted === 'asc' ? ArrowUp : sorted === 'desc' ? ArrowDown : ArrowUpDown;
  return (
    <button
      type="button"
      onClick={column.getToggleSortingHandler()}
      className={cn(
        'flex w-full min-w-0 items-start gap-1 rounded-sm text-left font-medium leading-tight hover:text-foreground',
        align === 'right' && 'justify-end text-right',
      )}
    >
      <span className="min-w-0 whitespace-normal">{label.replaceAll('/', '/\u200b')}</span>
      <Icon className={cn('mt-0.5 size-3 shrink-0', sorted ? 'text-foreground' : 'opacity-40')} aria-hidden />
    </button>
  );
}

function Thumbnail({ post }: { post: PostsTableRow }) {
  const Icon = TYPE_ICON[post.contentType ?? ''] ?? FileText;
  if (!post.thumbnailUrl) {
    return (
      <span className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground" aria-hidden>
        <Icon className="size-3.5" />
      </span>
    );
  }
  return (
    // Meta CDN hostnames rotate, so a plain <img> avoids a remotePatterns allow-list.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={post.thumbnailUrl}
      alt=""
      width={32}
      height={32}
      loading="lazy"
      referrerPolicy="no-referrer"
      className="size-8 rounded-md bg-muted object-cover"
    />
  );
}

function ContentCell({ post }: { post: PostsTableRow }) {
  const full = post.content?.replace(/\s+/g, ' ').trim() ?? '';
  const label = full ? truncateContent(full) : '(no caption)';
  if (!post.permalink) {
    return (
      <span className="block truncate" title={full || undefined}>
        {label}
      </span>
    );
  }
  return (
    <a
      href={post.permalink}
      target="_blank"
      rel="noopener noreferrer"
      title={full || post.permalink}
      className="flex min-w-0 items-center gap-1 text-foreground underline-offset-2 hover:underline"
    >
      <span className="truncate">{label}</span>
      <ExternalLink className="size-3 shrink-0 text-muted-foreground" aria-hidden />
    </a>
  );
}

function TypeBadge({ type }: { type: string | null }) {
  if (!type) return <span className="text-muted-foreground">{MISSING}</span>;
  return (
    <Badge variant="outline" className="px-1.5 text-[0.6875rem] capitalize">
      {typeLabel(type)}
    </Badge>
  );
}

function Metric({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">{MISSING}</span>;
  }
  return (
    <span className="tabular-nums" title={formatNumber(value)}>
      {formatCompact(value)}
    </span>
  );
}

/** Fixed tracks so every column stays inside the card. Content takes whatever width is left. */
const COLUMN_WIDTH: Record<string, string> = {
  thumbnail: 'w-[4.5rem]',
  platform: 'w-[4.25rem]',
  contentType: 'w-[4.25rem]',
  publishedAt: 'w-[5.5rem]',
  reactions: 'w-[5rem]',
  comments: 'w-[4.75rem]',
  shares: 'w-[3.5rem]',
  saves: 'w-12',
  reach: 'w-[3.5rem]',
  views: 'w-12',
  engagement: 'w-[5.75rem]',
};

const columns = helper.columns([
  helper.display({
    id: 'thumbnail',
    header: 'Thumbnail',
    enableSorting: false,
    cell: ({ row }) => <Thumbnail post={row.original} />,
    meta: { label: 'Thumbnail', csv: false },
  }),
  helper.accessor('platform', {
    header: 'Platform',
    enableSorting: false,
    enableGlobalFilter: false,
    cell: ({ getValue }) => <PlatformBadge platform={getValue()} size="sm" />,
    meta: { label: 'Platform' },
  }),
  helper.accessor('content', {
    header: 'Content',
    enableSorting: false,
    enableHiding: false,
    cell: ({ row }) => <ContentCell post={row.original} />,
    meta: { label: 'Content' },
  }),
  helper.accessor('contentType', {
    header: 'Type',
    enableSorting: false,
    enableGlobalFilter: false,
    filterFn: 'equalsString',
    cell: ({ getValue }) => <TypeBadge type={getValue()} />,
    meta: { label: 'Type' },
  }),
  helper.accessor('publishedAt', {
    header: 'Date',
    enableSorting: false,
    enableGlobalFilter: false,
    meta: { label: 'Date' },
  }),
  ...METRICS.map(([id, label]) =>
    helper.accessor((row) => missingLast(row[id]), {
      id,
      header: ({ column }) => <SortableHeader column={column} label={label} align="right" />,
      cell: ({ getValue }) => <Metric value={getValue()} />,
      enableSorting: true,
      sortFn: 'basic',
      sortUndefined: 'last',
      sortDescFirst: true,
      enableGlobalFilter: false,
      meta: { label, numeric: true },
    }),
  ),
]);

function csvEscape(value: string): string {
  const guarded = /^[=+\-@]/.test(value) ? `'${value}` : value;
  if (/[",\n\r]/.test(guarded)) return `"${guarded.replace(/"/g, '""')}"`;
  return guarded;
}

function csvCell(post: PostsTableRow, columnId: string): string {
  switch (columnId) {
    case 'platform':
      return post.platform;
    case 'content':
      return post.content?.replace(/\s+/g, ' ').trim() ?? '';
    case 'contentType':
      return post.contentType ?? '';
    case 'publishedAt':
      return post.publishedAt;
    case 'reactions':
    case 'comments':
    case 'shares':
    case 'saves':
    case 'reach':
    case 'views':
    case 'engagement': {
      const value = post[columnId];
      return value === null ? '' : String(value);
    }
    default:
      return '';
  }
}

function downloadCsv(filename: string, body: string) {
  const blob = new Blob([`\uFEFF${body}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function PostsTable({ posts }: { posts: PostsTableRow[] }) {
  const table = useTable({
    features,
    columns,
    data: posts,
    getRowId: (row) => row.id,
    initialState: {
      sorting: [{ id: 'engagement', desc: true }],
      pagination: { pageIndex: 0, pageSize: PAGE_SIZE },
    },
    enableSortingRemoval: false,
    enableMultiSort: false,
    globalFilterFn: 'includesString',
    getColumnCanGlobalFilter: (column) => column.id === 'content',
    defaultColumn: { enableSorting: false },
  });

  const typeItems = useMemo(() => {
    const present = new Set<string>();
    for (const post of posts) {
      if (post.contentType) present.add(post.contentType);
    }
    const ordered = TYPE_ORDER.filter((type) => present.has(type));
    for (const type of present) {
      if (!ordered.includes(type as (typeof TYPE_ORDER)[number])) ordered.push(type as (typeof TYPE_ORDER)[number]);
    }
    return [{ value: 'all', label: 'All types' }, ...ordered.map((type) => ({ value: type, label: typeLabel(type) }))];
  }, [posts]);

  const search = typeof table.state.globalFilter === 'string' ? table.state.globalFilter : '';
  const typeFilter = table.state.columnFilters.find((filter) => filter.id === 'contentType');
  const typeValue = typeof typeFilter?.value === 'string' && typeFilter.value ? typeFilter.value : 'all';

  const filteredCount = table.getRowCount();
  const { pageIndex, pageSize } = table.state.pagination;
  const pageCount = table.getPageCount();
  const start = filteredCount === 0 ? 0 : pageIndex * pageSize + 1;
  const end = Math.min(filteredCount, (pageIndex + 1) * pageSize);
  const summary =
    filteredCount === posts.length
      ? `${filteredCount} post${filteredCount === 1 ? '' : 's'}`
      : `${filteredCount} of ${posts.length} posts`;

  function exportCsv() {
    const visible = table.getVisibleLeafColumns().filter((column) => column.columnDef.meta?.csv !== false);
    const header = [...visible.map((column) => column.columnDef.meta?.label ?? column.id), 'Permalink'];
    const body = table.getPrePaginatedRowModel().rows.map((row) => {
      const post = row.original;
      return [...visible.map((column) => csvCell(post, column.id)), post.permalink ?? ''];
    });
    const csv = [header, ...body].map((line) => line.map(csvEscape).join(',')).join('\r\n');
    downloadCsv('posts.csv', csv);
  }

  const headerGroup = table.getHeaderGroups()[0];
  const rows = table.getRowModel().rows;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-0 sm:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={search}
            onChange={(event) => table.setGlobalFilter(event.target.value)}
            placeholder="Search content"
            aria-label="Search content"
            className="pl-8"
          />
        </div>
        <Select
          items={typeItems}
          value={typeValue}
          onValueChange={(value) => {
            table.getColumn('contentType')?.setFilterValue(!value || value === 'all' ? undefined : value);
          }}
        >
          <SelectTrigger size="sm" aria-label="Content type" className="w-full bg-background sm:w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start">
            {typeItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 sm:ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              <Columns3 />
              Columns
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Show columns</DropdownMenuLabel>
                {table.getAllLeafColumns().map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    disabled={!column.getCanHide()}
                    onCheckedChange={(checked) => column.toggleVisibility(checked)}
                  >
                    {column.columnDef.meta?.label ?? column.id}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={exportCsv}
            disabled={filteredCount === 0}
            title="Download every row matching the current search and type filter"
          >
            <Download />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <table className="w-full table-fixed border-separate border-spacing-0 text-[0.8125rem]">
          <caption className="sr-only">Posts, sorted by engagement, {PAGE_SIZE} per page</caption>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id} className="hover:bg-transparent">
                {group.headers.map((header) => {
                  const numeric = header.column.columnDef.meta?.numeric;
                  const sorted = header.column.getCanSort() ? header.column.getIsSorted() : false;
                  return (
                    <TableHead
                      key={header.id}
                      scope="col"
                      aria-sort={
                        sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : header.column.getCanSort() ? 'none' : undefined
                      }
                      className={cn(
                        'h-auto overflow-hidden border-b bg-muted/50 px-1.5 py-2 align-bottom text-[0.6875rem] leading-tight whitespace-normal text-muted-foreground',
                        COLUMN_WIDTH[header.column.id],
                        numeric && 'text-right',
                        header.column.id === 'content' && 'max-w-0',
                      )}
                    >
                      {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody className="[&_tr:last-child_td]:border-b-0">
            {rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={headerGroup?.headers.length ?? 1} className="h-24 text-center text-muted-foreground">
                  No posts match this search or type.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        'overflow-hidden border-b px-1.5 py-2',
                        COLUMN_WIDTH[cell.column.id],
                        cell.column.columnDef.meta?.numeric && 'text-right text-xs',
                        cell.column.id === 'content' && 'max-w-0 whitespace-normal',
                        cell.column.id === 'publishedAt' && 'text-xs whitespace-nowrap',
                      )}
                    >
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </table>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {filteredCount === 0
            ? 'No posts in this period'
            : `Showing ${start}–${end} of ${filteredCount} posts`}
          {pageCount <= 1 && filteredCount > 0 ? '. All of them are on this page.' : null}
          <span className="sr-only">. {summary}</span>
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <span className="min-w-24 text-center text-xs tabular-nums text-muted-foreground">
            Page {filteredCount === 0 ? 0 : pageIndex + 1} of {Math.max(pageCount, filteredCount === 0 ? 0 : 1)}
          </span>
          <Button type="button" variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
