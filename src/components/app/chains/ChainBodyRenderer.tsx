'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react';

interface MentionData {
  type: 'user' | 'post';
  id: string;
  text: string;
  offset: number;
  length: number;
  username?: string;
}

interface ChainBodyRendererProps {
  content: string;
  mentions: MentionData[];
}

export default function ChainBodyRenderer({
  content,
  mentions,
}: ChainBodyRendererProps) {
  const router = useRouter();

  if (!mentions || mentions.length === 0) {
    return <p className="whitespace-pre-wrap">{content}</p>;
  }

  const sortedMentions = [...mentions].sort((a, b) => a.offset - b.offset);

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  sortedMentions.forEach((mention, index) => {
    // Add the plain text part that comes before the current mention
    if (mention.offset > lastIndex) {
      parts.push(
        <React.Fragment key={`text-${index}`}>
          {content.substring(lastIndex, mention.offset)}
        </React.Fragment>,
      );
    }

    // Create the interactive element for the mention
    let mentionElement: React.ReactElement;
    if (mention.type === 'user') {
      mentionElement = (
        <Link
          key={`mention-${index}`}
          href={`/profile/${mention.id}`}
          className="text-accent hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {mention.text}
        </Link>
      );
    } else {
      // 'post'
      mentionElement = (
        <button
          key={`mention-${index}`}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`?post=${mention.id}`, { scroll: false });
          }}
          className="text-accent hover:underline"
        >
          {mention.text}
        </button>
      );
    }
    parts.push(mentionElement);

    lastIndex = mention.offset + mention.length;
  });

  // Add any remaining plain text after the last mention
  if (lastIndex < content.length) {
    parts.push(
      <React.Fragment key="text-final">
        {content.substring(lastIndex)}
      </React.Fragment>,
    );
  }

  return <p className="whitespace-pre-wrap">{parts}</p>;
}
