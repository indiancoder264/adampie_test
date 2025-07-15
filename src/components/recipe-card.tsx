import Image from "next/image";
import Link from "next/link";
import { Card, CardContent, CardFooter, CardTitle } from "@/components/ui/card";
import { StarRating } from "@/components/star-rating";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Recipe } from "@/lib/recipes";

type RecipeCardProps = {
  recipe: Recipe;
  className?: string;
};

export function RecipeCard({ recipe, className }: RecipeCardProps) {
  return (
    <Card className={cn("group flex flex-col overflow-hidden transition-all duration-700 ease-out hover:-translate-x-1 hover:-translate-y-1 hover:rotate-[-1deg] hover:shadow-2xl h-full", className)}>
      <div className="overflow-hidden">
        <Link href={`/recipes/${recipe.id}`}>
          <Image
            src={recipe.image_url}
            alt={recipe.name}
            width={400}
            height={200}
            className="w-full h-auto aspect-[4/3] object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </Link>
      </div>
      <CardContent className="p-4 flex-grow">
        <CardTitle className="font-headline text-xl mb-2">
          <Link href={`/recipes/${recipe.id}`} className="hover:text-primary transition-colors">{recipe.name}</Link>
        </CardTitle>
        <p className="text-muted-foreground text-sm line-clamp-3">{recipe.description}</p>
      </CardContent>
      <CardFooter className="flex items-center justify-between p-4 border-t">
        <div className="flex items-center gap-2">
          <StarRating rating={recipe.average_rating} />
          <span className="text-xs text-muted-foreground">({recipe.rating_count})</span>
        </div>
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Clock className="w-4 h-4"/> {recipe.cook_time}
        </span>
      </CardFooter>
    </Card>
  );
}
