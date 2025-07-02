'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { collectiveSchema } from '@/lib/schemas/collective';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// Constants for validation
const MIN_NAME_LENGTH = 3;
const MAX_NAME_LENGTH = 100;
const MIN_SLUG_LENGTH = 3;
const MAX_SLUG_LENGTH = 50;
const MAX_DESCRIPTION_LENGTH = 500;

export type CollectiveState = {
  errors?: Partial<Record<keyof z.infer<typeof collectiveSchema>, string[]>>;
  message?: string;
};

export async function createCollective(
  _prevState: CollectiveState,
  formData: FormData,
): Promise<CollectiveState> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      message: 'You must be logged in to create a collective.',
    };
  }

  const inputData = {
    name: formData.get('name') as string,
    description: formData.get('description') as string,
    slug: formData.get('slug') as string,
  };

  const validatedFields = collectiveSchema.safeParse(inputData);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Invalid input. Please check the fields and try again.',
    };
  }

  const { name, description, slug } = validatedFields.data;

  const { data: collective, error } = await supabase
    .from('collectives')
    .insert({
      name,
      description: description ?? null,
      slug,
      owner_id: user.id,
    })
    .select()
    .single();

  if (error) {
    return {
      message: 'There was an error creating the collective. Please try again.',
    };
  }

  revalidatePath('/collectives');

  return {
    message: `Collective "${collective.name}" created successfully.`,
  };
}
