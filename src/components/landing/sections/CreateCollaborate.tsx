import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function CreateCollaborate() {
  return (
    <section className="w-full py-20 md:py-28 bg-muted/50 border-b">
      <div className="container mx-auto grid md:grid-cols-2 gap-12 px-4 items-center">
        {/* Illustration – two column feeds flowing into one channel */}
        <div className="w-full h-full flex items-center justify-center">
          <svg
            width="600"
            height="400"
            viewBox="0 0 600 400"
            xmlns="http://www.w3.org/2000/svg"
            className="max-w-full"
          >
            {/* Left feed lines */}
            {Array.from({ length: 5 }).map((_, i) => (
              <line
                key={i}
                x1="50"
                y1={60 + i * 50}
                x2="250"
                y2={60 + i * 50}
                stroke="hsl(var(--muted-foreground))"
                strokeWidth="3"
                strokeLinecap="round"
              />
            ))}

            {/* Right feed lines */}
            {Array.from({ length: 5 }).map((_, i) => (
              <line
                key={i + 10}
                x1="550"
                y1={60 + i * 50}
                x2="350"
                y2={60 + i * 50}
                stroke="hsl(var(--muted-foreground))"
                strokeWidth="3"
                strokeLinecap="round"
              />
            ))}

            {/* Converging arrow */}
            <path
              d="M250 200 L300 200 L300 140 L350 140"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polygon
              points="350,140 340,130 340,150"
              fill="hsl(var(--primary))"
            />
          </svg>
        </div>

        {/* Copy */}
        <div className="space-y-6">
          <h2 className="text-3xl md:text-4xl font-serif font-semibold">
            Create&nbsp;Your <span className="text-primary">Channel</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Launch a newsletter in minutes. Invite peers, editors or an entire
            collective to co-author. Every post can be solo or collaborative—
            you decide.
          </p>
          <p className="text-lg text-muted-foreground">
            Readers see a single, organised feed; collaborators share drafts,
            comments and revenue splits behind the scenes.
          </p>
          <Button asChild size="lg">
            <Link href="/sign-up">Start Writing</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
