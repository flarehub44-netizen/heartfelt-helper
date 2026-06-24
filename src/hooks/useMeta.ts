import { useEffect } from "react";

interface MetaOptions {
  title?: string;
  description?: string;
  image?: string | null;
  url?: string;
}

function setMeta(property: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", property);
    document.head.appendChild(el);
  }
  el.content = content;
}

function setNameMeta(name: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.content = content;
}

export function useMeta({ title, description, image, url }: MetaOptions) {
  useEffect(() => {
    const BASE = "Flare";
    const fullTitle = title ? `${title} | ${BASE}` : BASE;
    document.title = fullTitle;

    if (description) {
      setNameMeta("description", description);
      setMeta("og:description", description);
      setNameMeta("twitter:description", description);
    }

    setMeta("og:title", fullTitle);
    setNameMeta("twitter:title", fullTitle);
    setNameMeta("twitter:card", image ? "summary_large_image" : "summary");

    if (image) {
      setMeta("og:image", image);
      setNameMeta("twitter:image", image);
    }

    if (url) {
      setMeta("og:url", url);
    }

    return () => {
      document.title = BASE;
    };
  }, [title, description, image, url]);
}
