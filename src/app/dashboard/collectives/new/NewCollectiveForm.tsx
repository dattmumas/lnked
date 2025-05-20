"use client";

import { useState, useTransition, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createCollective } from "./_actions"; // Server action

export interface CreateCollectiveFormState {
  message: string;
  fields?: Record<string, string>;
  issues?: string[];
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";

export default function NewCollectivePage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const generateSlug = (value: string) => {
    return value
      .toLowerCase()
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/[^a-z0-9-]/g, "") // Remove invalid characters
      .substring(0, 50); // Max length for slug
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setName(newName);
    setSlug(generateSlug(newName));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const result = await createCollective({
        name,
        slug,
        description,
      });

      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        setSuccessMessage("Collective created successfully! Redirecting...");
        // Optionally clear form fields
        setName("");
        setSlug("");
        setDescription("");
        // Redirect to the new collective's page or dashboard
        router.push(`/dashboard`); // Or `/collectives/${result.data.slug}` once that page exists
        router.refresh();
      } else {
        setError("An unexpected error occurred.");
      }
    });
  };

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Create New Collective</CardTitle>
          <CardDescription>
            Start a new newsletter collective. Choose a unique name and slug.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Collective Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="My Awesome Newsletter"
                required
                value={name}
                onChange={handleNameChange}
                maxLength={100}
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug (URL)</Label>
              <Input
                id="slug"
                name="slug"
                placeholder="my-awesome-newsletter"
                required
                value={slug}
                onChange={(e) => setSlug(generateSlug(e.target.value))}
                pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
                title="Slug can only contain lowercase letters, numbers, and hyphens."
                maxLength={50}
                disabled={isPending}
              />
              <p className="text-xs text-muted-foreground">
                {siteUrl}/{slug}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Tell us about your collective..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                maxLength={500}
                disabled={isPending}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {successMessage && (
              <p className="text-sm text-primary">{successMessage}</p>
            )}
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isPending}
              className="mr-2"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating..." : "Create Collective"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
