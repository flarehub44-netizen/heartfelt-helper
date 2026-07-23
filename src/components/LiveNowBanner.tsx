import { Link } from "react-router-dom";
import { Radio } from "lucide-react";
import { useLiveNow } from "@/hooks/useLiveNow";
import { avatarUrl } from "@/lib/imageTransform";
import { creatorLivePath } from "@/lib/creatorPaths";

export default function LiveNowBanner() {
  const { data = [], isLoading } = useLiveNow();
  if (isLoading || data.length === 0) return null;

  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
        </span>
        <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Radio className="h-4 w-4 text-primary" />
          Ao vivo agora
        </p>
        <span className="text-xs text-muted-foreground ml-auto">{data.length}</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
        {data.map((live) => (
          <Link
            key={live.id}
            to={creatorLivePath(live.creator_id, live.id, live.creator?.handle)}
            className="flex flex-col items-center gap-1.5 flex-shrink-0 group"
          >
            <div className="relative">
              <div className="h-16 w-16 rounded-full p-0.5 bg-gradient-to-br from-primary via-primary/70 to-secondary shadow-glow">
                <img
                  src={avatarUrl(live.creator?.avatar_url ?? "/placeholder.svg", 64)}
                  alt={live.creator?.name ?? "Live"}
                  className="h-full w-full rounded-full object-cover border-2 border-background"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground uppercase tracking-wide shadow">
                Live
              </span>
            </div>
            <span className="text-xs text-foreground max-w-[72px] truncate group-hover:text-primary transition-colors">
              {live.creator?.name?.split(" ")[0] ?? "Criador"}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
