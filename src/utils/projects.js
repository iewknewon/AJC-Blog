export function getRelatedPostsForProject(posts, relatedPostSlugs = []) {
  const relatedSlugSet = new Set(relatedPostSlugs);

  return posts
    .filter((post) => relatedSlugSet.has(post.slug))
    .sort((a, b) => {
      const aDate = a.publishedAt ?? a.updatedAt;
      const bDate = b.publishedAt ?? b.updatedAt;
      return bDate.getTime() - aDate.getTime();
    });
}
