"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { ExternalLinkIcon, PencilIcon, PlayIcon, SearchIcon } from "lucide-react";

import { deleteTutorialVideo } from "@/actions/tutorials";
import { youtubeEmbedUrl, youtubeThumbnailUrl, youtubeWatchUrl } from "@/lib/youtube";
import { ConfirmDeleteButton } from "@/components/shared/confirm-delete-button";
import { VideoDialog } from "@/components/tutorials/video-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export type LibraryVideo = {
  id: string;
  categoryId: string;
  youtubeId: string;
  title: string;
  description: string | null;
};

export type LibraryCategory = { id: string; name: string; videos: LibraryVideo[] };

const ALL = "all";

/** Sense accents ni majúscules: «sessio» ha de trobar «Iniciar sessió». */
function normalize(text: string) {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

function videoCount(count: number) {
  return `${count} ${count === 1 ? "vídeo" : "vídeos"}`;
}

/** La llista de vídeos dels tutorials, amb cerca, filtre per categoria i reproductor. */
export function VideoLibrary({
  categories,
  canManage,
}: {
  categories: LibraryCategory[];
  canManage: boolean;
}) {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState(ALL);

  // El vídeo obert viu a la URL (`?v=`): l'enllaç es pot enviar a algú, i el
  // botó Enrere del mòbil tanca el vídeo en comptes de sortir de la pàgina.
  // `pushState` i `replaceState` no tornen a demanar la pàgina al servidor.
  const openYoutubeId = searchParams.get("v");
  const openedFromList = useRef(false);

  const videos = categories.flatMap((category) =>
    category.videos.map((video) => ({ ...video, categoryName: category.name })),
  );
  const openVideo = videos.find((video) => video.youtubeId === openYoutubeId) ?? null;

  // El diàleg es tanca amb una animació: mentre dura, el títol no ha de
  // desaparèixer. El reproductor, en canvi, surt de seguida perquè el so pari.
  const [shown, setShown] = useState(openVideo);
  if (openVideo && openVideo.youtubeId !== shown?.youtubeId) setShown(openVideo);

  function openPlayer(youtubeId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("v", youtubeId);
    window.history.pushState(null, "", `?${params}`);
    openedFromList.current = true;
  }

  function closePlayer() {
    // Obert des de la llista: tornar enrere deixa l'historial com estava.
    if (openedFromList.current) {
      openedFromList.current = false;
      window.history.back();
      return;
    }
    // Obert amb un enllaç: no hi ha res a on tornar dins de gesTIC.
    const params = new URLSearchParams(searchParams.toString());
    params.delete("v");
    const search = params.toString();
    window.history.replaceState(null, "", search ? `?${search}` : window.location.pathname);
  }

  const needle = normalize(query.trim());
  const sections = categories
    .filter((category) => filter === ALL || category.id === filter)
    .map((category) => ({
      ...category,
      videos: needle
        ? category.videos.filter((video) =>
            normalize(`${video.title} ${video.description ?? ""}`).includes(needle),
          )
        : category.videos,
    }))
    // La coordinació veu també les categories buides, per saber on falten vídeos.
    .filter((category) => category.videos.length > 0 || (canManage && !needle && filter === ALL));
  const filterable = categories.filter((category) => category.videos.length > 0);
  const categoryOptions = categories.map(({ id, name }) => ({ id, name }));

  if (categories.length === 0 || (videos.length === 0 && !canManage)) {
    return (
      <p className="rounded-lg border border-dashed bg-background p-10 text-center text-muted-foreground">
        {canManage
          ? "Encara no hi ha cap categoria. Crea'n una i després hi podràs afegir vídeos."
          : "Encara no hi ha cap vídeo."}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {videos.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="relative w-full sm:max-w-sm">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cerca un vídeo…"
              aria-label="Cerca un vídeo"
              className="pl-8"
            />
          </div>
          {filterable.length > 1 && (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filtra per categoria">
              {[{ id: ALL, name: "Tots" }, ...filterable].map((option) => (
                <Button
                  key={option.id}
                  type="button"
                  size="sm"
                  variant={filter === option.id ? "default" : "outline"}
                  aria-pressed={filter === option.id}
                  className="rounded-full"
                  onClick={() => setFilter(option.id)}
                >
                  {option.name}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      {sections.length === 0 && (
        <p className="text-muted-foreground">Cap vídeo coincideix amb la cerca.</p>
      )}

      {sections.map((category) => (
        <section
          key={category.id}
          aria-labelledby={`tutorials-${category.id}`}
          className="flex flex-col gap-4"
        >
          <h2 id={`tutorials-${category.id}`} className="flex items-baseline gap-2 text-lg font-semibold">
            {category.name}
            <span className="text-sm font-normal text-muted-foreground">
              {videoCount(category.videos.length)}
            </span>
          </h2>

          {category.videos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Encara no hi ha cap vídeo en aquesta categoria.</p>
          ) : (
            <ul className="grid gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
              {category.videos.map((video) => (
                <li key={video.id} className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => openPlayer(video.youtubeId)}
                    className="group flex flex-col gap-2.5 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <span className="relative block aspect-video overflow-hidden rounded-lg bg-muted ring-1 ring-foreground/10">
                      <Image
                        src={youtubeThumbnailUrl(video.youtubeId)}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        // Si YouTube ja no té la miniatura (un vídeo esborrat després
                        // d'afegir-lo), queda el fons gris amb el play i no una imatge trencada.
                        onError={(event) => {
                          event.currentTarget.style.visibility = "hidden";
                        }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-300 group-hover:bg-black/20">
                        <span className="flex size-12 items-center justify-center rounded-full bg-black/70 text-white shadow-lg transition-transform duration-300 group-hover:scale-110">
                          <PlayIcon className="size-5 translate-x-0.5 fill-current" />
                        </span>
                      </span>
                    </span>
                    <span className="line-clamp-2 font-medium leading-snug">{video.title}</span>
                  </button>
                  {video.description && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">{video.description}</p>
                  )}
                  {canManage && (
                    <div className="-ml-2 flex gap-1">
                      <VideoDialog
                        categories={categoryOptions}
                        video={video}
                        trigger={
                          <Button variant="ghost" size="icon-sm" aria-label={`Edita «${video.title}»`}>
                            <PencilIcon className="size-4" />
                          </Button>
                        }
                      />
                      <ConfirmDeleteButton
                        action={deleteTutorialVideo}
                        input={{ id: video.id }}
                        title="Treure aquest vídeo dels tutorials?"
                        description="El vídeo continua a YouTube: només deixa de sortir a gesTIC."
                      />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}

      <Dialog
        open={openVideo !== null}
        onOpenChange={(next) => {
          if (!next) closePlayer();
        }}
      >
        <DialogContent className="gap-3 sm:max-w-4xl">
          {shown && (
            <>
              <DialogHeader className="pr-8">
                <DialogTitle className="text-base">{shown.title}</DialogTitle>
                <DialogDescription>{shown.categoryName}</DialogDescription>
              </DialogHeader>
              <div className="aspect-video overflow-hidden rounded-lg bg-black">
                {openVideo && (
                  <iframe
                    key={openVideo.youtubeId}
                    src={youtubeEmbedUrl(openVideo.youtubeId)}
                    title={openVideo.title}
                    className="size-full"
                    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                    allowFullScreen
                    // YouTube no reprodueix res si no rep l'origen de la pàgina.
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                )}
              </div>
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                {shown.description && <p className="max-w-prose text-muted-foreground">{shown.description}</p>}
                <a
                  href={youtubeWatchUrl(shown.youtubeId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground hover:underline"
                >
                  Obre a YouTube
                  <ExternalLinkIcon className="size-3.5" />
                </a>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
