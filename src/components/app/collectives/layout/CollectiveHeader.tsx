import { format } from 'date-fns';

import { createServerSupabaseClient } from '@/lib/supabase/server';


interface CollectiveHeaderProps {
  slug: string;
}

export async function CollectiveHeader({ slug }: CollectiveHeaderProps) {
  const supabase = await createServerSupabaseClient();

  const { data: collective } = await supabase
    .from('collectives')
    .select('name')
    .eq('slug', slug)
    .single();

  const collectiveName = collective?.name ?? 'The Collective';
  const currentDate = format(new Date(), 'eeee, MMMM d, yyyy');

  return (
    <header className="border-b border-gray-300 py-4">
      <div className="container mx-auto flex flex-col md:flex-row justify-between items-center text-center md:text-left">
        <div className="text-sm text-gray-600 mb-4 md:mb-0">
          <p>{currentDate}</p>
          <p>Today's Paper</p>
        </div>
        <h1 className="text-4xl lg:text-5xl font-serif font-bold text-center order-first md:order-none">
          {collectiveName}
        </h1>
        <div className="text-sm hidden md:block">&nbsp;</div>{' '}
        {/* Placeholder for alignment */}
      </div>
    </header>
  );
}
