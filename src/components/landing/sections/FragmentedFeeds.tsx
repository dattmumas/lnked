import SlideInCard from "../SlideInCard";

const feeds = [
  {
    id: 1,
    title: "Monday Marketing Memo",
    description: "A 20-minute read buried in your inbox.",
  },
  {
    id: 2,
    title: "Thursday Tech Thoughts",
    description: "Another tab, another context-switch.",
  },
  {
    id: 3,
    title: "Weekend Wellness",
    description: "Saved to read-later… and forgotten.",
  },
];

export default function FragmentedFeeds() {
  return (
    <section className="w-full py-20 md:py-28 bg-background text-foreground border-b">
      <div className="container mx-auto grid md:grid-cols-2 gap-12 px-4">
        {/* Cards column */}
        <div className="space-y-6 order-2 md:order-1">
          {feeds.map((f, i) => (
            <SlideInCard
              key={f.id}
              index={i}
              title={f.title}
              description={f.description}
            />
          ))}
        </div>

        {/* Copy column */}
        <div className="order-1 md:order-2 flex flex-col justify-center space-y-4">
          <h2 className="text-3xl md:text-4xl font-serif font-semibold">
            Fragmented
            <span className="text-primary"> Feeds</span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Content arrives in isolation—different emails, tabs and apps.
            Keeping up feels like whiplash.
          </p>
          <p className="text-muted-foreground text-lg">
            Lnked weaves these voices together so you can follow ideas, not
            inboxes.
          </p>
        </div>
      </div>
    </section>
  );
}
