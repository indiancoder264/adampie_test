
import React from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchRecipeById, fetchTipsForRecipe } from '@/lib/data';
import { Clock, Users, Star, ArrowLeft, Utensils, Salad, Calendar } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { RecipeInteraction } from "@/components/recipe-interaction";
import { StarRating } from "@/components/star-rating";


export default async function RecipePage({ params }: { params: { id: string } }) {
  const recipe = await fetchRecipeById(params.id);

  if (!recipe) {
    notFound();
  }

  // Fetch tips separately to keep initial load fast and update dynamically
  const initialTips = await fetchTipsForRecipe(params.id);

  return (
    <div className="container mx-auto px-4 py-8">
      <Button variant="outline" asChild className="mb-8">
        <Link href="/">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Recipes
        </Link>
      </Button>

      <div className="lg:grid lg:grid-cols-1 lg:gap-8">
        <article>
          <div className="mb-8 text-center">
            <Badge variant="secondary" className="mb-4 text-lg">
              {recipe.region}
            </Badge>
            <div className="flex items-center justify-center gap-4">
              <h1 className="font-headline text-4xl sm:text-5xl md:text-7xl font-bold">
                {recipe.name}
              </h1>
              <RecipeInteraction recipeId={recipe.id} />
            </div>
            <p className="mt-4 max-w-3xl mx-auto text-base md:text-lg text-muted-foreground">
              {recipe.description}
            </p>
          </div>

          <div className="flex justify-center mb-8">
            <Card className="overflow-hidden w-full max-w-4xl h-[330px]">
              <Image
                src={recipe.image_url}
                alt={recipe.name}
                width={800}
                height={400}
                className="w-full h-full object-cover"
              />
            </Card>
          </div>

          <div className="space-y-8 max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <h3 className="font-headline text-2xl md:text-3xl">Details</h3>
                </CardHeader>
                <CardContent className="space-y-4 text-base">
                  <div className="flex items-start gap-4">
                    <Clock className="w-5 h-5 mt-1 text-primary flex-shrink-0" />
                    <p><strong>Prep:</strong> {recipe.prep_time} | <strong>Cook:</strong> {recipe.cook_time}</p>
                  </div>
                  <div className="flex items-start gap-4">
                    <Users className="w-5 h-5 mt-1 text-primary flex-shrink-0" />
                    <p><strong>Servings:</strong> {recipe.servings}</p>
                  </div>
                  <div className="flex items-start gap-4">
                    <Utensils className="w-5 h-5 mt-1 text-primary flex-shrink-0" />
                    <p><strong>Category:</strong> {recipe.meal_category}</p>
                  </div>
                  <div className="flex items-start gap-4">
                    <Calendar className="w-5 h-5 mt-1 text-primary flex-shrink-0" />
                    <div>
                      <p><strong>Recommended for:</strong></p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {recipe.consumption_time.map(time => <Badge key={time} variant="outline">{time}</Badge>)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <Salad className="w-5 h-5 mt-1 text-primary flex-shrink-0" />
                    <div>
                      <p><strong>Dietary Info:</strong></p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <Badge variant="secondary">{recipe.dietary_type}</Badge>
                        {recipe.dietary_notes.map(note => <Badge key={note} variant="outline">{note}</Badge>)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <Star className="w-5 h-5 mt-1 text-primary flex-shrink-0" />
                    <p><strong>Rating:</strong> {recipe.average_rating.toFixed(1)} ({recipe.rating_count} reviews)</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <h3 className="font-headline text-2xl md:text-3xl">Ingredients</h3>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc list-outside space-y-2 text-lg pl-5">
                    {recipe.ingredients.map((ing) => (
                      <li key={ing.id}>{ing.quantity} {ing.name}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
            
            <RecipeInteraction recipeId={recipe.id} steps={recipe.steps} initialTips={initialTips} />

          </div>
        </article>
      </div>
    </div>
  );
}
