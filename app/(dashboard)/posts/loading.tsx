import { PostsPageHeader } from '@/components/posts/posts-page-header';
import { PostsSkeleton } from '@/components/posts/posts-skeleton';

export default function PostsLoading() {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <PostsPageHeader />
      <PostsSkeleton />
    </div>
  );
}
