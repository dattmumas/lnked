import { ReadOnlyLexicalViewerClient } from './ReadOnlyLexicalViewerClient';

interface ReadOnlyLexicalViewerProps {
  contentJSON: string;
}

export function ReadOnlyLexicalViewer({
  contentJSON,
}: ReadOnlyLexicalViewerProps) {
  return <ReadOnlyLexicalViewerClient contentJSON={contentJSON} />;
}
