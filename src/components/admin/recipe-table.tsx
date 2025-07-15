
"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Edit, Heart, Trash2, PlusCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import React from "react";
import type { Recipe } from "@/lib/recipes";
import { useToast } from "@/hooks/use-toast";
import { deleteRecipeAction, togglePublishAction } from "@/lib/actions";

type RecipeTableProps = {
  recipes: Recipe[];
  onAdd: () => void;
  onEdit: (recipe: Recipe) => void;
};

export function RecipeTable({ recipes, onAdd, onEdit }: RecipeTableProps) {
  const { toast } = useToast();

  const handleDelete = async (recipe: Recipe) => {
    const result = await deleteRecipeAction(recipe.id);
    if (result.success) {
      toast({
        title: "Recipe Deleted",
        description: `${recipe.name} has been deleted.`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
    }
  };

  const handleTogglePublish = async (recipe: Recipe) => {
    const result = await togglePublishAction(recipe.id);
    if (!result.success) {
        toast({
            title: "Error",
            description: result.error,
            variant: "destructive",
        });
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle className="font-headline text-2xl">Manage Recipes</CardTitle>
            <CardDescription>View, edit, or delete recipes from the database.</CardDescription>
        </div>
        <Button onClick={onAdd}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Recipe
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Region</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead className="hidden md:table-cell">Favorites</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recipes.map((recipe) => (
              <TableRow key={recipe.id}>
                <TableCell className="font-medium">{recipe.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{recipe.region}</Badge>
                </TableCell>
                <TableCell>{recipe.average_rating.toFixed(1)} ({recipe.rating_count})</TableCell>
                <TableCell className="hidden md:table-cell">
                  <div className="flex items-center justify-center gap-1">
                    <Heart className="h-4 w-4 text-red-500" />
                    <span>{recipe.favorite_count ?? 0}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`publish-switch-${recipe.id}`}
                      checked={recipe.published}
                      onCheckedChange={() => handleTogglePublish(recipe)}
                    />
                    <label htmlFor={`publish-switch-${recipe.id}`} className="text-sm text-muted-foreground">{recipe.published ? "Public" : "Private"}</label>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => onEdit(recipe)}>
                    <Edit className="h-4 w-4" />
                    <span className="sr-only">Edit</span>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the recipe
                          and remove its data from our servers.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(recipe)}>Continue</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
