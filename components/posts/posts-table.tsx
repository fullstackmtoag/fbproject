'use client';

import { createContext, useContext, useMemo, useState } from 'react';
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
  Rows2,
  Rows3,
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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/shared/empty-state';
import { PlatformLogo, type LogoPlatform } from '@/components/shared/platform-logo';
import { SectionCard } from '@/components/shared/section-card';
import { TypePill } from '@/components/shared/type-pill';
import { PostDrawer } from './post-drawer';

const PAGE_SIZE = 20;

const TYPE_ORDER = ['image', 'video', 'carousel', 'reel', 'link', 'text', 'other'] as const;

const TYPE_ICON: Record<string, LucideIcon> = {
  image: ImageIcon,
  video: Film,
  reel: Film,
  carousel: Images,
  link: LinkIcon,
  text: FileText,
};

const PLATFORMS: LogoPlatform[] = ['facebook', 'instagram'];

export interface PostsTableRow {
  id: string;
  platform: LogoPlatform;
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
type Density = 'comfortable' | 'compact';

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

const EngagementMaxContext = createContext(0);

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

const controlClass =
  'inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-[10px] border border-border bg-card px-3 text-sm font-medium text-foreground transition-colors outline-none hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50';

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

function Dash() {
  return <span className="text-muted-foreground">—</span>;
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
        'flex w-full min-w-0 items-start gap-1 rounded-sm text-left text-xs font-medium text-muted-foreground hover:text-foreground',
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

function Metric({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) return <Dash />;
  return (
    <span className="tabular-nums" title={formatNumber(value)}>
      {formatCompact(value)}
    </span>
  );
}

function EngagementCell({ value, platform }: { value: number | null | undefined; platform: LogoPlatform }) {
  const max = useContext(EngagementMaxContext);
  if (value === null || value === undefined) return <Dash />;
  const width = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <span className="inline-flex w-full min-w-0 flex-col items-end gap-1">
      <span className="tabular-nums" title={formatNumber(value)}>
        {formatCompact(value)}
      </span>
      <span className="h-0.5 w-full overflow-hidden rounded-full bg-border" aria-hidden>
        <span
          className={cn(
            'block h-full rounded-full',
            platform === 'facebook' ? 'bg-facebook' : 'bg-instagram-gradient',
          )}
          style={{ width: `${width}%` }}
        />
      </span>
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
    filterFn: 'equalsString',
    cell: ({ getValue }) => (
      <span className="flex justify-center">
        <PlatformLogo platform={getValue()} />
      </span>
    ),
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
    cell: ({ getValue }) => <TypePill type={getValue()} />,
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
      cell: ({ row, getValue }) =>
        id === 'engagement' ? (
          <EngagementCell value={getValue()} platform={row.original.platform} />
        ) : (
          <Metric value={getValue()} />
        ),
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
  const [density, setDensity] = useState<Density>('comfortable');
  const [selected, setSelected] = useState<PostsTableRow | null>(null);

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
    return ordered;
  }, [posts]);

  const search = typeof table.state.globalFilter === 'string' ? table.state.globalFilter : '';
  const typeFilter = table.state.columnFilters.find((filter) => filter.id === 'contentType');
  const typeValue = typeof typeFilter?.value === 'string' && typeFilter.value ? typeFilter.value : 'all';
  const platformFilter = table.state.columnFilters.find((filter) => filter.id === 'platform');
  const platformValue =
    typeof platformFilter?.value === 'string' && platformFilter.value ? platformFilter.value : 'all';

  const filteredCount = table.getRowCount();
  const { pageIndex, pageSize } = table.state.pagination;
  const pageCount = table.getPageCount();
  const start = filteredCount === 0 ? 0 : pageIndex * pageSize + 1;
  const end = Math.min(filteredCount, (pageIndex + 1) * pageSize);
  const summary =
    filteredCount === posts.length
      ? `${filteredCount} post${filteredCount === 1 ? '' : 's'}`
      : `${filteredCount} of ${posts.length} posts`;

  let maxEngagement = 0;
  for (const row of table.getPrePaginatedRowModel().rows) {
    const value = row.original.engagement;
    if (value !== null && value > maxEngagement) maxEngagement = value;
  }

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

  function setType(value: string) {
    table.getColumn('contentType')?.setFilterValue(!value || value === 'all' ? undefined : value);
  }

  function setPlatform(value: LogoPlatform) {
    table.getColumn('platform')?.setFilterValue(platformValue === value ? undefined : value);
  }

  const headerGroup = table.getHeaderGroups()[0];
  const rows = table.getRowModel().rows;
  const rowHeight = density === 'compact' ? 'h-10' : 'h-[52px]';

  return (
    <EngagementMaxContext.Provider value={maxEngagement}>
      <div className="flex min-w-0 flex-col gap-4">
        <SectionCard>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-0 w-full sm:w-64">
              <Search
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={search}
                onChange={(event) => table.setGlobalFilter(event.target.value)}
                placeholder="Search content"
                aria-label="Search content"
                className="h-9 rounded-[10px] border-border bg-card pl-8"
              />
            </div>

            <div role="group" aria-label="Content type" className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                aria-pressed={typeValue === 'all'}
                onClick={() => setType('all')}
                className={cn(controlClass, 'px-2.5', typeValue === 'all' && 'bg-muted')}
              >
                All
              </button>
              {typeItems.map((type) => (
                <button
                  key={type}
                  type="button"
                  aria-pressed={typeValue === type}
                  onClick={() => setType(type)}
                  className={cn(controlClass, 'px-2.5', typeValue === type && 'bg-muted')}
                >
                  {typeLabel(type)}
                </button>
              ))}
            </div>

            <div role="group" aria-label="Platform" className="flex items-center gap-1.5">
              {PLATFORMS.map((platform) => (
                <button
                  key={platform}
                  type="button"
                  aria-pressed={platformValue === platform}
                  aria-label={platform === 'facebook' ? 'Facebook' : 'Instagram'}
                  onClick={() => setPlatform(platform)}
                  className={cn(
                    controlClass,
                    'size-9 px-0',
                    platformValue === platform && 'bg-muted',
                  )}
                >
                  <PlatformLogo platform={platform} />
                </button>
              ))}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger className={controlClass}>
                <Columns3 className="size-4" aria-hidden />
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

            <button
              type="button"
              aria-pressed={density === 'compact'}
              aria-label={density === 'compact' ? 'Comfortable rows' : 'Compact rows'}
              title={density === 'compact' ? 'Comfortable rows' : 'Compact rows'}
              onClick={() => setDensity((current) => (current === 'compact' ? 'comfortable' : 'compact'))}
              className={cn(controlClass, 'size-9 px-0')}
            >
              {density === 'compact' ? <Rows2 className="size-4" aria-hidden /> : <Rows3 className="size-4" aria-hidden />}
            </button>

            <button
              type="button"
              onClick={exportCsv}
              disabled={filteredCount === 0}
              title="Download every row matching the current search and filters"
              className={controlClass}
            >
              <Download className="size-4" aria-hidden />
              Export CSV
            </button>

            <p className="ml-auto text-sm text-muted-foreground tabular-nums" aria-live="polite">
              {summary}
            </p>
          </div>
        </SectionCard>

        <SectionCard flush>
          <div className="max-h-[calc(100dvh-14rem)] overflow-auto">
            <table className="w-full min-w-[960px] table-fixed border-separate border-spacing-0 text-sm">
              <caption className="sr-only">Posts, sorted by engagement, {PAGE_SIZE} per page</caption>
              <thead>
                {table.getHeaderGroups().map((group) => (
                  <tr key={group.id}>
                    {group.headers.map((header) => {
                      const numeric = header.column.columnDef.meta?.numeric;
                      const sorted = header.column.getCanSort() ? header.column.getIsSorted() : false;
                      return (
                        <th
                          key={header.id}
                          scope="col"
                          aria-sort={
                            sorted === 'asc'
                              ? 'ascending'
                              : sorted === 'desc'
                                ? 'descending'
                                : header.column.getCanSort()
                                  ? 'none'
                                  : undefined
                          }
                          className={cn(
                            'sticky top-0 z-10 h-auto overflow-hidden border-b border-border bg-muted px-1.5 py-2 align-bottom text-left text-xs font-medium text-muted-foreground',
                            COLUMN_WIDTH[header.column.id],
                            numeric && 'text-right',
                            header.column.id === 'content' && 'max-w-0',
                          )}
                        >
                          {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={headerGroup?.headers.length ?? 1} className="p-0">
                      <EmptyState
                        icon={FileText}
                        title="No matching posts"
                        hint="No posts match this search or type."
                        className="rounded-none border-0 bg-transparent"
                      />
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr
                      key={row.id}
                      onClick={(event) => {
                        if ((event.target as HTMLElement).closest('a, button')) return;
                        setSelected(row.original);
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== 'Enter' && event.key !== ' ') return;
                        if ((event.target as HTMLElement).closest('a, button')) return;
                        event.preventDefault();
                        setSelected(row.original);
                      }}
                      tabIndex={0}
                      aria-label="Open post details"
                      className={cn(
                        'cursor-pointer transition-colors outline-none hover:bg-muted focus-visible:bg-muted',
                        rowHeight,
                        selected?.id === row.id && 'bg-muted',
                      )}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className={cn(
                            'overflow-hidden border-b border-border px-1.5 align-middle',
                            COLUMN_WIDTH[cell.column.id],
                            cell.column.columnDef.meta?.numeric && 'text-right text-xs',
                            cell.column.id === 'content' && 'max-w-0',
                            cell.column.id === 'publishedAt' && 'text-xs whitespace-nowrap',
                          )}
                        >
                          <table.FlexRender cell={cell} />
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-2 border-t border-border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {filteredCount === 0
                ? 'No posts in this period'
                : `Showing ${start}–${end} of ${filteredCount} posts`}
              {pageCount <= 1 && filteredCount > 0 ? '. All of them are on this page.' : null}
              <span className="sr-only">. {summary}</span>
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className={controlClass}
              >
                Previous
              </button>
              <span className="min-w-24 text-center text-xs text-muted-foreground tabular-nums">
                Page {filteredCount === 0 ? 0 : pageIndex + 1} of {Math.max(pageCount, filteredCount === 0 ? 0 : 1)}
              </span>
              <button
                type="button"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className={controlClass}
              >
                Next
              </button>
            </div>
          </div>
        </SectionCard>
      </div>

      <PostDrawer post={selected} onClose={() => setSelected(null)} />
    </EngagementMaxContext.Provider>
  );
}
