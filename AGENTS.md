Task 10: Deployment Readiness (Vercel Optimization & Configuration)
Goal: Prepare the application for a smooth deployment on Vercel. This includes setting up environment variables, optimizing assets for production, and leveraging Vercel/Next features like Image Optimization and edge functions where appropriate.
Scope & Actions:
Configure Environment Variables: Ensure all required env vars are documented and set for production. Create a sample .env.example listing keys like NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (for admin functions)
github.com
, STRIPE_SECRET_KEY
github.com
, NEXT_PUBLIC_STRIPE_DEFAULT_PRICE_ID, and any others (e.g., if using Resend for emails, include RESEND_API_KEY). In Vercel, add these to the project settings. Also consider NEXT_PUBLIC_SITE_URL – setting this to the production URL will ensure functions like recommendations use the correct domain (as they fallback to VERCEL_URL if not set
github.com
). Having a well-documented env setup avoids surprises in production.
Image Optimization: Audit usage of images to ensure they go through Next.js optimization. The project uses Next/Image in places (e.g., FadeInImage wraps next/image
github.com
), but verify any <img> tags. For instance, in post content or PostCard, if a post cover image is implemented (there was a commented-out <img> for post cover
github.com
), switch it to <Image> with proper width, height, and alt. Configure next.config.js with images.remotePatterns for any external image domains (e.g., Supabase storage bucket domain) so that these images can be proxied and optimized by Vercel. This will drastically improve load times for media.
Static Asset Caching: Leverage Vercel’s CDN by marking static resources correctly. Next.js does this by default for \_next/static/\* assets. Additionally, if you have custom fonts or self-hosted scripts, ensure they are in public/ and will get long-term caching. If using next/font for custom fonts, it will optimize and inline them – consider that for any typography not already handled.
Vercel Functions and Edge: Review API routes for cold-start performance. Vercel will host these as Serverless Functions (or Edge Functions if opted). The Stripe webhook route, for example, should be configured with the correct runtime if needed (Edge functions have smaller memory but lower latency; if not using heavy Node libraries inside, an Edge runtime could be beneficial for the webhook). Ensure the Stripe webhook secret is added in Vercel and that the route is deployed publicly (test it with Stripe CLI). For Supabase real-time features, ensure the WebSocket upgrade (if any) is supported – Vercel supports WebSockets on custom domains, so that should be fine.
Final Production Checklist: Perform a final test deployment to Vercel’s preview. Verify that the app builds without errors (pnpm build passes on CI), and that all pages function behind Vercel’s environment. Test critical user flows on the deployed URL, including sign-up, creating content, subscribing with Stripe (using test keys/mode). Monitor the Vercel function logs for errors or performance issues during this test. If image domains or env vars are misconfigured, fix them now. Finally, set up any domain and SSL configurations for the Vercel app, and consider enabling Vercel Analytics or logging for ongoing monitoring. By completing this task, Lnked will be fully ready for launch on Vercel, with fast performance and all necessary configurations in place.
github.com
github.com
