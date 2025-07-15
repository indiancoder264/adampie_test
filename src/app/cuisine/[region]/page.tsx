
"use client";

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useRecipes } from '@/lib/recipes';
import { RecipeCard } from '@/components/recipe-card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function CuisinePage() {
    const params = useParams<{ region: string }>();
    const router = useRouter();
    const { recipes } = useRecipes();
    
    // Decode region name from URL (e.g., "French%20Onion" -> "French Onion")
    const decodedRegion = React.useMemo(() => {
        let regionName = params.region ? decodeURIComponent(params.region as string) : '';
        if (regionName === 'Bachelors Special') {
            regionName = 'Bachelor Plan';
        }
        return regionName;
    }, [params.region]);
    
    const cuisineRecipes = recipes.filter(
        (recipe) => recipe.published && recipe.region === decodedRegion
    );

    const pageTitle = decodedRegion === 'Kids' ? 'Fun for Kids' : decodedRegion === 'Bachelor Plan' ? 'Bachelors Special' : `${decodedRegion} Cuisine`;

    return (
        <div className="container mx-auto px-4 py-8">
            <Button variant="outline" onClick={() => router.back()} className="mb-8">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
            </Button>

            <div className="mb-8">
                <h1 className="font-headline text-5xl font-bold">{pageTitle}</h1>
                <p className="text-muted-foreground text-lg mt-2">
                    Explore all the delicious recipes from {pageTitle}.
                </p>
            </div>

            {cuisineRecipes.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                    {cuisineRecipes.map((recipe) => (
                        <RecipeCard key={recipe.id} recipe={recipe} />
                    ))}
                </div>
            ) : (
                <Card className="flex items-center justify-center h-64">
                    <CardContent className="text-center text-muted-foreground p-6">
                        <p className="text-lg">No recipes found for {pageTitle}.</p>
                        <p>Check back later for new additions!</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
