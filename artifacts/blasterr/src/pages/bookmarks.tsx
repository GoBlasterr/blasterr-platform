import { useGetBookmarks } from "@workspace/api-client-react";
import { BlastCard, BlastSkeleton } from "@/components/shared/blast-card";
import { Bookmark as BookmarkIcon } from "lucide-react";

export default function Bookmarks() {
  const { data: bookmarks, isLoading } = useGetBookmarks();

  return (
    <div className="flex flex-col min-h-screen">
      <div className="sticky top-0 z-20 glass-panel border-b border-white/10 p-4">
        <h2 className="font-display font-bold text-2xl text-white flex items-center gap-2">
          <BookmarkIcon className="w-6 h-6 text-primary" /> Bookmarks
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Private to you</p>
      </div>

      <div className="flex-1 pb-24 md:pb-0">
        {isLoading ? (
          <>
             <BlastSkeleton />
             <BlastSkeleton />
          </>
        ) : bookmarks?.length ? (
          bookmarks.map((blast: any) => (
            <BlastCard key={blast.id} blast={blast} />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground h-64">
            <BookmarkIcon className="w-12 h-12 mb-4 opacity-20" />
            <h3 className="text-xl font-bold text-white mb-2">Save Blasts for later</h3>
            <p className="max-w-xs">Don't let good intel slip away. Bookmark Blasts to easily find them again.</p>
          </div>
        )}
      </div>
    </div>
  );
}
