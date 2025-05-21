Support Multiple Subscription Tiers in the Database: Upgrade the subscription model to handle tiered offerings (e.g., Bronze/Silver/Gold tiers). Supabase’s schema already has a prices table and products table (likely synced with Stripe) that can store multiple price points
github.com
github.com
. Each content creator (user or collective) should be associated with a Stripe Product under which multiple Prices (tiers) can exist. In the current schema, the products table has a collective_id field linking a product to a collective
github.com
. We should use this: when a collective connects their Stripe account and sets up tiers, those tiers would appear as prices tied to a product for that collective. For individual users, we might need a similar linkage. Since products.collective_id is nullable
github.com
, we can interpret collective_id = NULL as a product for an individual user (we might add a user_id or use metadata in the product to store which user it’s for). Assuming a single personal newsletter product per user, we could decide that each user has an implicit product (perhaps identified by user’s ID in product metadata) – or create a product on-the-fly when a user offers paid subscriptions. The implementation plan:
When a user or collective first enables paid subscriptions, create a Stripe Product for them (via Stripe API) and store it in the products table with the appropriate collective_id or metadata for user. For collectives, update the collectives row with stripe_product_id if needed (or rely on the join table).
Allow multiple Price entries for that product: e.g., monthly $5, monthly $10, yearly $100 etc. The prices table already includes fields like currency, interval, and amount
github.com
 to differentiate tiers. We should ensure these tables are being populated (possibly via Stripe webhooks or Admin API calls). The Stripe webhook handler we have (stripe-webhook/route.ts) should already upsert subscription records, but we might need to extend the setup to fetch product/price info.
No direct schema changes are needed for tiers, since the structure supports multiple prices. Just verify we have enums for interval (price_interval: month, year, etc.
github.com
) and possibly a nickname or description for each price (Stripe allows a nickname/metadata which is stored in prices.description or prices.metadata fields
github.com
). We will use these fields to label tiers in the UI. This step is mostly planning out how the data is structured; the actual creation of tiers will be handled next.
Summarizing: one creator -> one product -> many prices (tiers). Ensure the subscriptions table can link to any of those price tiers (it stores stripe_price_id for each subscription
github.com
github.com
, which is fine). There’s no breakage here since we’re not removing the existing “default price” logic but extending it. The default tier (perhaps called "Supporter") can remain as a fallback using NEXT_PUBLIC_STRIPE_DEFAULT_PRICE_ID for creators who haven’t configured custom tiers
github.com
, but now we support multiple options.
