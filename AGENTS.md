UI for Creators to Manage Subscription Tiers: Provide a dashboard interface where a user or collective owner can define and view their subscription tiers. This could be in the Collective Settings page (for collectives) and perhaps in a user’s profile settings for individuals. For example, in src/app/dashboard/collectives/[collectiveId]/settings/EditCollectiveSettingsForm.tsx, we can add a section to manage tiers. After the form’s basic fields (name, slug, description, etc.), include a list of current tiers and a way to add a new tier. We can fetch the existing prices for that collective’s product by querying the prices table filtered by the collective’s product (join products on collective_id = collectiveId). Each price has unit_amount, currency, interval, etc., and possibly a description like "Gold Tier"
github.com
. Display these in a table or list within a card, for example:
Tier Name – Price – Billing Interval – Actions (Edit/Delete).
Since we are avoiding building a complex UI from scratch, use simple form elements: e.g., a small sub-form for adding a tier with fields for price amount, interval (dropdown of month/year), and an optional name/description. When submitted, call a new server action (maybe createPriceTier) that uses the Stripe API to create a new Price for the creator’s product. In that server action (which can be placed in src/app/actions/collectiveActions.ts or a new subscriptionActions.ts method), do something like:
ts
Copy
const stripe = getStripe();
await stripe.prices.create({ 
    product: productId, 
    unit_amount: amountInCents, 
    currency: 'usd', 
    nickname: tierName, 
    recurring: { interval: interval } 
});
and ensure the Stripe webhook will insert that into Supabase prices. Alternatively, use Supabase Admin to insert into prices directly (not recommended, better let Stripe be source of truth). After adding, refresh the tier list (or revalidate the page). Also include the ability to remove or disable a tier: maybe a “Delete” button next to each price that calls a server action to archive that price (Stripe prices can’t truly be deleted, but can be set inactive). Implement that by calling stripe.prices.update(priceId, { active: false }) and updating Supabase. For users (non-collective), if we want them to have similar tier management, we could provide a “My Subscription Tiers” section in their dashboard settings. However, if individual users are expected to use the default pricing only for now, we might defer a full UI for them. Focus on collectives first (since the products.collective_id mapping is explicit). Through this step, creators have control over subscription tiers. We must ensure we do not break existing Stripe onboarding: e.g., if a collective hasn’t connected Stripe, this section should prompt them to connect (possibly via the existing Stripe onboard flow
github.com
) before allowing tier creation. Use the style of existing forms: for instance, in the Collective Settings form, you can add another <Card> section labeled “Subscription Tiers” using the same Card components and buttons for Add Tier, styled consistently. Avoid external UI kits; simple inputs and the built-in table or list styles are sufficient.
