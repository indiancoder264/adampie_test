
"use client";

import { useAuth } from "@/lib/auth";
import { useRecipes, type Recipe } from "@/lib/recipes";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Analytics } from "@/components/admin/analytics";
import { RecipeTable } from "@/components/admin/recipe-table";
import { TipsTable } from "@/components/admin/tips-table";
import { UserManagement } from "@/components/admin/user-management";
import { Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import React from "react";
import { RecipeForm } from "@/components/admin/recipe-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CommunityManagement } from "@/components/admin/community-management";
import { redirect } from 'next/navigation';
import { createOrUpdateRecipeAction } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import { type RecipeFormValues } from "@/components/admin/recipe-form";


export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const { recipes } = useRecipes();

  const [isFormOpen, setIsFormOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [selectedRecipe, setSelectedRecipe] = React.useState<Recipe | null>(null);

  React.useEffect(() => {
    // This effect handles cases where auth state changes while the user is on the page.
    // The initial guard is handled by the server-side check below.
    if (user === null || !user.isAdmin) {
      router.push("/login");
    }
  }, [user, router]);
  
  // Primary, server-side guard for admin access.
  // If the user cookie is not present or the user is not an admin, this will redirect.
  if (user === null || !user.isAdmin) {
    redirect('/login');
  }

  const handleAddRecipe = () => {
    setSelectedRecipe(null);
    setIsFormOpen(true);
  };

  const handleEditRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setIsFormOpen(true);
  };

  const handleSaveRecipe = async (data: RecipeFormValues) => {
    setIsSubmitting(true);
    const result = await createOrUpdateRecipeAction(data, selectedRecipe?.id ?? null);
    setIsSubmitting(false);

    if (result.success) {
      toast({
        title: `Recipe ${selectedRecipe ? 'Updated' : 'Created'}!`,
        description: `The recipe "${data.name}" has been saved.`,
      });
      setIsFormOpen(false);
    } else {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
    }
  };

  const allTips = recipes.flatMap(recipe =>
    (recipe.tips || []).map(tip => ({
      ...tip,
      recipeName: recipe.name,
      recipeId: recipe.id,
      userName: tip.user_name,
      id: tip.id
    }))
  );

  return (
    <>
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-headline text-3xl">
              {selectedRecipe ? "Edit Recipe" : "Add New Recipe"}
            </DialogTitle>
          </DialogHeader>
          <RecipeForm
            recipe={selectedRecipe}
            onSave={handleSaveRecipe}
            onCancel={() => setIsFormOpen(false)}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="font-headline text-4xl md:text-5xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground text-base md:text-lg">Manage your RecipeRadar application.</p>
        </div>
        
        <Tabs defaultValue="recipes">
          <TabsList className="mb-4">
            <TabsTrigger value="recipes">Recipes</TabsTrigger>
            <TabsTrigger value="tips">Tips</TabsTrigger>
            <TabsTrigger value="community">Community</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
          </TabsList>
          <TabsContent value="analytics">
            <Analytics />
          </TabsContent>
          <TabsContent value="recipes">
            <RecipeTable
              recipes={recipes}
              onAdd={handleAddRecipe}
              onEdit={handleEditRecipe}
            />
          </TabsContent>
          <TabsContent value="tips">
            <TipsTable tips={allTips} />
          </TabsContent>
          <TabsContent value="community">
            <CommunityManagement />
          </TabsContent>
          <TabsContent value="users">
            <UserManagement />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
