import { Loader2 } from 'lucide-react';
import dynamicImport from 'next/dynamic';
import { Suspense } from 'react';

// Dynamic import for the main chat interface to reduce initial bundle size
const ChatV2Interface = dynamicImport(
  () =>
    import('@/components/chat-v2/ChatV2Interface').then((mod) => ({
      default: mod.ChatV2Interface,
    })),
  {
    loading: () => (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Loading chat interface...
          </p>
        </div>
      </div>
    ),
  },
);

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic';

export default function ChatV2Page(): React.JSX.Element {
  return (
    <div className="h-screen overflow-hidden">
      <Suspense
        fallback={
          <div className="flex h-screen items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Initializing chat...
              </p>
            </div>
          </div>
        }
      >
        <ChatV2Interface />
      </Suspense>
    </div>
  );
}
