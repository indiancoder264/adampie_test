
"use client";

import React, { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { RecipeCard } from '@/components/recipe-card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight } from 'lucide-react';
import type { Recipe } from '@/lib/recipes';
import { SearchAndFilter } from '@/components/search-and-filter';
import { useRecipes } from '@/lib/recipes';
import { useSearchParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';


function SearchResults({ query, meal, time }: { query: string; meal: string; time: string; }) {
    const { recipes } = useRecipes();

    const filteredRecipes = React.useMemo(() => {
        return recipes.filter(recipe => {
            if (!recipe.published) return false;

            let match = true;
            
            if (meal && meal !== 'all') {
                match = match && recipe.meal_category === meal;
            }

            if (time && time !== 'all') {
                match = match && recipe.consumption_time.includes(time);
            }

            if (query) {
                const lowercasedQuery = query.toLowerCase();
                const inName = recipe.name.toLowerCase().includes(lowercasedQuery);
                const inRegion = recipe.region.toLowerCase().includes(lowercasedQuery);
                const inDescription = recipe.description?.toLowerCase().includes(lowercasedQuery);
                match = match && (inName || inRegion || inDescription);
            }
            
            return match;
        });
    }, [recipes, query, meal, time]);

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8 border-b-2 border-primary pb-2">
                <h1 className="font-headline text-4xl font-bold">Search Results</h1>
                <p className="text-muted-foreground text-lg mt-2">
                    Found {filteredRecipes.length} recipe(s) matching your criteria.
                </p>
            </div>

            {filteredRecipes.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                    {filteredRecipes.map((recipe) => (
                        <RecipeCard key={recipe.id} recipe={recipe} />
                    ))}
                </div>
            ) : (
                <Card className="flex items-center justify-center h-64">
                    <CardContent className="text-center text-muted-foreground p-6">
                        <p className="text-lg">No recipes found.</p>
                        <p>Try adjusting your search terms or filters.</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

function HomepageContent() {
  const { recipes } = useRecipes();
  const searchParams = useSearchParams();

  const [isSearchActive, setIsSearchActive] = useState(false);
  
  const query = searchParams.get('q') || '';
  const meal = searchParams.get('meal') || 'all';
  const time = searchParams.get('time') || 'all';
  
  useEffect(() => {
    // Determine if a search is active based on URL parameters
    setIsSearchActive(!!query || meal !== 'all' || time !== 'all');
  }, [query, meal, time]);


  const { trendingRecipes, recipesByRegion, regions } = React.useMemo(() => {
    const trending = [...recipes]
      .filter(r => r.published)
      .sort((a, b) => (b.favorite_count ?? 0) - (a.favorite_count ?? 0))
      .slice(0, 8);
    
    const regionSet = [...new Set(recipes.filter(r => r.published).map((recipe) => recipe.region))];

    const byRegion = recipes.filter(r => r.published).reduce((acc, recipe) => {
        const { region } = recipe;
        if (!acc[region]) acc[region] = [];
        acc[region].push(recipe);
        return acc;
    }, {} as Record<string, Recipe[]>);

    return {
      trendingRecipes: trending,
      recipesByRegion: byRegion,
      regions: regionSet,
    };
  }, [recipes]);

  return (
    <div className="container mx-auto px-4 py-8">
      <section className="relative mb-12 h-80 rounded-lg overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1200&auto=format&fit=crop"
          alt="Delicious food collage"
          fill
          style={{objectFit: 'cover'}}
          className="brightness-75"
          data-ai-hint="vibrant food market"
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white p-4">
          <h1 className="font-headline text-4xl sm:text-5xl md:text-7xl font-bold">Discover Your Next Meal</h1>
          <p className="mt-4 max-w-2xl text-base md:text-lg">
            Explore thousands of recipes from around the world. Your culinary adventure starts here.
          </p>
          <SearchAndFilter />
        </div>
      </section>
      
      {isSearchActive ? (
        <SearchResults query={query} meal={meal} time={time} />
      ) : (
        <>
          <section className="mb-12">
            <div className="flex items-center gap-4 mb-6 border-b-2 border-primary pb-2">
              <h2 className="font-headline text-3xl md:text-4xl font-bold">
                Worldwide Trending Recipes
              </h2>
            </div>
            <Carousel opts={{ align: "start", loop: true, }} className="w-full">
              <CarouselContent>
                {trendingRecipes.map((recipe) => (
                  <CarouselItem key={recipe.id} className="sm:basis-1/2 md:basis-1/3 lg:basis-1/4">
                    <div className="p-1 h-full"><RecipeCard recipe={recipe} /></div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="ml-8" />
              <CarouselNext className="mr-8" />
            </Carousel>
          </section>

          {regions.map((region) => {
            const regionRecipes = recipesByRegion[region] || [];
            if (regionRecipes.length === 0) return null;
            const displayedRecipes = regionRecipes.slice(0, 4);
            const sectionTitle = region === 'Kids' ? 'Fun for Kids' : region === 'Bachelor Plan' ? 'Bachelors Special' : `${region} Cuisine`;

            return (
              <section key={region} className="mb-12">
                <div className="flex justify-between items-center mb-6 border-b-2 border-primary pb-2">
                  <h2 className="font-headline text-3xl md:text-4xl font-bold">{sectionTitle}</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {displayedRecipes.map((recipe) => <RecipeCard key={recipe.id} recipe={recipe} />)}
                </div>
                {regionRecipes.length > 4 && (
                   <div className="mt-8 flex justify-center">
                      <Button asChild variant="secondary">
                          <Link href={`/cuisine/${encodeURIComponent(region)}`}>
                              View All {sectionTitle} Recipes <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                      </Button>
                   </div>
                )}
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}


function HomepageSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Skeleton */}
      <Skeleton className="mb-12 h-80 w-full rounded-lg" />
      
      {/* Carousel Skeleton */}
      <div className="mb-12">
        <Skeleton className="h-10 w-1/3 mb-6" />
        <div className="flex space-x-6 overflow-hidden">
          <Skeleton className="h-72 w-full sm:w-1/2 md:w-1/3 lg:w-1/4" />
          <Skeleton className="h-72 w-full sm:w-1/2 md:w-1/3 lg:w-1/4" />
          <Skeleton className="h-72 w-full sm:w-1/2 md:w-1/3 lg:w-1/4" />
          <Skeleton className="h-72 w-full sm:w-1/2 md:w-1/3 lg:w-1/4" />
        </div>
      </div>
       
       {/* Section Skeleton */}
      <div className="mb-12">
        <Skeleton className="h-10 w-1/3 mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      </div>
    </div>
  );
}

export default function Home() {
    return (
        <Suspense fallback={<HomepageSkeleton />}>
            <HomepageContent />
        </Suspense>
    );
}