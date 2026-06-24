import { Skeleton } from "@/components/ui/skeleton";

const PostSkeleton = () => (
  <div className="glass-card rounded-2xl overflow-hidden">
    <div className="flex items-center gap-3 p-4">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-3 w-40" />
      </div>
      <Skeleton className="h-5 w-5 rounded" />
    </div>
    <Skeleton className="h-3.5 w-3/4 mx-4 mb-3" />
    <Skeleton className="w-full aspect-[4/3]" />
    <div className="flex items-center justify-between p-4">
      <div className="flex gap-4">
        <Skeleton className="h-5 w-14" />
        <Skeleton className="h-5 w-14" />
        <Skeleton className="h-5 w-5" />
      </div>
      <Skeleton className="h-5 w-5" />
    </div>
  </div>
);

export default PostSkeleton;
