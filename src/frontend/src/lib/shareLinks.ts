export function getShareLink(shareId: string): string {
  const baseUrl = window.location.origin;
  return `${baseUrl}/share/${shareId}`;
}
