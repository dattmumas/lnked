export function extractFirstUrl(text: string): string | null {
  const urlRe =
    /(https?:\/\/[\w.-]+(?:\.[\w.-]+)+(?:[\w\-._~:/?#[\]@!$&'()*+,;=]*)?)/gi;
  const match = text.match(urlRe);
  return match ? match[0] : null;
}
