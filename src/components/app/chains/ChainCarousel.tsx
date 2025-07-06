'use client';

import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';

import ChainImage from './ChainImage';


interface MediaItem {
  id: string;
  storage_path: string;
  width: number | null;
  height: number | null;
  blurhash: string | null;
  alt_text: string | null;
  type: string;
  ordinal: number;
}

interface ChainCarouselProps {
  media: MediaItem[];
}

export default function ChainCarousel({
  media,
}: ChainCarouselProps): React.ReactElement | null {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    dragFree: false,
  });

  const [prevEnabled, setPrevEnabled] = useState(false);
  const [nextEnabled, setNextEnabled] = useState(false);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setPrevEnabled(emblaApi.canScrollPrev());
    setNextEnabled(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return undefined;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  // Guard against empty arrays to avoid creating an empty Embla instance.
  if (media.length === 0) return null;

  return (
    <div className="relative">
      <section ref={emblaRef} className="embla overflow-hidden rounded-lg">
        <div className="embla__container flex">
          {media.map((m) => (
            <div
              key={m.id}
              className="embla__slide flex-[0_0_100%] px-2 box-border"
            >
              <ChainImage
                storagePath={m.storage_path}
                width={m.width}
                height={m.height}
                blurhash={m.blurhash}
                alt={m.alt_text}
              />
            </div>
          ))}
        </div>
      </section>

      {media.length > 1 && (
        <>
          <button
            type="button"
            onClick={(): void => emblaApi?.scrollPrev()}
            disabled={!prevEnabled}
            className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 items-center justify-center bg-background/80 hover:bg-background/90 transition-colors rounded-full p-1 shadow-sm disabled:opacity-40"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={(): void => emblaApi?.scrollNext()}
            disabled={!nextEnabled}
            className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 items-center justify-center bg-background/80 hover:bg-background/90 transition-colors rounded-full p-1 shadow-sm disabled:opacity-40"
            aria-label="Next image"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}
    </div>
  );
}
