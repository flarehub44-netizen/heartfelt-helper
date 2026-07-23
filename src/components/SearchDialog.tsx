import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { User, FileText, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { creatorProfilePath } from "@/lib/creatorPaths";

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CreatorResult {
  id: string;
  name: string;
  handle: string | null;
  avatar_url: string | null;
  category: string | null;
}

interface PostResult {
  id: string;
  text: string | null;
  creator_id: string;
  creator_name: string;
  creator_handle: string | null;
}

const SearchDialog = ({ open, onOpenChange }: SearchDialogProps) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [creators, setCreators] = useState<CreatorResult[]>([]);
  const [posts, setPosts] = useState<PostResult[]>([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setCreators([]);
      setPosts([]);
      return;
    }
    setLoading(true);
    const term = `%${q}%`;

    const [creatorsRes, postsRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, name, handle, avatar_url, category")
        .eq("role", "creator")
        .or(`name.ilike.${term},handle.ilike.${term},bio.ilike.${term},category.ilike.${term}`)
        .limit(5),
      supabase
        .from("posts")
        .select("id, text, creator_id, creator:profiles!posts_creator_id_fkey(name, handle)")
        .ilike("text", term)
        .eq("min_plan", "free")
        .limit(5),
    ]);

    setCreators((creatorsRes.data as CreatorResult[]) ?? []);
    setPosts(
      (postsRes.data ?? []).map((p: any) => ({
        id: p.id,
        text: p.text,
        creator_id: p.creator_id,
        creator_name: p.creator?.name ?? "",
        creator_handle: p.creator?.handle ?? null,
      }))
    );
    setLoading(false);
  }, []);

  // Debounce
  useEffect(() => {
    const timer = setTimeout(() => search(query), 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setQuery("");
      setCreators([]);
      setPosts([]);
    }
  }, [open]);

  const go = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Buscar criadores, posts..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {!loading && query.trim() && creators.length === 0 && posts.length === 0 && (
          <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
        )}

        {creators.length > 0 && (
          <CommandGroup heading="Criadores">
            {creators.map((c) => (
              <CommandItem
                key={c.id}
                onSelect={() => go(creatorProfilePath(c.id, c.handle))}
                className="cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  {c.avatar_url ? (
                    <img src={c.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover"  loading="lazy" decoding="async" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">@{c.handle} · {c.category}</p>
                  </div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {posts.length > 0 && (
          <CommandGroup heading="Posts">
            {posts.map((p) => (
              <CommandItem
                key={p.id}
                onSelect={() => go(`/p/${p.id}`)}
                className="cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm truncate">{p.text || "Post sem texto"}</p>
                    <p className="text-xs text-muted-foreground">por {p.creator_name}</p>
                  </div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {query.trim() && (creators.length > 0 || posts.length > 0) && (
          <CommandGroup>
            <CommandItem
              onSelect={() => go(`/discover?q=${encodeURIComponent(query.trim())}`)}
              className="cursor-pointer text-primary"
            >
              <Search className="h-4 w-4 mr-2 flex-shrink-0" />
              Ver todos os resultados para "{query.trim()}"
            </CommandItem>
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
};

export default SearchDialog;
