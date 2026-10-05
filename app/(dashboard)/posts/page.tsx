import type { Metadata } from 'next';
import { Suspense } from 'react';
import { FileText } from 'lucide-react';
import { PostsPageHeader } from '@/components/posts/posts-page-header';
import { PostsSkeleton } from '@/components/posts/posts-skeleton';
import { PostsTable, type PostsTableRow } from '@/components/posts/posts-table';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorState } from '@/components/shared/error-state';
import { formatDate } from '@/lib/format';
import { getPosts, normalizeFilters, type Filters, type PostWithMetrics } from '@/lib/queries';

export const metadata: Metadata = { title: 'Posts' };

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function toRow(post: PostWithMetrics): PostsTableRow {
  return {
    id: post.id,
    platform: post.platform,
    content: post.content,
    contentType: post.contentType,
    permalink: post.permalink,
    thumbnailUrl: post.thumbnailUrl,
    publishedAt: formatDate(post.createdTime),
    reactions: post.reactions,
    comments: post.comments,
    shares: post.shares,
    saves: post.saves,
    reach: post.reach,
    views: post.views,
    engagement: post.engagement,
  };
}

async function PostsContent({ filters }: { filters: Filters }) {
  let posts: PostWithMetrics[];
  try {
    posts = await getPosts(filters);
  } catch {
    return <ErrorState message="Posts could not be loaded. Try refreshing the page." />;
  }

  if (posts.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        hint="No posts in this period. Click Sync to fetch data, or widen the date range."
      />
    );
  }

  return <PostsTable posts={posts.map(toRow)} />;
}

export default async function PostsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const filters = normalizeFilters({ platform: first(sp.platform), days: first(sp.days) });

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <PostsPageHeader />
      <Suspense key={`${filters.platform}-${filters.days}`} fallback={<PostsSkeleton />}>
        <PostsContent filters={filters} />
      </Suspense>
    </div>
  );
}
