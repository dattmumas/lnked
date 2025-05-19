Building a Next.js 15 Settings System with Supabase & Stripe
Overview: This guide compiles best practices and examples for implementing a robust User & Collective Settings system using Next.js 15 (App Router), Supabase (with RLS), and Stripe (Connect for payments). We cover server-side page architecture, data authorization, form handling with Zod, Stripe Connect integration, role management, account deletion workflows, testing strategies, and change tracking. Each section provides code snippets and references to open-source patterns. A summary table at the end maps each topic to key libraries, patterns, and tools.

1. Server-Side Authenticated Settings Pages (Next.js App Router)
   Modern Next.js (13+ with the App Router, referred to as Next.js 15 here) encourages Server Components for data-fetching and layout, even for authenticated pages. The pattern is to load protected data on the server and pass it into a Client Component for interactive features (like forms). Use Next.js Route Handlers or Server Actions to perform secure updates.
   Use Next.js Server Components with Supabase: In the page component (which runs on the server), create a Supabase client tied to the user's session and fetch the needed data. For example, using Supabase Auth Helpers, you can initialize a server client with the user's cookies/session. Then query the database (honoring Row-Level Security) for the settings data. If the user is not authenticated, or data is not found/allowed, redirect as needed (to sign-in or an error page)
   github.com
   github.com
   . This ensures the initial HTML is tailored to the user.
   // app/dashboard/collectives/[collectiveId]/settings/page.tsx
   const supabase = createServerSupabaseClient();
   const { data: { user }, error } = await supabase.auth.getUser();
   if (!user) redirect("/sign-in"); // ensure logged in

const { data: collective } = await supabase
.from("collectives")
.select("id, name, slug, description, tags, owner_id")
.eq("id", params.collectiveId)
.single();
if (!collective) redirect("/error");

// Authorization check (in addition to RLS):
if (collective.owner_id !== user.id) redirect("/unauthorized");:contentReference[oaicite:2]{index=2}

return (
<EditCollectiveSettingsForm 
     defaultValues={...} collectiveId={collective.id} currentSlug={collective.slug} 
  />
);
Above: The server component fetches the collective by ID and ensures the user is owner before rendering the settings form
github.com
. Unauthorized access is prevented both by RLS (the query would return no rows) and explicit check, then a redirect.
Preloading Data & Hydrating Client Forms: Pass the fetched data as props or defaultValues into your Client Component (form). This way the form fields are pre-filled without extra client-side fetches. In the example above, EditCollectiveSettingsForm receives defaultValues (like name, slug, description, etc.) and the collectiveId for use in updates. The client component can be a normal React component with \"use client\" and will render with these defaults.
Keep Layout and Navigation on Server: Use Next.js layouts and the App Router to wrap settings pages with common UI (e.g. a sidebar or topbar for a dashboard). Because the layout can also be a Server Component, you can enforce auth at a higher level (using Next.js middleware or a layout that checks session). Supabase Auth Helpers provide convenience methods to check session in Server Components or middleware.
Example – Next.js + Supabase Auth Template: Supabase’s official example for Next.js App Router demonstrates using createServerSupabaseClient in a Server Component to fetch user session and data, then rendering a client-side component
github.com
github.com
. This pattern ensures the initial page load contains the necessary data and is protected.
Avoiding Extra Round Trips: By fetching data server-side and hydrating the form, you eliminate the need for the client to fetch settings via an API call on load. This improves performance and security (data is not exposed via an open API call). Use Next.js 13+ Cache and Revalidation if needed – e.g., after form submissions, call revalidatePath to refresh static segments
github.com
.
References: Next.js 13 Server Components with Supabase example
github.com
, Code excerpt of server-side data load and auth check
github.com
. 2. Data Access & Authorization (Supabase RLS + Next.js)
Using Supabase with Row Level Security (RLS) adds an extra layer of safety by enforcing data ownership rules in the database. However, your application code should also validate permissions to provide clear errors and avoid relying solely on the database for logic. Key practices:
Define RLS Policies for Core Tables: In Supabase (Postgres), enable RLS on tables like users, collectives, collective_members, etc. Write policies such as “Collective: owner can update their collective; members can read basic info; others no access.” For example, a policy on collectives might allow select to members and update/delete only to the owner. RLS ensures that even if a client-side malicious request is made, the DB will reject unauthorized access.
Double-Check Ownership in Server Actions: When writing Next.js Server Actions or API routes, explicitly verify the acting user’s rights even though RLS is in place. This provides better error messages and defense in depth. For instance, before updating collective settings, confirm the current user is the collective’s owner in code:
const { data: collective } = await supabase
.from("collectives").select("owner_id, slug").eq("id", collectiveId).single();
if (!collective) return { error: "Collective not found." };
if (collective.owner_id !== currentUser.id) {
return { error: "You are not the owner of this collective." }; // fail safe
}
// ... proceed with update
This pattern (fetch, then check owner) is shown in the updateCollectiveSettings action
github.com
. Even if RLS prevented a non-owner from selecting the row, the code handles the “not found” as a permission issue gracefully.
Use Supabase Auth Session in Server: Supabase’s client can automatically apply RLS by using the user’s JWT. In Next.js App Router, use createServerSupabaseClient or the newer createRouteHandlerClient (for API routes) with cookies to get a Supabase client scoped to the user
github.com
. Then all queries (supabase.from(...).select()) are executed with that user’s identity. In our example, supabase.auth.getUser() returns the authed user, and subsequent queries respect RLS for that user.
Service-Role (Admin) Clients – When & How: A Supabase service_role client (using the secret service key) bypasses all RLS. Use it sparingly and never on the client-side, only in secure backend code, and only when the action truly requires elevated privileges. Example scenarios:
Reading or writing across tenant boundaries (e.g. retrieving a user by email globally, or inserting a record that the user themselves cannot insert).
Bulk management tasks, or implementing features like an admin dashboard, or complex invitation flows (discussed below).
When using a service-role client, you must implement authorization in code to avoid abuse. For instance, the MakerKit example passes both a regular client (RLS-enabled) and an adminClient to an invite function
github.com
. The regular client is used to ensure the inviter is a member and has permission (RLS would restrict those queries to their org), while the adminClient is used to fetch a user’s email and to insert the invite record bypassing RLS
github.com
github.com
. This approach lets the code say “since the current user is org owner, I will use admin privileges to create an invite on their behalf.” Always keep the service key secret (e.g., in environment variables) and never send it to the browser.
Explicit Ownership Checks in Actions: For critical mutations, combine RLS and explicit checks. In the collectiveActions.ts snippet, before inviting a user to a collective, the code checks the current user is the collective owner via a query filtered by both collective ID and owner_id
github.com
. Only if that returns a row do they proceed. This layered check prevents scenarios where a bug or misconfigured RLS might allow unintended access.
Avoid Over-fetching Sensitive Data: Even with RLS, ensure you only select the fields you need. For example, when loading settings, you might select id, name, slug, description, tags, owner_id and not things like internal IDs or secrets
github.com
. Columns like owner_id can be used for checks but should not be exposed to the client blindly (in this case it’s fine, as it’s the same as the user’s own ID if authorized).
References: Code example of layering RLS and code validation in an update action
github.com
, Supabase invite using admin client safely
github.com
github.com
. 3. Form Handling & Validation (Zod + React Hook Form)
Unified schema validation across client and server ensures consistency and security. We use Zod to define schemas for our forms and React Hook Form (RHF) for building the forms on the client. The same Zod schema (or very similar ones) can be used to validate input in the browser (providing instant feedback) and again on the server (to guard against tampering).
Define Zod Schemas for Settings Data: Create a Zod object schema representing the settings form fields. For example, for collective settings:
const CollectiveSettingsSchema = z.object({
name: z.string().min(3, "Name must be at least 3 characters").max(100),
slug: z.string().min(3).max(50)
.regex(/^[a-z0-9]+(?:-[a-z0-9]+)\*$/, "Slug can only contain lowercase letters, numbers, and hyphens."),
description: z.string().max(500).optional().nullable(),
tags_string: z.string().optional().nullable()
});
This schema encodes all field requirements (length limits, allowed characters, optionality). In our code, the client schema looks like this
github.com
, and the server uses a matching schema for safe parsing
github.com
.
Use Zod with React Hook Form: Integrate the schema with RHF via @hookform/resolvers/zod. This allows RHF to run Zod validation on every change or on submit. For instance:
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const form = useForm<CollectiveSettingsFormValues>({
resolver: zodResolver(CollectiveSettingsSchema),
defaultValues: props.defaultValues,
});
Now form will populate formState.errors with any Zod validation errors automatically
github.com
. Each field’s error message (defined in the schema) can be displayed next to the input. This gives immediate feedback for things like “name too short” or invalid slug format.
Client-Side UX: As shown in the EditCollectiveSettingsForm, each <Input {...register('name')}> ties into RHF, and we render errors if present
github.com
github.com
. We also provide niceties like auto-generating the slug from the name using watch() and useEffect (so if the user hasn’t manually edited the slug, it keeps updating based on name)
github.com
. This kind of UX (auto-slug, disabled submit until dirty, etc.) makes forms friendlier while maintaining validation rules.
Server-Side Validation in Actions: In the Next.js server action that processes the form (or API route), validate the input again with the same schema. Use schema.safeParse(data) to get a result without throwing. If it fails, you can return structured errors. In our example, the server action does:
const validated = CollectiveSettingsSchema.safeParse(formData);
if (!validated.success) {
return { success: false, error: "Invalid input.", fieldErrors: validated.error.flatten().fieldErrors };
}
const { name, slug, description } = validated.data;
// proceed to update in DB...
This ensures that even if a user bypassed client checks or used a custom client, the server will catch invalid input
github.com
. The flatten().fieldErrors gives an object mapping field names to error messages, which we can send back.
Structured Error Handling: Design a consistent way to return errors from server actions and display them in the UI. A common pattern: have the action return { success: false, error: "Message", fieldErrors: {...} }. The client form submission handler can then set a general error message or map fieldErrors to specific fields: In our RHF form, after calling the action, we do:
const result = await updateCollectiveSettings(...);
if (result.error) {
setError(result.fieldErrors
? result.error + " " + Object.values(result.fieldErrors).flat().join(", ")
: result.error);
} else {
setSuccessMessage("Updated successfully!");
// optionally reset form or redirect
}
Here we combine fieldErrors into the error string for simplicity
github.com
, but a more refined approach could use RHF’s setError on individual fields. The key is that server validation issues (including database errors like duplicate slug) are surfaced to the user in a helpful way. Our server action, for example, explicitly checks for slug uniqueness and returns a field-specific error if taken
github.com
github.com
, which the UI can then display under the slug field.
Reuse Schemas Across Client/Server: Where possible, define the schema once and import it in both places to avoid drift. If there are slight differences (e.g., server might allow some extra fields), you can compose schemas or at least share the core. In TypeScript, use z.infer<typeof Schema> to derive Types for form values that match the schema exactly
github.com
.
Production-grade Considerations:
Use debounce or onBlur for expensive validations (like if you had to check slug uniqueness via API, do it on submit or blur, not on every keystroke).
Ensure accessibility in forms (label every input, indicate errors with aria attributes, etc.).
For complex forms, break into smaller components or steps, but keep a single source of truth for schema to validate the final payload.
Testing: Unit test schemas (e.g., pass invalid data to ensure it fails as expected) and integration test the form (make sure an invalid form shows errors and doesn’t submit, etc.).
References: Zod schema and RHF usage in open-source example
github.com
github.com
. Server-side validation with Zod safeParse
github.com
. 4. Stripe Connect Integration (Express Accounts)
Integrating Stripe Connect (Express) into your app allows users or collectives to receive payments directly (e.g., payouts from subscribers). A full integration involves creating Connect accounts, guiding users through onboarding, handling the OAuth-like redirect flows, and responding to account status changes and subscription events. Here’s a lifecycle and best practices:
Onboarding – Account Creation and Link: Use Stripe’s API to create a Connect Account for the user or collective. Typically, you create an account with type “Express”. This returns an accountId (like acct_123...) which you should store in your database (e.g., in the user or collective record). Next, create an Account Onboarding Link so the user can fill in their details:
// On server (e.g., Next.js API route or server action)
const account = await stripe.accounts.create({ type: "express", email: user.email });
// Save account.id to Supabase (e.g., users.stripe_connect_account_id)

const accountLink = await stripe.accountLinks.create({
account: account.id,
refresh_url: `${BASE_URL}/dashboard/payments?refresh=true`,
return_url: `${BASE_URL}/dashboard/payments?onboarded=1`,
type: 'account_onboarding'
});
return NextResponse.json({ url: accountLink.url });
This flow is often triggered when the user clicks “Connect your Stripe account” in your UI. The API route (as shown in an example) fetches the stored account ID (or creates a new account if none) and then generates the onboarding URL
github.com
. The user is then redirected to Stripe’s Express onboarding form. The refresh_url and return_url should point to your app (perhaps a settings/payments page) to handle when the user either cancels or completes the onboarding. Tip: In development or testing, use Stripe’s test mode. You can often skip steps by using test info (e.g., entering a provided test SSN/EIN, etc.). Ensure your BASE_URL is correct (for local dev, might use something like http://localhost:3000 or an ngrok tunnel for Stripe to redirect to).
Handling the Return to Your App: After onboarding, Stripe will redirect back to your return_url (with onboarded=1 or something if you set it). At this point, the user’s Connect account might still be incomplete or pending verification. You should check the account status. Two approaches:
Polling on return: Upon landing on the return page, make a request to your backend to fetch the latest account details from Stripe. For example, call stripe.accounts.retrieve(accountId) which returns fields like charges_enabled, payouts_enabled, details_submitted, and any requirements. An example API route does exactly this: it pulls the stored stripe_connect_account_id for the user and calls stripe.accounts.retrieve to get the status
github.com
github.com
. You can then update the DB (mark the user as onboarded) and inform the UI. If charges_enabled is true, the user is fully onboarded to accept payments. If not, you can display a message or prompt them to finish requirements. You might use the requirements object (Stripe provides info on what info is missing) to guide them.
Webhooks: It’s recommended to also set up Stripe webhooks for events like account.updated for Connect accounts. Stripe will send an account.updated event when the account’s status changes (e.g., charges_enabled becomes true after verification). Your webhook handler can catch this and update the user’s record (e.g., set onboarding_complete=true or store the charges_enabled flag). This ensures if the user closes the window or the redirect fails, your system still knows when their account is ready.
Often a combination is used: quick polling on immediate return for UX, and webhooks for the definitive source of truth and handling future changes.
Account Dashboard & Status: Provide a section in user settings to display their Stripe Connect status. Show whether they have connected an account, and if so, whether it’s fully enabled. For example, show “Payments Receiving: Active” if charges are enabled (perhaps with a checkmark icon), or “Inactive” with a prompt to finish setup if not. You can list the payout bank details on file in a masked form (the example code fetches external_accounts.data[0] to show last4 of bank, etc.
github.com
). Also, allow the user to update their Stripe info: you can generate an account update link similar to onboarding (Stripe uses accountLinks.create with type "account_update" for Express accounts needing to update details). This is useful if their account is restricted or they want to change bank details.
Collective vs User Accounts: In a system with both individual users and collectives (organizations) that may receive money, you have a design decision:
Option 1: Each collective has its own Stripe Connect account. This means when a collective wants to start receiving funds (e.g., paid subscriptions), an account is created for that collective. Likely an individual (the owner) will complete the onboarding, but the Stripe account’s business type could be “Company” or “Individual” representing the collective. The account ID is stored in the collectives table.
Option 2: Use the owner’s Stripe account for payouts. Simpler, but then if ownership transfers, you have to move funds or reconnect.
The more robust approach is giving collectives their own Stripe account (so the payout details belong to the collective entity, not tied to a single user’s personal Stripe). This also aligns with how platforms like Substack or Patreon handle organizations. If implementing this, treat collective Stripe onboarding similar to user onboarding: e.g., “Connect a Stripe account for your Collective” which actually creates an Express account (with the owner as the representative). Store collectives.stripe_connect_account_id. In case of ownership transfer (if the app allows changing the owner of a collective), you might:
Require the new owner to re-onboard with a new Stripe account (because the previous account is under the old person’s info). You could detach the old one or mark it inactive.
Or, if the collective’s Stripe account is under a business entity, perhaps ownership change in-app doesn’t require Stripe changes. This is a complex area – likely simplest is to create a new account with the new owner’s details and update the collective’s record, and possibly disable the old Stripe account (or leave it but know it’s not used).
Pitfall: Never attempt to use one Connect account for multiple distinct users for payouts. Each legal entity/person needs their own account.
Creating Products and Prices (Subscription Tiers): To allow subscribers to pay, you need a Stripe Product and Price for the content. A common pattern is to create a default product/price when a user or collective first enables paid subscriptions. For example, when a user completes Connect onboarding, you can automatically call Stripe’s API to create a Product like “Subscription for [UserName]’s Newsletter” and a Price (say $5/month) if not already created. Save those IDs in the database (e.g., users.stripe_product_id, stripe_price_id). Alternatively, you let the user configure pricing, but having a sensible default (and allowing changes later) is user-friendly. You might also create a Stripe Customer object for each subscriber upon subscription (though Stripe Checkout can create that on the fly). Using Stripe’s Checkout Session for subscriptions simplifies a lot: you redirect a subscriber to a Checkout URL for the specific Price. The subscriber enters payment info, and Stripe handles subscription creation.
Subscription Lifecycle (Webhooks & Management): Once subscriptions are in place (subscribers paying creators), you must handle events:
customer.subscription.created/updated: when a user subscribes or changes plan.
customer.subscription.deleted: when a subscription is canceled (either by the subscriber or due to failed payments).
invoice.payment_failed: if a renewal payment fails (could alert the subscriber).
invoice.payment_succeeded: a payment went through (could log for analytics).
Stripe will send these to your webhook endpoint. Use the Stripe SDK to parse the webhook (verify signature). Then update your database accordingly:
On checkout.session.completed: mark the user as subscribed. In MakerKit’s example, they construct a Subscription object and attach it to the organization record when checkout completes
github.com
github.com
.
On customer.subscription.updated: update the subscription info (status, next billing date, etc.) in your DB
github.com
.
On customer.subscription.deleted: mark the subscription as ended – e.g., remove the subscription from the org or user, so they lose access after the current period
github.com
.
It’s good practice to store minimal info needed to manage access – for instance, store status (active/canceled/past_due), current period end, etc., or simply a boolean “isSubscribed” plus expiration date. MakerKit’s approach was to embed a full OrganizationSubscription object in the org, including fields like interval, cancel_at_period_end, timestamps, etc.
github.com
github.com
. Decide based on your needs – at minimum, know if a given user (subscriber) has an active subscription to a given creator, to control content access.
Canceling Subscriptions (by user): Provide a way for subscribers to cancel. E.g., a “Cancel Subscription” button in their account settings that calls your backend. On backend, use Stripe’s API to cancel the subscription (you might choose immediate or end-of-period cancellation). Also consider offering a link to Stripe’s Billing Portal for self-service; Stripe can generate a portal session link where users manage their payment methods and subscriptions. This can simplify a lot, though it may not be fully white-labeled.
After cancellation, your webhook for subscription.deleted will fire – double ensure you handle idempotently (cancel API call might already mark as canceled, then webhook arrives, etc., so make your DB updates idempotent or check current status before update).
Security Considerations:
Use separate Stripe API keys for test and live; never expose secret keys. In Next.js, environment variables (NEXT_PUBLIC for public ones like publishable key, and secret key only on server code) keep things safe.
Validate webhooks properly using Stripe’s signing secret to avoid fake calls
github.com
github.com
.
Only allow account creation and subscription purchase actions from authenticated users who should be doing them (e.g., only an owner can initiate connecting their Stripe for their account).
If using Connect, be mindful of Stripe fees and payouts: Express accounts require you to set a fee or commission if your platform takes a cut. You can set that in the transfer_data when creating charges or via Stripe Connect settings. Ensure you comply with Stripe’s requirements (e.g., having a TOS and privacy policy).
References: Stripe Connect onboarding link creation
github.com
, retrieving account status and fields (charges_enabled, payouts_enabled)
github.com
github.com
, MakerKit’s handling of subscription webhooks (completed, updated, deleted)
github.com
github.com
. 5. Membership, Invitations & Role Management
For a multi-user collective feature, robust role management and invitation flows are crucial. We need to handle inviting users to a collective, changing roles (promotions/demotions), and removing members, all with security and good UX in mind.
Roles & Permissions Design: Define clear roles (e.g., Owner, Admin, Member, Viewer, etc.) and what each can do. At minimum, an Owner of a collective has full control (can edit settings, invite/remove members, manage Stripe, delete the collective), whereas a normal member might only contribute content or have read access. These roles can be stored in a collective_members join table (user_id, collective_id, role). Possibly use an enum for roles in the database for consistency. Some systems implement granular permissions on top (like an permissions array), but often simple role checks (if role == 'owner') suffice. MakerKit’s example goes further with an RBAC setup (role and permissions tables, plus RLS functions to check permissions)
github.com
github.com
. For most cases, a simpler approach with role strings or enums and code logic is fine.
Invitation Flow: To add someone to a collective:
Invite Initiation: The owner (or an allowed role) enters an email to invite. If using Supabase, you need to handle both existing users and those who have not signed up yet:
Check if the email corresponds to an existing user in your users table. If using Supabase Auth, the auth.users (or a copy in public schema) can be checked. In our code, inviteUserToCollective searches the public users table by email
github.com
. This might require a service role if normal users can’t select from users (consider relaxing RLS to allow searching by email domain, or simply always use a secure backend function for invites).
If user exists, proceed. If not, decide: you can either create a placeholder invite (to be claimed on sign-up), or send a invite email prompting them to sign up first. A common pattern is generating an invite code or token.
Pending Invite Record: Create a record in collective_members (or a separate invites table) with status “pending” and a unique code. The record holds the target email and desired role. Use a UUID or random string as an invite code. MakerKit’s approach was to insert a new membership with a code field for pending invites
github.com
github.com
. They use a Supabase function (adminClient) to insert this, since the inviter themselves wouldn’t have direct insert rights (RLS would typically prevent non-admin inserts to membership except via a stored procedure or secure path).
Send Email: Email the invite link to the person. The link could be something like https://yourapp.com/invite/[code]. The email should state who invited them, to what collective, and what role. MakerKit’s example constructs an invite email with the organization name and inviter’s name
github.com
github.com
. Use an email service or Supabase Functions (Supabase can also trigger emails via its Auth or external integrations). Make sure not to reveal more info than necessary if the user hasn’t signed up (e.g., don’t leak private collective info to arbitrary email).
Acceptance Flow: When the user clicks the invite link:
If they are not signed in, redirect them to sign up or login (you may attach the invite code to the sign-up process so after registering, the invite can be applied).
If they are signed in (or after sign-up), call a backend action to accept the invite. This will find the pending invite by code, ensure the acting user’s email matches the invite email (or if you allow, owners can invite an existing user with different email? Typically invite email should match user’s email). Then update that membership record from pending to active (i.e., set an accepted_at timestamp or simply add the user_id to it now that it’s known).
If the invite was for an existing user, you might have inserted it with their user_id already (since you found them by email). In that case, acceptance is just a formality – maybe just flipping a status. If their account was found, you could even auto-accept (but better to let them confirm).
Ensure via RLS or logic that only the intended user can accept their invite. E.g., RLS policy: invite record is readable by users where invite.email = auth.email.
Post-Acceptance: Send a confirmation to the inviter and invitee. Update any cached membership lists.
Role Changes (Escalation/Demotion): Provide UI for owners (or admins with permission) to change a member’s role (e.g., make a member into an admin, or vice versa). This likely is a simple dropdown in the members list. On change:
In a server action or API route, verify the actor is allowed (only owners can change roles, especially promoting someone to owner might not be allowed unless transferring ownership – more below).
Update the collective_members record for that user. If using Supabase, an update query on the membership table changing the role field.
Transferring Ownership: If you allow changing the owner of a collective, decide how to implement. You could treat owner as just a role in the members table (with a unique constraint that only one member can be owner). Then “transfer ownership” is just changing roles: current owner becomes, say, admin, and another admin becomes owner. Or you explicitly have a collectives.owner_id field (like we do) that needs updating. In that case, a secure function should handle swapping the owner. Always double-check that the initiator of transfer is the current owner and the target is an existing member (or you invite them first).
After role change, reflect it in UI immediately (e.g., your members list can revalidate or just optimistically update).
Audit-log this action for security (at least in console or in a separate table) – e.g., “User X changed User Y’s role from member to admin in Collective Z at time T.”
Member Removal: Owners should be able to remove members. Important considerations:
If removing someone with higher privileges (like removing an admin), ensure the requester is allowed (owner can remove anyone; maybe admins can remove members but not other admins or owner).
Implement as a server action that checks if(currentUser.role === 'owner' ...) then performs a delete on the membership row. In our code, removeMember function first fetches the membership and the collective’s owner to ensure the current user is the owner
github.com
, then deletes the membership row
github.com
.
Optionally, prevent removing oneself if they are the last owner (i.e., an owner leaving the collective without transferring – handle that in account deletion flow).
If using soft-delete or audit logs, mark that the user was removed. You can also send a notification or email to the removed member (“You have been removed from Collective X”).
UI/UX for Membership Management:
Invitation UI: a simple form to input email and select role, with feedback (“Invite sent to xyz@example.com”).
Members List: show all current members with their role. Indicate the owner and perhaps disable certain actions on them (you can’t remove the owner unless transferring).
For each member, provide actions: change role (if allowed) and remove. Use confirmation dialogs for removal (“Are you sure you want to remove Alice? They will lose access...”).
Show pending invites in the list (e.g., as “(invited) – pending acceptance” next to the email, with maybe a “Resend invite” action).
Audit & Security: It’s wise to log membership changes. For instance, in the backend action, console.log or insert into an activity_log table something like “Owner X removed Y from collective Z.” This is useful if disputes arise.
Prevent Privilege Escalation Vulnerabilities: Enforce at every step that only authorized users can perform these actions:
Use RLS: e.g., a policy on collective_members could allow insert only if auth.uid() is the collective owner (you might implement via a Postgres function that checks collective.owner_id).
Code checks as mentioned.
Don’t rely solely on disabled buttons in UI – always check on server side.
Acceptance of Invite Edge Cases: If a user gets invited multiple times or is already a member:
Handle gracefully: your invite function can check if the user is already in the collective. In our example, it does a lookup in collective_members for that email/user before inviting
github.com
. If found, return an error (“User is already a member”) instead of sending another invite.
If an invite exists, maybe allow re-sending or updating it. MakerKit’s code checks existingInvite and if found, it updates the role or sends email again rather than creating duplicate
github.com
github.com
.
References: Example invite function with permission checks and use of admin client
github.com
github.com
. MakerKit’s logic for sending or updating an invite
github.com
github.com
. Removal and role-change patterns in our code (checks owner then deletes membership)
github.com
github.com
. 6. Account Deletion & Data Hygiene
Offering users the ability to delete their account is important (and often legally required), but it must be handled carefully to avoid orphaned data or unintended data retention. A “Delete Account” feature in this context should:
Double-Confirm Irreversibility: The UI should make it clear that deletion is permanent. Often this involves a confirmation step (e.g., type your account name/email to confirm, or a second “Are you sure?” dialog). This prevents accidents. Only after confirmation do you execute the deletion.
Order of Operations: On the backend, perform deletion in a sequence that avoids orphaning:
Check Ownership Dependencies: Determine if the user is the owner of any collective or any critical resource. If yes, enforce handling that first:
If they own a collective with other members or active subscribers, you might block deletion until they either transfer ownership or delete the collective entirely. It’s risky to have a collective with no owner. One approach: if a sole owner tries to delete account, either automatically delete their collectives (which could impact other users) or require them to promote someone else to owner. Most platforms require manual intervention here. For example, GitHub won’t let you delete your account if you’re the owner of an organization unless you transfer ownership or delete the org.
If the user is tied to active subscriptions (as a creator or subscriber), handle those (see below).
Cancel Stripe Subscriptions (if any): If the user is a subscriber to any paid content, consider canceling those subscriptions to stop future billing. Alternatively, since their Stripe customer will be deleted (next step), Stripe will effectively cancel them anyway. But to be clean, you can list their active subscriptions (store this in DB or fetch from Stripe) and cancel each via Stripe API.
If the user is a creator with subscribers (others paying them), what happens if they delete their account? Likely their content is gone and those subscriptions should be canceled and not charged further. This is a business decision: you should inform subscribers and cancel their payments. The example “pennyseed” code shows notifying pledgers of a deleted campaign
github.com
. Similarly, you might email subscribers “The collective you subscribed to has been deleted; your subscription is canceled and you won’t be charged further.”
Also, if they had a Stripe Connect account (as a creator), you should detach or close that (so no further payouts or tax forms). Stripe Connect accounts can be closed via stripe.accounts.del(accountId) for Express accounts
github.com
. That will mark the Connect account as closed (the user would have to create a new one to re-onboard if they sign up again).
Delete or Anonymize User Content: Remove personal data the user created:
Posts, comments, profiles, etc. You have options: hard-delete them, or “anonymize” by scrubbing personal identifiers. For content that might be useful to retain (like forum posts that others might still see), some platforms keep the content but replace the author name with “Deleted User”. Decide based on your app’s needs.
In our context (newsletters), if a user deletes account, probably their posts and any newsletter content should be deleted (or at least not publicly accessible). If collectives can exist without them (maybe not, if they were owner then collective is handled separately as above).
Supabase can cascade deletes if foreign keys are set with ON DELETE CASCADE, but be careful – cascading a user delete could accidentally wipe things other users still rely on (like a collective).
Consider a “soft delete” approach for a grace period – but if policy requires immediate, then skip that.
Delete from Supabase Auth: Use Supabase Admin API to remove the user’s authentication record entirely. For example, Supabase’s JS library provides supabase.auth.admin.deleteUser(uid) which deletes them from the auth system (they can’t log in anymore, and their UID/email can be reused by someone else if needed). The code example shows this call
github.com
. Do this after handling all above, because once removed from auth, you can’t easily get their UID or email to perform other operations (so gather needed info first).
Delete User Profile Data: Remove the user’s row from your public users or profiles table (if you keep one separate from auth). In the example, they delete from profile table by user ID
github.com
. This should be done at the very end because you might need some info from that profile for earlier steps (like stripe_customer id, email, etc.). Alternatively, if you set up foreign keys with cascade, deleting auth user might automatically remove profile via trigger – but make sure of order.
Stripe Customer Deletion: If you created a Stripe Customer object for the user (for when they purchase things), you should delete that via Stripe API to remove their card info. The Pennyseed code calls stripe.customers.del(profile.stripe_customer)
github.com
. This is not strictly required (Stripe might auto-delete customers with no payment info after a long time), but for privacy it’s good to remove it. Ensure you only call this if the customer exists and belongs to your Stripe account.
Stripe Connect Account Deletion: As mentioned, close the Connect account via API if it exists
github.com
. Note: Stripe might require all balances to be paid out or zero before closing. It might immediately close Express accounts though. Any scheduled payouts get canceled.
No Orphans: Ensure that after these steps, there’s no “hanging” data:
Collectives with no owner: decide if collective is deleted or someone else was assigned. Perhaps if the collective had other admins, you could promote one to owner automatically (with an email notification). This can be tricky to do silently; explicit transfer is cleaner.
Active subscriptions to a deleted user: they should be canceled as above.
Posts or comments: either deleted or left as anonymous. If you leave them, ensure personal info is scrubbed (username etc.).
Transactional or Idempotent Operations: Because many steps are involved, consider wrapping in a transaction (if all in the DB) or making the process idempotent/restartable. For instance, if the process fails halfway (network error after deleting some data but before deleting auth user), you want to be able to safely retry. One strategy: mark the user record as “deletion_in_progress” at the start, and if a retry is needed, skip already done steps. Or use a backend function or queue that attempts all steps and logs outcome.
Audit and Logging: Keep a record (maybe in a separate table or even off-site logging) of account deletions: which user ID was deleted and when. This helps in case of mistakes or debugging.
User Experience after Deletion: Once deletion is done, log the user out (their session should be invalid anyway after auth deletion). Show a message like “Your account has been deleted. Sorry to see you go.” If they try to log in again, it should be as if a new account (if they re-register).
Manual Ownership Transfer Requirement: To explicitly enforce ownership transfer, you could:
During the deletion confirmation step, check if the user is an owner of any collective. If yes, list those and require them to either (a) delete those collectives, or (b) transfer them to someone else by selecting a new owner from members. Provide UI to do that. Only once that’s resolved, allow deletion.
Alternatively, automatically transfer to the next available admin or member, but this could be problematic if not agreed upon. It’s safer to block and instruct the user.
If the user insists on deletion without transferring, you might choose to also delete those collectives (with notice to other members) – but this can be destructive, so default to requiring transfer.
Example Implementation: The snippet from Pennyseed demonstrates a deletion flow:
Admin or user triggers deletion (they allowed an admin to delete any user or a user to self-delete)
github.com
github.com
.
It deletes related data: their campaigns (like collectives)
github.com
, pledges (like subscriptions)
github.com
.
Deletes their Stripe customer and Connect account
github.com
.
Deletes the profile row and then the auth user
github.com
.
Returns success
github.com
.
They also emailed pledgers before deletion to inform them a campaign was deleted
github.com
– analogous to notifying subscribers.
Data Sanitization: If fully deleting content is not desirable, sanitization might mean overwriting personal fields. For example, rather than deleting comments, you could set comment.author_id = NULL and change author_name to "Deleted User". Or in analytics, replace user IDs with an anonymous ID. This allows stats to remain aggregated without personal data.
References: Account deletion API example (deleting Stripe customer, Stripe account, profile, and auth user)
github.com
github.com
, logic to email users about deleted content
github.com
. 7. Testing Strategy (Playwright E2E & Jest Unit)
Given the complexity of auth and payments, a combination of end-to-end (E2E) tests and targeted unit tests will help ensure reliability:
Playwright E2E for Authenticated Flows: Playwright can automate a headless browser, which is perfect for simulating user actions:
Logging In: Write a helper to programmatically sign in the test user (for Supabase, you might seed a user in the test database and use supabase auth API or simply fill the login form in the UI).
Stripe Connect Onboarding: Full automation here is tricky because it involves Stripe’s external website. One approach is to use Stripe’s test mode + automate the form:
Playwright can navigate to the Stripe onboarding URL (which in test mode is a Stripe domain). Since it’s a test, you can fill the required fields. Stripe has test data (like test SSNs, etc. documented) that you can use. Automating an external site might be brittle and possibly not allowed by Stripe’s terms for automation. If not feasible, you could mock this step in tests by faking a successful return. For example, instead of actually filling Stripe’s form, intercept the accountLink creation and directly set the user as onboarded.
Alternatively, use Stripe’s test Express onboarding flow which sometimes allows skipping steps (e.g., there’s often a “Skip for now” in test).
Ensure your test waits for the redirect back and then verifies that the UI shows the account as connected (e.g., the “Receiving Active” indicator appears).
Subscription Checkout Flow: Similar challenge – Stripe Checkout opens a Stripe page for payment. You might bypass it by using Stripe’s frontend test APIs or the Stripe CLI to simulate a checkout session success. However, you can also run Playwright in headed mode and manually complete checkout if testing end-to-end. A more practical approach: use Stripe’s API in tests to create a subscription directly via the backend (or trigger webhooks).
You can use Stripe’s test webhooks: For example, use the Stripe CLI in listen mode during tests, or have a utility to send fake webhook events to your app. The code snippet from a project uses a helper to post a fake webhook event to the dev server
github.com
. You could do similar in Playwright by calling your webhook endpoint with a test payload and header (bypassing Stripe). E.g., simulate checkout.session.completed or customer.subscription.deleted events and then verify your database updates or UI changes.
Cancel Subscription Flow: Write an E2E test where:
A user (subscriber) is logged in, goes to their subscription settings, clicks “Cancel subscription”.
The UI might ask to confirm; then the request is sent to your API.
Use Playwright to confirm the subscription is marked canceled (maybe the status text changes to “canceled” or the UI no longer shows an active sub).
Optionally verify a webhook was received or database entry changed (could require direct DB access in test or an API endpoint to fetch status).
General Tips:
Use fixtures to seed data: e.g., ensure there’s a collective, an owner user, a member user, etc. You might seed the DB via Supabase SQL or use your API calls.
Cleanup after tests: delete any test users or stripe objects (Stripe has an API to delete test data or you can reuse one test account).
Playwright can integrate with CI, but be careful with hitting external Stripe – consider using a Stripe test environment or mocking as much as possible to keep tests deterministic.
Jest (or Vitest) Unit/Integration Tests:
Supabase queries: Testing code that calls Supabase can be tricky. One approach is to mock the supabase client methods. For example, if you have a module for your DB calls, use dependency injection or jest mocks to simulate .from().select().eq().single() returning expected data. This can ensure your logic (like the if conditions on results) works. However, it doesn’t truly test RLS or the DB.
For more realistic tests, you could use a test database. Supabase provides ways to run a local instance (via Docker). In a CI, you could spin up a supabase container with the schema, or use an alternate schema on the same DB. Then your tests can connect (with service role) and insert/fetch to verify RLS behavior. This is more like integration testing the DB. It might be overkill unless you suspect issues in RLS rules.
You can also test Supabase-related logic by invoking Edge Functions or API routes in a controlled way. For example, using Next.js request testing utilities to call your route handlers with a dummy JWT to simulate a user.
Zod schema tests: These are straightforward unit tests: for each schema, have a few examples of valid and invalid data, and assert that schema.safeParse(data) succeeds or fails appropriately. This ensures your error messages and constraints are as expected. Since Zod is pure JS, these tests are fast and don’t need any special setup. It’s especially useful if you have custom refinements or complex union schemas.
Server Actions/Functions tests: If you factor your server logic into standalone functions (like our updateCollectiveSettings is an async function), you can call that in a test by providing a test context. Since it internally calls Supabase, you might again mock those calls. For example, use Jest to spy on supabase.from(...).update(...) and have it return a preset error or success. Then assert that the function returns the correct result object (with success: false and error message, etc.) for various scenarios (not owner, validation fail, slug conflict, etc.).
Playwright for UI logic: You can also use React Testing Library and Jest to test the client components (like the form component) in isolation. Render the form with defaultValues, simulate user input (e.g., change name to too short, blur field), and assert that an error message appears. Then simulate a valid submission but mock the updateCollectiveSettings action to return an error (like slug taken) and see if that error is shown to user. This ensures your form error handling logic works.
Testing Stripe Webhooks: As mentioned, one way is to simulate them. You can have a Jest test that calls your webhook handler function with a sample event JSON. MakerKit’s docs show handling webhooks in code
github.com
, which you could call directly. Just be careful to disable the Stripe signature verification in that context or provide a valid signature. Stripe provides sample event payloads in their docs or via CLI (stripe trigger event_name). Use those to ensure your parsing logic populates the DB correctly.
Alternatively, integration test the whole flow: create a real Checkout Session (Stripe API) with test API, fulfill it (Stripe CLI trigger checkout.session.completed), and see if your DB updated. This is more complex but closer to real.
E2E Authentication: Because Supabase uses a magic link or email/password, consider using Supabase email/password for test users (straightforward) or the service role to create a JWT for tests. Supabase has admin ability to generate a user and issue a JWT. You might use that to set a cookie in Playwright so you start an already authenticated session (to skip UI login steps). The auth helpers for Next.js allow setting the cookie header to authenticate requests in tests.
References: Example of sending a fake Stripe webhook event in tests
github.com
. General patterns for testing Next.js + Supabase can be found in Supabase documentation or community examples, though a lot will be custom. 8. Changelog & Migration Discipline
Maintaining a consistent changelog and database migrations is vital, especially in a collaborative environment or when using AI coding tools that might make changes. Here’s how to enforce discipline:
Per-File Changelog Updates: A novel approach (as seen in the lnked project) is to require a changelog entry for every file edited, especially for AI contributions. In this project, there’s a change_log.json where each entry maps a UUID to a file path and a short description of the change
github.com
. The rules specified that any code change by the AI must append to this JSON
github.com
. To enforce this:
Process & Automation: You can set up a git pre-commit hook or a CI check that scans the diff. For example, a script can check: if any .ts/.tsx files changed, did change_log.json also change? And perhaps even validate the format (contains the file paths that were modified).
Code Review/CI: If using GitHub, a CI pipeline can run a job to verify changelog entries. The README indicates maintainers might reject a PR if changelog isn’t updated
github.com
.
Developer (or AI) Guidelines: Clearly document (like they did) that every change needs a changelog line. Since in this scenario AI is contributing code, the AI was instructed to update the changelog – a unique situation. In a human team, you might instead rely on commit messages or PR descriptions for changelogs, but a per-file log is more granular.
The benefit of per-file logging is traceability: a future contributor or AI agent can see a history of what was changed in that file and why, without digging through commit history. It’s almost like an inline historical record. The downside is overhead and potential merge conflicts in that JSON if many changes happen concurrently.
Tooling: There aren’t off-the-shelf tools that do exactly per-file JSON logging (because it’s uncommon), but you can adapt Changesets or similar tools:
The Changesets library is more for package versioning, but it encourages writing a markdown snippet for any change which later aggregates into a changelog. In a monorepo, this ensures each package’s changes are documented. While not per-file, it’s per PR or per feature.
Custom scripts: A simple Node script can read git diff and append entries to JSON. If using AI integration (like Cursor or other GPT tools), you could programmatically enforce it by hooking into their output (which is what appears to be done via those .cursor rules).
Database Schema Migrations: When multiple people or AI are altering the database schema, you need a single source of truth for migrations:
Use a migrations folder (e.g., supabase/migrations/) and require that any DB change (creating a table, altering a column, etc.) goes through a migration script. Supabase CLI can help: supabase db diff and supabase db push can generate migrations. You might integrate this into development workflow:
Example: After AI adds a new column in code or in the DB, run a command to update the migration file.
If AI is writing code that implies a DB change, it should also output the SQL migration (the project maintainers could require that in the prompt rules).
Have a convention for naming and ordering migrations (Supabase uses timestamp prefixes). In code reviews or CI, ensure that the latest migration has been run against the testing/staging DB so nothing is out of sync.
Collaborative tip: If two branches add different migrations, you might get conflicts; just resolve by re-ordering or merging the SQL appropriately.
Keep migration files under version control and perhaps a brief changelog entry of schema changes too (some put a summary in the main CHANGELOG).
Changelog Updates per Release: In addition to the per-file technical log, maintain a high-level CHANGELOG.md for releases or user-facing changes. The question specifically mentions per-file, but generally a project will also want a human-readable changelog. Since the AI logging covers internal changes, you might aggregate or filter those for release notes.
AI-assisted Environments: When using AI, it might hallucinate or skip steps (like forgetting a migration). To mitigate:
Include checks in your prompts or tooling that after code generation, the AI is reminded to handle migrations. The README clearly instructs GPT to update documentation and follow official guides for major changes
github.com
.
Run tests after changes: If the AI added a reference to a new column and forgot to create it in SQL, tests will fail. You can catch it then and correct (maybe prompt the AI to fix migration).
Use a shadow database for tests where schema mismatches cause immediate errors. Supabase’s supabase test setup or simply connecting to an H2/postgres in-memory could catch missing migrations if your code tries to access a non-existent table.
Tools for Schema Tracking: Besides Supabase’s migration system, others:
Prisma or Drizzle ORM: These can manage schema in code and migrate automatically. But since you’re using Supabase directly, you likely stick to raw SQL migrations.
pgmig or Flyway: any migration tool can be used similarly.
The key is consistency: ensure everyone (and AI) updates the schema in the same way. Possibly restrict direct edits to the live database outside migrations in team practice.
Summary Table Enforcement: One interesting idea is to track changes by file in the changelog and maybe ensure migrations are mentioned. For example, if a file related to DB is changed, require that a migration file is referenced in changelog as well. This might be over-engineering, though.
Communication: In a team (especially if AI is making PRs), use PR templates requiring the author to state if a migration is needed and if the changelog is updated. That way maintainers have a checklist when reviewing.
References: Changelog enforcement rules from the project
github.com
, illustrating how every code change must correspond to a JSON entry with UUID and summary. This is an unusual but effective discipline to maintain traceability for AI changes. Also see MakerKit’s ADR on applying RLS to all tables
github.com
, showing the importance of documenting such wide changes.
Summary of Key Patterns & Tools
Finally, here’s a high-level mapping of each topic to the libraries, tools, and example implementations discussed:
Aspect Key Libraries/Tools Best Practices & Patterns (with sources)
Server-Side Settings Pages Next.js 13+ App Router, Supabase Auth Helpers (createServerSupabaseClient) Server Components load protected data, redirect if unauthenticated
github.com
. Pass data to client form for hydration. Use Next Server Actions for form submission. Example: fetch collective and check ownership on server
github.com
.
Data Access & AuthZ Supabase RLS (Postgres policies), Next.js server actions, Supabase JS client (service vs anon) Enable RLS in DB for owner/member isolation. In code, double-check critical permissions (e.g. owner ID match)
github.com
. Use service-role Supabase client only on backend for special cases (e.g. invite by email) with strict code checks
github.com
github.com
.
Form Handling & Validation Zod, React Hook Form, @hookform/resolvers/zod Define unified Zod schemas for forms (min/max, regex, etc.)
github.com
. Use zodResolver in RHF for client-side validation
github.com
. Re-validate on server (Zod safeParse) in actions
github.com
. Return structured errors (fieldErrors) and display them in UI.
Stripe Connect Integration Stripe API & Dashboard, stripe Node SDK, Stripe webhooks, Supabase DB for IDs Onboarding: create Express account & accountLink
github.com
, store account ID. Return flow: check charges_enabled via Stripe API
github.com
github.com
or handle account.updated webhook. Use Connect accounts per collective or user; require re-onboarding if owner changes. Subscriptions: create Stripe Products/Prices; use Checkout for subscriber payments. Handle checkout.session.completed and subscription updated/deleted webhooks to sync status
github.com
github.com
. Cancel subscriptions on deletion to avoid orphan payments.
Membership & Roles Supabase (tables for members, invites), Postgres enums or join tables, Emails (SMTP or third-party) Use a join table collective_members(user, collective, role). Invites: Owner triggers email invite with a code. Insert pending membership using admin privileges if needed
github.com
. Accept invite by code linking to user. Roles: Implement role update action (owner-only) to change enum. Possibly single-owner constraint. Removal: owner-only action to delete membership
github.com
github.com
. UI: member list with roles and actions, show pending invites. Log changes for audit.
Account Deletion Supabase Auth Admin API, Stripe API, Database cascades or scripts, Confirmation UI Multi-step: Check dependencies (ownerships, active subs). If owner of collective, require transfer or collective deletion. Use Stripe API to delete customer & Connect acct
github.com
. Cancel any subscriptions. Delete user’s content or anonymize. Remove user from users/profile table then use supabase.auth.admin.deleteUser(uid)
github.com
. Confirm irreversible action with user.
Testing (E2E & Unit) Playwright for E2E, Jest (or Vitest) for unit, Stripe CLI (for test webhooks), Supabase CLI (for test DB) E2E: Simulate login and secure pages. Use Stripe test mode: e.g., automate Connect onboarding (or mock it) and verify dashboard updates. Simulate Stripe webhooks via direct POST in tests
github.com
. Unit: Mock Supabase calls to test auth logic (e.g., invite fails if not owner). Test Zod schemas with sample inputs. Use React Testing Library to test form component validation. Ensure migrations applied in test DB to catch schema issues.
Changelog & Migrations Git hooks/CI, change_log.json (custom), Supabase Migrations (SQL files), Changesets Enforce devs/AI to update a changelog entry per file change
github.com
(e.g., via pre-commit or CI checks). Use timestamped SQL migration files for DB changes; run Supabase CLI to generate and apply migrations consistently. Review schema changes in PRs. Document important changes in a human-readable CHANGELOG. In AI pair programming, explicitly prompt for migration scripts when code touches schema.
Each of these practices helps ensure your Next.js + Supabase + Stripe application remains secure, maintainable, and scalable. By following the patterns above – from server-side rendering of auth data to strict role checks, robust validation, proper Stripe integration, and diligent change tracking – you can build a production-ready settings system that users trust.
