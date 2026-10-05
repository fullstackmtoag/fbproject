export function PostsPageHeader() {
  return (
    <header className="min-w-0">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">Posts</h1>
      <p className="mt-1 truncate text-sm text-muted-foreground">
        Every synced post in the selected platform and date range.
      </p>
    </header>
  );
}
