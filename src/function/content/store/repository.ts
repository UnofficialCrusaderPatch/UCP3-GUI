/** Return a repository link only for a GitHub source declared by the Store. */
export default function githubRepositoryUrl(source?: {
  method: string;
  url: string;
}) {
  if (source?.method !== 'github' || typeof source.url !== 'string')
    return undefined;
  const slug = source.url.trim();
  if (!/^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/.test(slug)) return undefined;
  return `https://github.com/${slug}`;
}
