export type PostMediaItem = {
  kind: "image" | "video";
  url: string;
  width: number;
  height: number;
};

export const mediaLabel = (item: PostMediaItem, username: string): string =>
  item.kind === "video" ? `Video di ${username}` : `Foto pubblicata da ${username}`;
