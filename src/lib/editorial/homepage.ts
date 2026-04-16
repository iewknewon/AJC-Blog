type DatedItem = {
  slug: string;
  publishedAt: Date | null;
  updatedAt: Date;
};

type HomepageEditionInput<TPost extends DatedItem, TSubject, TProject> = {
  featuredPosts: TPost[];
  latestPosts: TPost[];
  learningSubjects: TSubject[];
  featuredProjects: TProject[];
};

const sortByRecency = <T extends DatedItem>(items: T[]) =>
  [...items].sort((a, b) => {
    const aTime = (a.publishedAt ?? a.updatedAt).getTime();
    const bTime = (b.publishedAt ?? b.updatedAt).getTime();
    return bTime - aTime;
  });

export function buildHomepageEdition<
  TPost extends DatedItem,
  TSubject extends { slug: string },
  TProject extends { title: string }
>(input: HomepageEditionInput<TPost, TSubject, TProject>) {
  const orderedFeatured = sortByRecency(input.featuredPosts);
  const orderedLatest = sortByRecency(input.latestPosts);
  const leadPost = orderedFeatured[0] ?? orderedLatest[0] ?? null;
  const seen = new Set(leadPost ? [leadPost.slug] : []);
  const secondaryPosts = [...orderedFeatured.slice(1), ...orderedLatest]
    .filter((post) => {
      if (seen.has(post.slug)) {
        return false;
      }

      seen.add(post.slug);
      return true;
    })
    .slice(0, 3);

  return {
    leadPost,
    secondaryPosts,
    latestPosts: orderedLatest.filter((post) => post.slug !== leadPost?.slug).slice(0, 5),
    learningSubjects: input.learningSubjects.slice(0, 2),
    featuredProjects: input.featuredProjects.slice(0, 2),
  };
}
