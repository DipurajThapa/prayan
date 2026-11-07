import { media } from "@/lib/media";

// Responsive image. Built-in images get AVIF and WebP in several widths, so the browser downloads
// only the size the layout needs (`sizes`); a JPEG covers browsers with neither format.
// Owner uploads have one WebP plus an 800px thumbnail; pass `thumb` where the image is shown small.
export function Img({ image, sizes = "100vw", thumb = false, alt, ...rest }) {
  const m = image && typeof image === "object" && "src" in image ? image : media(image);
  const altText = alt ?? m.alt;
  if (!m.avif) return <img src={thumb ? m.thumb || m.src : m.src} alt={altText} {...rest} />;
  return (
    <picture className="contents">
      <source type="image/avif" srcSet={m.avif} sizes={sizes} />
      <source type="image/webp" srcSet={m.webp} sizes={sizes} />
      <img src={m.src} alt={altText} width={m.w} height={m.h} {...rest} />
    </picture>
  );
}
