import { notFound } from "next/navigation";
import { GalleryView } from "@/app/dev/gallery/gallery-view";
import { type GalleryViewName, VIEWS } from "@/app/dev/gallery/views";

type GalleryPageProps = { searchParams: Promise<{ view?: string }> };

const isView = (value: string | undefined): value is GalleryViewName =>
  VIEWS.some((view) => view === value);

export default async function GalleryPage({ searchParams }: GalleryPageProps) {
  if (process.env.NODE_ENV === "production") notFound();
  const { view } = await searchParams;

  if (!isView(view)) {
    return (
      <main className="column grid gap-4 px-6 py-12">
        <h1 className="text-2xl font-bold tracking-[-0.025em]">Gallery</h1>
        <ul className="grid divide-y border-y">
          {VIEWS.map((name) => (
            <li key={name}>
              <a href={`/dev/gallery?view=${name}`} className="block py-3 font-medium">
                {name}
              </a>
            </li>
          ))}
        </ul>
      </main>
    );
  }

  return <GalleryView view={view} />;
}
