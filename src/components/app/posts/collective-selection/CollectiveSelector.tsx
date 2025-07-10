'use client';

import { usePostEditorStore } from '@/lib/stores/post-editor-v2-store';

import type { Tenant } from '@/types/tenant.types';

export function CollectiveSelector({ collectives }: { collectives: Tenant[] }) {
  const setSelectedCollectives = usePostEditorStore(
    (state) => state.setSelectedCollectives,
  );
  const selectedCollectives = usePostEditorStore(
    (state) => state.selectedCollectives,
  );

  const handleCollectiveClick = (collectiveId: string) => {
    if (selectedCollectives.includes(collectiveId)) {
      setSelectedCollectives(
        selectedCollectives.filter((id) => id !== collectiveId),
      );
    } else {
      setSelectedCollectives([...selectedCollectives, collectiveId]);
    }
  };

  return (
    <div className="space-y-2">
      {collectives.map((collective) => (
        <button
          key={collective.id}
          type="button"
          onClick={() => handleCollectiveClick(collective.id)}
          className={`w-full text-left p-2 border rounded-md cursor-pointer ${
            selectedCollectives.includes(collective.id)
              ? 'border-blue-500'
              : 'border-gray-300'
          }`}
        >
          {collective.name}
        </button>
      ))}
    </div>
  );
}
