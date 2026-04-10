export function getRelatedPostsForProject(posts, relatedPostSlugs = []) {
  const relatedSlugSet = new Set(relatedPostSlugs);

  return posts
    .filter((post) => relatedSlugSet.has(post.slug))
    .sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());
}
