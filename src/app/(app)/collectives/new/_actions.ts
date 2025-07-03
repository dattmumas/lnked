'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { collectiveSchema } from '@/lib/schemas/collective';
import { createServerSupabaseClient } from '@/lib/supabase/server';

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

  // Ensure slug is unique before attempting insert
  const { data: existingSlug } = await supabase
    .from('collectives')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  if (existingSlug) {
    return {
      errors: { slug: ['Slug already exists. Please choose another.'] },
      message: 'Slug already exists.',
    } satisfies CollectiveState;
  }

  // Use the proper tenant creation function that handles both tenant and collective creation
  const rpcParams: {
    tenant_name: string;
    tenant_slug: string;
    tenant_description?: string;
    is_public?: boolean;
  } = {
    tenant_name: name,
    tenant_slug: slug,
    is_public: true, // Default to public
  };

  if (description && description.trim()) {
    rpcParams.tenant_description = description;
  }

  const { error } = await supabase.rpc('create_collective_tenant', rpcParams);

  if (error) {
    // Handle duplicate key conflicts gracefully
    if (error.code === '23505' || /duplicate key/.test(error.message)) {
      return {
        errors: { slug: ['Slug already exists. Please choose another.'] },
        message: 'Slug conflict',
      } satisfies CollectiveState;
    }
    return {
      message: 'There was an error creating the collective. Please try again.',
    };
  }

  revalidatePath('/collectives');

  return {
    message: `Collective "${name}" created successfully.`,
  };
}
