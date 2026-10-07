import type { PostMediaItem } from "@/lib/media";

export const AVATAR_A = "http://localhost:3000/dev/avatar-a.svg";
export const AVATAR_B = "http://localhost:3000/dev/avatar-b.svg";

const scene = (sky: string, ground: string, sun: string): string => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000"><rect width="800" height="1000" fill="${sky}"/><circle cx="560" cy="330" r="120" fill="${sun}"/><path d="M0 700 Q200 560 400 680 T800 640 V1000 H0Z" fill="${ground}"/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const image = (sky: string, ground: string, sun: string): PostMediaItem => ({
  kind: "image",
  url: scene(sky, ground, sun),
  width: 800,
  height: 1000,
});

export const VIDEO: PostMediaItem = {
  kind: "video",
  url: "data:video/mp4;base64,AAAA",
  width: 800,
  height: 1000,
};

export const MORNING = image("#e8c9a0", "#8a5a3b", "#fff3d6");
export const MOUNTAIN = image("#9ec5e8", "#2f5d3a", "#ffffff");
export const DUSK = image("#d8b4e2", "#3b3b6b", "#fff1b8");
export const EMBER = image("#f4a6a0", "#5b2b2b", "#ffe9c2");
export const MEADOW = image("#c7e0c4", "#35563b", "#fffbe0");
export const LAKE = image("#b7d3f2", "#27425e", "#ffffff");
export const SAND = image("#f2d7b7", "#5e4327", "#fff6df");

export const LONG_CAPTION =
  "Weekend in montagna con gli amici di sempre. Siamo partiti all'alba, abbiamo camminato per ore fino al rifugio e poi abbiamo mangiato polenta e formaggi guardando le nuvole scendere sulla valle. Alla sera una partita a carte, due chitarre e nessun telefono. Torneremo presto, magari con la neve, se il meteo ci aiuta.\n\nGrazie a tutti per la compagnia e per le risate.";

export const LONG_WORD = "supercalifragilistichespiralidosoannidiamicizia".repeat(3);
