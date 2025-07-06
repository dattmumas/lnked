# 📝 Implementation status – July 6, 2025

## Where we are now

| Layer          | Status                                                                                                                                             |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **DB**         | `media.chain_id` column added, RLS _chain read_ policy created, view `v_chain_with_media` returns `media` array ordered by `ordinal`.              |
| **Types**      | `database.types.ts` regenerated; Zod `ChainWithAuthorSchema` extended with `media` (null → []). `ChainReactionTypeEnum` updated with `dislike`.    |
| **Repository** | All read methods (`getChainsWithAuthors`, `getReplies`, `fetchThread`, `search`) now query `v_chain_with_media`; common `BASE_SELECT` string used. |
| **Client**     | `ChainImage` + `ChainCarousel` components created; `ChainCardRenderer` renders carousel when `media.length > 0`.                                   |
| **Reactions**  | Hook now rolls back optimistic state on failure & guards duplicate fetch.                                                                          |

## Still TODO (next PRs)

1. **Composer upload flow**  
   • Integrate `react-dropzone` for up to 4 images.  
   • Compress JPEG/PNG (`browser-image-compression`), skip GIF/video.  
   • Web Worker generates BlurHash.  
   • Upload to Storage `chain-images/<user>/<chainId>/<ordinal>.jpg`.  
   • Insert matching `media` rows inside same TX.
2. **Threading logic**  
   Fix `thread_root` when replying to replies (use root id fetched from parent).
3. **Carousel polish**  
   Replace DIY snap scroll with `embla-carousel-react` for inertia & a11y; add `role="group" aria-roledescription="carousel"` and keyboard nav.
4. **Optimistic reaction edge-cases**  
   Debounce rapid taps; throttle network writes.
5. **ChainCard a11y**  
   Make wrapper focusable/button-like for keyboard thread opening.
6. **Media schema typings**  
   Define `MediaSchema` (id, storage_path, width, height, blurhash, alt_text, type, ordinal) and use instead of `any`.

---

_This table will be updated as each slice lands in main._

End-to-end playbook: display a scrollable image carousel for each Chain using your enriched public.media table

⸻

1 · Server-side — data plumbing

Task How Details
1.1 Add row-level policy sql CREATE POLICY "chain read" ON media FOR SELECT USING (true); Public read on media rows.
1.2 Expose helper view ```sql
create or replace view v_chain_with_media as
select c.\*,

jsonb_agg(m.\* order by m.ordinal) filter (where m.id is not null) as media

from chains c
left join LATERAL (
select id, type, storage_path, width, height, blurhash, alt_text, ordinal
from media
where media.chain_id = c.id
order by ordinal
) m on true
group by c.id;

| **1.3 Repository function** | `ts
export async function fetchThread(rootId:string, before?:string){
  return supabase
    .from('v_chain_with_media')
    .select('*')
    .eq('thread_root', rootId)
    .lt('created_at', before ?? new Date().toISOString())
    .order('created_at', { ascending:false })
    .limit(40);
}
` | Each item now carries `media` array. |

---

## 2 · Upload flow (composer)

| Step                | Code / Lib                                                | Notes                              |
| ------------------- | --------------------------------------------------------- | ---------------------------------- |
| **Drag/drop**       | `react-dropzone`                                          | Accept max 4, show thumb previews. |
| **Client compress** | `browser-image-compression` @ 0.8                         | Skip for GIF/video rows.           |
| **Blurhash**        | `import { encode } from 'blurhash'` (run in a Web Worker) | Store 20×20 preview.               |
| **Upload**          | ```ts                                                     |

const path = `${user.id}/${chainId}/${i}.jpg`;
await supabase.storage.from('chain-images').upload(path, file,{upsert:false});

````| |
| **Insert media row** | ```ts
await supabase.from('media').insert({
  chain_id: chainId,
  ordinal: i+1,
  type: 'image',
  storage_path: path,
  width, height, blurhash, alt_text
});
``` | Part of same TX as chain insert. |

---

## 3 · Client components

### 3.1 `ChainImage.tsx`
```tsx
import NextImage from 'next/image';

export function ChainImage({ path, w, h, blur, alt }){
  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/chain-images`;
  return (
    <NextImage
      src={`${base}/${path}?width=900&quality=75`}
      alt={alt ?? ''}
      width={w ?? 900}
      height={h ?? 900}
      placeholder={blur?'blur':undefined}
      blurDataURL={blur && `data:image/jpeg;base64,${blur}`}
      className="object-contain max-h-[70vh] mx-auto"
    />
  );
}

3.2 ChainCarousel.tsx

import useEmblaCarousel from 'embla-carousel-react';
import 'embla-carousel/embla.css';          // core styles

export default function ChainCarousel({ media }){
  const [ref] = useEmblaCarousel({ loop:false, dragFree:false });
  return (
    <div ref={ref} className="embla overflow-hidden rounded-lg">
      <div className="embla__container flex">
        {media.map(m=>(
          <div key={m.id} className="embla__slide flex-[0_0_100%]">
            <ChainImage path={m.storage_path} w={m.width} h={m.height}
                        blur={m.blurhash} alt={m.alt_text}/>
          </div>
        ))}
      </div>
    </div>
  );
}

3.3 Integrate in ChainCard

{item.media?.length > 0 && <ChainCarousel media={item.media} />}


⸻

4 · Performance knobs

Tactic	How
Lazy slides	embla-carousel-react plugin LazyLoad to mount only in-view slides.
Responsive srcset	Add sizes="(max-width:640px) 100vw, 600px" to <Image> for automatic DPR selection.
Virtuoso overscan	overscan={2} keeps only ±2 screens worth of slides in DOM.
CDN transform variants	Use /render/image/w400/... for timeline thumbnails if you later add thumb grid.


⸻

5 · Accessibility & UX
	•	Carousel wrapper: role="group" and aria-roledescription="carousel".
	•	Provide alt-text entry in upload modal; store in alt_text.
	•	Add keyboard nav plugin (ArrowLeft/ArrowRight).

⸻

6 · Testing checklist
	1.	Insert 4 × 4 MB images → confirm Storage objects + 4 media rows.
	2.	Feed shows blurred placeholders; tapping opens thread carousel.
	3.	Swipe left/right smoothly at 60 fps on mobile Safari.
	4.	Hard reload – payload size per item ≤ 15 kB JSON (no binary).
	5.	Lighthouse CLS < 0.1 and LCP slide ≤ 2.5 s on 4G.

Implementing exactly these steps wires your chain-images bucket, public.media table, Embla carousel, and React Virtuoso feed into a modern, performant image experience.
````
