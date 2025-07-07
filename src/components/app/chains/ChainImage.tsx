import Image from 'next/image';

interface ChainImageProps {
  storagePath: string;
  width?: number | null;
  height?: number | null;
  blurhash?: string | null;
  alt?: string | null;
}

const PUBLIC_BUCKET_URL = `${process.env['NEXT_PUBLIC_SUPABASE_URL']}/storage/v1/object/public/chain-images`;

export default function ChainImage({
  storagePath,
  width,
  height,
  blurhash,
  alt,
}: ChainImageProps): React.ReactElement {
  const w = width ?? 900;
  const h = height ?? 900;
  return (
    <Image
      src={`${PUBLIC_BUCKET_URL}/${storagePath}`}
      alt={alt ?? ''}
      width={w}
      height={h}
      sizes="(max-width: 640px) 100vw, 600px"
      {...(blurhash
        ? {
            placeholder: 'blur' as const,
            blurDataURL: `data:image/jpeg;base64,${blurhash}`,
          }
        : {})}
      className="object-contain max-h-full mx-auto"
    />
  );
}
