import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading UI for Recipe Detail Page
 *
 * Shows skeleton placeholders while recipe data is being loaded.
 * Includes proper accessibility attributes for screen readers.
 */
export default function RecipeDetailLoading() {
  return (
    <div
      className="bg-background flex min-h-screen flex-col"
      role="status"
      aria-busy="true"
      aria-label="Ładowanie przepisu..."
    >
      {/* Screen reader announcement */}
      <span className="sr-only">Ładowanie szczegółów przepisu, proszę czekać...</span>

      {/* Header */}
      <header className="bg-background sticky top-0 z-10 border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-md" aria-hidden="true" />
          <Skeleton className="h-6 w-24" aria-hidden="true" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 py-6 pb-24">
        {/* Recipe Header Skeleton */}
        <section className="mb-6" aria-hidden="true">
          <Skeleton className="mb-2 h-7 w-3/4" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-32" />
          </div>
        </section>

        {/* AI Usage Indicator Skeleton */}
        <div className="mb-6 flex items-center gap-2" aria-hidden="true">
          <Skeleton className="h-4 w-32" />
        </div>

        {/* Analysis Section Skeleton */}
        <section aria-hidden="true" className="space-y-4">
          <Skeleton className="mb-4 h-5 w-40" />

          {/* Ingredient skeletons */}
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="border-border/50 flex items-center gap-3 border-b py-3">
              <Skeleton className="h-6 w-20 rounded-full" />
              <div className="flex-1">
                <Skeleton className="mb-1 h-4 w-2/3" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          ))}
        </section>
      </main>

      {/* Sticky Footer Skeleton */}
      <footer className="bg-background fixed right-0 bottom-0 left-0 border-t p-4" aria-hidden="true">
        <Skeleton className="h-12 w-full rounded-md" />
      </footer>
    </div>
  );
}
