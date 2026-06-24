import { Link, useNavigate } from "react-router-dom";
import { Heart, Lock, Star } from "lucide-react";
import { avatarUrl, coverUrl } from "@/lib/imageTransform";
import { useAuth } from "@/contexts/AuthContext";
import { getLoginPath } from "@/lib/authRedirect";

export interface Creator {
  id: number | string;
  name: string;
  handle: string | null;
  avatar: string;
  cover: string;
  avatar_url?: string | null;
  cover_url?: string | null;
  price: number;
  category: string | null;
  subscribers: number;
  posts: number;
  rating: number;
  verified: boolean;
  tags: string[];
}

interface CreatorCardProps {
  creator: Creator;
}

const CreatorCard = ({ creator }: CreatorCardProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSubscribeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const profilePath = `/creator/${creator.id}?openSubscribe=1`;
    if (!user) {
      navigate(getLoginPath(profilePath));
    } else {
      navigate(profilePath);
    }
  };

  return (
    <Link
      to={`/creator/${creator.id}`}
      className="group block rounded-2xl overflow-hidden border border-border/50 bg-gradient-card shadow-card hover-glow transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1"
    >
      {/* Cover */}
      <div className="relative h-36 overflow-hidden">
        <img
          src={coverUrl(creator.cover_url ?? creator.cover)}
          alt={creator.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
         loading="lazy" decoding="async" />
        <div className="absolute inset-0 bg-gradient-to-t from-card/90 via-card/20 to-transparent" />

        {/* Category badge */}
        <span className="absolute top-3 left-3 rounded-full bg-background/60 backdrop-blur-sm border border-border/50 px-2.5 py-0.5 text-xs font-medium text-foreground">
          {creator.category}
        </span>

        {/* Lock icon */}
        <div className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-full bg-background/60 backdrop-blur-sm border border-border/50">
          <Lock className="h-3.5 w-3.5 text-primary" />
        </div>
      </div>

      {/* Avatar */}
      <div className="relative px-4">
        <div className="absolute -top-7 left-4 h-14 w-14 rounded-full border-2 border-primary/60 overflow-hidden bg-muted ring-2 ring-background shadow-glow">
          <img src={avatarUrl(creator.avatar_url ?? creator.avatar, 56)} alt={creator.name} className="h-full w-full object-cover"  loading="lazy" decoding="async" />
        </div>
        {creator.verified && (
          <div className="absolute -top-2 left-14 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-primary">
            <Star className="h-2.5 w-2.5 text-primary-foreground fill-current" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="px-4 pt-10 pb-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <p className="font-display font-semibold text-foreground leading-tight">{creator.name}</p>
            <p className="text-xs text-muted-foreground">@{creator.handle}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-muted-foreground">a partir de</p>
            <p className="font-display font-bold text-primary">
              R$ {creator.price.toFixed(2).replace(".", ",")}<span className="text-xs font-normal text-muted-foreground">/mês</span>
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
          <span className="flex items-center gap-1">
            <Heart className="h-3 w-3 text-primary" />
            {creator.subscribers.toLocaleString("pt-BR")} fãs
          </span>
          <span>{creator.posts} posts</span>
          <span className="flex items-center gap-0.5">
            <Star className="h-3 w-3 text-accent fill-current" />
            {creator.rating.toFixed(1)}
          </span>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {creator.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
              {tag}
            </span>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={handleSubscribeClick}
          className="mt-4 w-full rounded-full bg-gradient-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition-all duration-300 group-hover:shadow-[0_4px_20px_hsl(340_80%_58%_/_0.5)]"
        >
          Assinar agora
        </button>
      </div>
    </Link>
  );
};

export default CreatorCard;
