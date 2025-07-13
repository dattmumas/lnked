'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { z } from 'zod';

import {
  createPersonalSubscriptionPlan,
  listPersonalSubscriptionPlans,
  type CreatePlanInput,
} from '@/app/stripe-actions/subscription-plans';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import type React from 'react';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  monthlyCost: z
    .string()
    .transform((val) => Number(val))
    .pipe(z.number().positive('Must be greater than 0')), // USD dollars
});

type FormState = {
  name: string;
  monthlyCost: string;
};

export default function PersonalSubscriptionPlansClient(): React.JSX.Element {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['personalPlans'],
    queryFn: async () => {
      const res = await listPersonalSubscriptionPlans();
      if ('error' in res) throw new Error(res.error);
      return res.plans;
    },
  });

  const mutation = useMutation({
    mutationFn: async (input: CreatePlanInput) => {
      const res = await createPersonalSubscriptionPlan(input);
      if ('error' in res) throw new Error(res.error);
      return res;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['personalPlans'] });
      setForm({ name: '', monthlyCost: '' });
    },
  });

  const [form, setForm] = useState<FormState>({ name: '', monthlyCost: '' });
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const parse = formSchema.safeParse(form);
    if (!parse.success) {
      setFormError(parse.error.errors[0]?.message ?? 'Invalid input');
      return;
    }

    mutation.mutate({
      name: parse.data.name,
      monthlyCost: parse.data.monthlyCost,
    });
  };

  return (
    <section className="space-y-6">
      <h2 className="text-lg font-medium">Subscription Plans</h2>

      {/* Existing plans */}
      {isLoading ? (
        <p>Loading…</p>
      ) : error ? (
        <Alert variant="destructive">{error.message}</Alert>
      ) : data && data.length > 0 ? (
        <ul className="space-y-2">
          {data.map((plan) => (
            <li key={plan.id} className="rounded-md border p-4">
              <p className="font-semibold">{plan.name}</p>
              <p className="text-sm text-muted-foreground">
                ${plan.monthlyCost.toFixed(2)} / month{' '}
                {plan.active ? '' : '(inactive)'}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p>No plans yet.</p>
      )}

      {/* Create new plan */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="plan-name">Plan Name</Label>
            <Input
              id="plan-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              spellCheck={false}
              autoComplete="off"
            />
          </div>
          <div>
            <Label htmlFor="plan-cost">Monthly Price (USD)</Label>
            <Input
              id="plan-cost"
              type="number"
              min={1}
              step={1}
              value={form.monthlyCost}
              onChange={(e) =>
                setForm({ ...form, monthlyCost: e.target.value })
              }
              required
              spellCheck={false}
              autoComplete="off"
            />
          </div>
        </div>

        {formError && <Alert variant="destructive">{formError}</Alert>}

        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Creating…' : 'Create Plan'}
        </Button>
      </form>
    </section>
  );
}
