import { ImgHTMLAttributes, VideoHTMLAttributes } from "react";
import { useSignedMediaUrl } from "@/hooks/useSignedMediaUrl";

type ImgProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string | null | undefined;
};

export function SignedImage({ src, alt = "", ...rest }: ImgProps) {
  const resolved = useSignedMediaUrl(src);
  if (!resolved) return null;
  return <img src={resolved} alt={alt} {...rest} />;
}

type VideoProps = Omit<VideoHTMLAttributes<HTMLVideoElement>, "src"> & {
  src: string | null | undefined;
};

export function SignedVideo({ src, ...rest }: VideoProps) {
  const resolved = useSignedMediaUrl(src);
  if (!resolved) return null;
  return <video src={resolved} {...rest} />;
}
