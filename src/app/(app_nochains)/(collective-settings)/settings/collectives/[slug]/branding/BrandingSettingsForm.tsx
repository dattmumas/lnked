'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import React, { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import type { Database } from '@/lib/database.types';

type BrandingCollective = Pick<
  Database['public']['Tables']['collectives']['Row'],
  'id' | 'logo_url' | 'cover_image_url'
>;

export function BrandingSettingsForm({
  collective,
  slug,
}: {
  collective: BrandingCollective;
  slug: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [logoPreview, setLogoPreview] = useState<string | null>(
    collective.logo_url,
  );
  const [coverPreview, setCoverPreview] = useState<string | null>(
    collective.cover_image_url,
  );

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<string | null>>,
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      setter(URL.createObjectURL(file));
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.append('collectiveId', collective.id);

    startTransition(async () => {
      const response = await fetch(`/api/collectives/${slug}/branding`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('Branding updated successfully!');
        router.refresh();
      } else {
        toast.error('Failed to update branding', {
          description: result.error,
        });
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Logo</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center space-x-6">
          <div className="flex-shrink-0">
            {logoPreview ? (
              <Image
                src={logoPreview}
                alt="Collective Logo Preview"
                width={80}
                height={80}
                className="rounded-full object-cover"
              />
            ) : (
              <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-xs text-gray-500">No Logo</span>
              </div>
            )}
          </div>
          <div className="flex-grow">
            <Label htmlFor="logo-upload" className="sr-only">
              Upload new logo
            </Label>
            <Input
              id="logo-upload"
              name="logo"
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(e, setLogoPreview)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cover Image</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {coverPreview && (
            <div className="relative w-full h-48 rounded-md overflow-hidden">
              <Image
                src={coverPreview}
                alt="Collective Cover Preview"
                fill
                className="object-cover"
              />
            </div>
          )}
          <div>
            <Label htmlFor="cover-upload" className="sr-only">
              Upload new cover image
            </Label>
            <Input
              id="cover-upload"
              name="cover_image"
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange(e, setCoverPreview)}
            />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Saving...' : 'Save Branding'}
      </Button>
    </form>
  );
}
