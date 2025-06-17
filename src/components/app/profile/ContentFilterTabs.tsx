"use client";

const tabs = [
  { id: "all", label: "All" },
  { id: "articles", label: "Articles" },
  { id: "videos", label: "Videos" },
  { id: "audio", label: "Audio" },
];

interface ContentFilterTabsProps {
  active: string;
  onChange: (tab: string) => void;
}

export default function ContentFilterTabs({
  active,
  onChange,
}: ContentFilterTabsProps) {
  return (
    <div className="flex space-x-2 border-b border-border mb-4">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`px-3 pb-2 text-sm font-medium transition-colors border-b-2${
            active === tab.id
              ? " border-accent text-accent"
              : " border-transparent text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
