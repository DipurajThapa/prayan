// Media registry: every image used on the site, with source, licence, usage and alt text.
const UNSPLASH = "Unsplash Licence — free for commercial use, no attribution required";
const PEXELS = "Pexels Licence — free for commercial use, no attribution required";
const u = (id) => `https://unsplash.com/photos/${id}`;

export const MEDIA = {
  "hero-dubai-mansion-skyline-video": {
    src: "/media/hero-dubai-mansion-skyline.mp4", poster: "/media/hero-dubai-mansion-skyline-poster.jpg",
    alt: "Villa garden and pool on the Palm Jumeirah with the Dubai Marina skyline across the water",
    source: "https://www.pexels.com/video/luxury-mansion-with-dubai-skyline-view-31977028/",
    licence: PEXELS, usage: "Home hero background video (desktop only, muted, 14-second loop)",
  },
  "hero-dubai-villa-pool": {
    src: "/media/hero-dubai-villa-pool.jpg", mobile: "/media/hero-dubai-villa-pool-mobile.jpg",
    alt: "Modern white villa with palm trees and a long swimming pool beside a timber deck",
    source: "https://www.pexels.com/photo/white-and-brown-concrete-building-near-the-swimming-pool-10647324/",
    licence: PEXELS, usage: "Home hero, sample villa gallery, social preview",
  },
  "villa-white-pool": { src: "/media/villa-white-pool.jpg", alt: "Contemporary white villa reflected in a rectangular pool", source: u("photo-1613490493576-7fde63acd811"), licence: UNSPLASH, usage: "Sample villa card, journey section" },
  "villa-glass-pool": { src: "/media/villa-glass-pool.jpg", alt: "Villa terrace with glass doors opening onto a turquoise pool and palm trees", source: u("photo-1613977257365-aaae5a9817ff"), licence: UNSPLASH, usage: "Sample villa gallery" },
  "villa-blue-sky": { src: "/media/villa-blue-sky.jpg", alt: "Two-storey white villa with a pool under a clear blue sky", source: u("photo-1600596542815-ffad4c1539a9"), licence: UNSPLASH, usage: "Sample villa gallery" },
  "house-glass-walls": { src: "/media/house-glass-walls.jpg", alt: "Single-level modern home with glass walls beside a pool on a sunny day", source: u("photo-1582268611958-ebfd161ef9cf"), licence: UNSPLASH, usage: "Sample villa gallery, How It Works" },
  "house-two-storey": { src: "/media/house-two-storey.jpg", alt: "Two-storey modern house with large windows and balconies", source: u("photo-1721815693498-cc28507c0ba2"), licence: UNSPLASH, usage: "Sample townhouse gallery" },
  "house-white-cube": { src: "/media/house-white-cube.jpg", alt: "White cubic modern house against a deep blue sky", source: u("photo-1628012209120-d9db7abf7eab"), licence: UNSPLASH, usage: "Sample townhouse card" },
  "dubai-towers-sunlight": { src: "/media/dubai-towers-sunlight.jpg", alt: "Glass residential towers in Dubai lit by low sunlight", source: u("photo-1788129114498-548fe9f94b15"), licence: UNSPLASH, usage: "Sample apartment card, Contact page" },
  "dubai-towers-park": { src: "/media/dubai-towers-park.jpg", alt: "Residential towers rising above a green park and canal in Dubai", source: u("photo-1788129115397-dbfad91f5c40"), licence: UNSPLASH, usage: "Sample penthouse card" },
  "dubai-towers-canal": { src: "/media/dubai-towers-canal.jpg", alt: "Residential towers beside a calm blue canal in Dubai", source: u("photo-1788129115413-94ef53500f89"), licence: UNSPLASH, usage: "Sample apartment card" },
  "dubai-skyline": { src: "/media/dubai-skyline.jpg", alt: "Dubai skyline with tall towers at golden hour", source: u("photo-1737475989184-a3c8c5576369"), licence: UNSPLASH, usage: "Sample apartment gallery, AI assistant section" },
  "interior-living-windows": { src: "/media/interior-living-windows.jpg", alt: "Spacious living room with large windows and soft seating", source: u("photo-1757924461488-ef9ad0670978"), licence: UNSPLASH, usage: "Sample listing galleries" },
  "interior-chaise": { src: "/media/interior-chaise.jpg", alt: "Double-height living room with a corner sofa and tall windows at dusk", source: u("photo-1564078516393-cf04bd966897"), licence: UNSPLASH, usage: "Sample listing galleries" },
  "interior-living-rug": { src: "/media/interior-living-rug.jpg", alt: "Bright living room with neutral sofas and a patterned rug", source: u("photo-1630699144035-c0f6311ec482"), licence: UNSPLASH, usage: "Sample listing galleries" },
  "interior-arched": { src: "/media/interior-arched.jpg", alt: "Open-plan living and dining space with arched windows", source: u("photo-1688646953306-5ec93eab8c06"), licence: UNSPLASH, usage: "Sample listing galleries" },
};

export const media = (key) => {
  if (key && typeof key === "object") return { src: `${process.env.REACT_APP_BACKEND_URL}/api/files/${key.path}`, alt: key.alt };
  return MEDIA[key] || MEDIA["hero-dubai-villa-pool"];
};
