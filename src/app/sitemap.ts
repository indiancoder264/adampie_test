
import { MetadataRoute } from 'next';
import { fetchRecipes, fetchGroups } from '@/lib/data';

// IMPORTANT: For this to work in production, you must set the
// NEXT_PUBLIC_BASE_URL environment variable to your website's domain.
// This is also a critical security measure to prevent "Host Header Injection" attacks
// when generating absolute URLs in things like password reset emails.
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const [recipes, groups] = await Promise.all([
      fetchRecipes(),
      fetchGroups(),
    ]);

    const staticRoutes = [
      '/', '/about', '/community', '/contact', '/login',
      '/privacy', '/signup', '/terms',
    ].map((route) => ({
      url: `${baseUrl}${route}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: route === '/' ? 1.0 : 0.7,
    }));

    const recipeRoutes = recipes
      .filter(recipe => recipe.published)
      .map((recipe) => ({
        url: `${baseUrl}/recipes/${recipe.id}`,
        lastModified: new Date(), // In a real app, you might use an `updated_at` field from the recipe
        changeFrequency: 'weekly' as const,
        priority: 0.9,
      }));

    const uniqueRegions = [...new Set(recipes.filter(r => r.published).map((recipe) => recipe.region))];
    const cuisineRoutes = uniqueRegions.map((region) => ({
      url: `${baseUrl}/cuisine/${encodeURIComponent(region)}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));

    const groupRoutes = groups.map((group) => ({
      url: `${baseUrl}/community/${group.id}`,
      lastModified: new Date(group.created_at),
      changeFrequency: 'daily' as const,
      priority: 0.6,
    }));

    return [
      ...staticRoutes,
      ...recipeRoutes,
      ...cuisineRoutes,
      ...groupRoutes,
    ];
  } catch (error) {
    console.error('Failed to generate sitemap:', error);
    return []; // Return an empty sitemap on error
  }
}
