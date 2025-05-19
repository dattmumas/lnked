# Project Structure (as of [latest update])

src/
├─ app/
│ ├─ (auth)/
│ │ ├─ sign-in/
│ │ ├─ sign-up/
│ │ └─ layout.tsx
│ ├─ actions/
│ ├─ api/
│ │ ├─ auth/
│ │ ├─ collectives/
│ │ │ ├─ route.ts
│ │ │ └─ [collectiveId]/
│ │ │ └─ stripe-onboard/route.ts
│ │ ├─ comments/
│ │ ├─ like/
│ │ ├─ posts/
│ │ ├─ recommendations/
│ │ ├─ stripe-webhook/
│ │ └─ subscribe/
│ ├─ analytics/
│ │ ├─ page.tsx
│ │ └─ \_components/
│ ├─ dashboard/
│ │ ├─ layout.tsx
│ │ ├─ page.tsx
│ │ ├─ \_components/
│ │ ├─ collectives/
│ │ │ ├─ page.tsx
│ │ │ ├─ new/
│ │ │ ├─ \_components/
│ │ │ └─ [collectiveId]/
│ │ │ ├─ posts/
│ │ │ ├─ manage/
│ │ │ │ └─ members/
│ │ │ │ ├─ page.tsx
│ │ │ │ ├─ InviteMemberForm.tsx
│ │ │ │ └─ ManageMembersClientUI.tsx
│ │ │ ├─ settings/
│ │ │ │ ├─ page.tsx
│ │ │ │ └─ EditCollectiveSettingsForm.tsx
│ │ │ └─ subscribers/
│ │ ├─ my-newsletter/
│ │ ├─ new-personal-post/
│ │ ├─ posts/
│ │ │ ├─ new/
│ │ │ ├─ [postId]/
│ │ │ └─ \_components/
│ │ ├─ profile/
│ │ └─ [collectiveId]/
│ ├─ discover/
│ │ ├─ page.tsx
│ │ └─ \_components/
│ ├─ invite/
│ │ └─ [inviteCode]/page.tsx
│ ├─ newsletters/
│ │ ├─ [userId]/
│ │ ├─ \_components/
│ │ └─ layout.tsx
│ ├─ posts/
│ │ ├─ [postId]/
│ │ └─ \_components/
│ ├─ settings/
│ │ ├─ page.tsx
│ │ └─ \_components/
│ │ ├─ EditUserSettingsForm.tsx
│ │ └─ DeleteAccountSection.tsx
│ ├─ [collectiveSlug]/
│ ├─ favicon.ico
│ ├─ globals.css
│ ├─ layout.tsx
│ └─ page.tsx
├─ components/
│ ├─ ui/
│ │ ├─ button.tsx, card.tsx, input.tsx, ...
│ ├─ app/
│ ├─ landing/
│ └─ Navbar.tsx, Footer.tsx, ...
├─ lib/
│ ├─ data/
│ ├─ hooks/
│ ├─ schemas/
│ │ ├─ collectiveSettingsSchema.ts
│ │ └─ memberSchemas.ts
│ ├─ stripe.ts
│ ├─ supabase/
│ ├─ supabaseAdmin.ts
│ ├─ utils.ts
│ ├─ types.ts
│ └─ email.ts
├─ types/
├─ tests/
│ └─ e2e/
│ ├─ invite-accept.spec.ts
│ ├─ app.spec.ts
│ ├─ auth-flow.spec.ts
│ └─ core-flow.spec.ts
└─ ... (other project folders like public/, supabase/ configs, etc.)
