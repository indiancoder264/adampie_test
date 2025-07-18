
"use client"; // This must be a client component to use hooks

import Image from "next/image";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { Clock, Users, ArrowLeft, Utensils, Salad, Calendar, Share, Loader2 } from "lucide-react";
import React, { useEffect, useState } from 'react';

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { RecipeInteraction } from "@/components/recipe-interaction";
import { useRecipes, type Recipe, type Tip } from "@/lib/recipes";
import { logRecipeViewAction, addPostAction } from "@/lib/actions";
import { useAuth } from "@/lib/auth";
import { useCommunity, type Group } from "@/lib/community";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";


function RecipePageContent() {
    const params = useParams<{ id: string }>();
    const { id } = params;
    const { recipes } = useRecipes();
    const { user } = useAuth();
    const { groups } = useCommunity();
    const { toast } = useToast();

    const [recipe, setRecipe] = useState<Recipe | null | undefined>(undefined);
    const [initialTips, setInitialTips] = useState<Tip[]>([]);
    
    const [isShareDialogOpen, setShareDialogOpen] = React.useState(false);
    const [selectedGroup, setSelectedGroup] = React.useState('');
    const [shareMessage, setShareMessage] = React.useState('');
    const [isSubmittingShare, setIsSubmittingShare] = React.useState(false);

    useEffect(() => {
        if (id && recipes.length > 0) {
            const foundRecipe = recipes.find(r => r.id === id);
            if(foundRecipe){
                setRecipe(foundRecipe);
                setInitialTips(foundRecipe.tips);
                 // Log recipe view for personalization
                if (user) {
                    logRecipeViewAction(id);
                }
            } else {
                setRecipe(null); // Explicitly set to null if not found
            }
        }
    }, [id, recipes, user]);

    const userGroups = React.useMemo(() => {
        if (!user) return [];
        return groups.filter(g => g.members.includes(user.id));
    }, [groups, user]);

    const handleShareToCommunity = async () => {
        if (!selectedGroup) {
            toast({ title: "Please select a group.", variant: "destructive" });
            return;
        }
        setIsSubmittingShare(true);
        const result = await addPostAction(selectedGroup, shareMessage, recipe?.id);
        setIsSubmittingShare(false);
        if (result.success) {
            toast({ title: "Recipe Shared!", description: `Your post has been added to the group.` });
            setShareDialogOpen(false);
            setSelectedGroup('');
            setShareMessage('');
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
    };

    if (recipe === undefined) {
        return <RecipePageSkeleton />;
    }
    
    if (recipe === null) {
        notFound();
    }

  return (
    <>
        <Dialog open={isShareDialogOpen} onOpenChange={setShareDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Share to Community</DialogTitle>
                    <DialogDescription>Share this recipe with one of your groups.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label htmlFor="group-select">Select Group</Label>
                        <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                            <SelectTrigger id="group-select">
                                <SelectValue placeholder="Choose a group..." />
                            </SelectTrigger>
                            <SelectContent>
                                {userGroups.map(group => (
                                    <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="share-message">Your Message (Optional)</Label>
                        <Textarea 
                            id="share-message" 
                            placeholder={`What do you think about ${recipe.name}?`}
                            value={shareMessage}
                            onChange={(e) => setShareMessage(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
                    <Button onClick={handleShareToCommunity} disabled={isSubmittingShare}>
                        {isSubmittingShare && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Share Recipe
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <div className="container mx-auto px-4 py-8">
        <Button variant="outline" asChild className="mb-8">
            <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Recipes
            </Link>
        </Button>

        <div className="lg:grid lg:grid-cols-1 lg:gap-8">
            <article>
            {/* Header */}
            <div className="mb-8 text-center">
                <Badge variant="secondary" className="mb-4 text-lg">
                {recipe.region}
                </Badge>
                <div className="flex items-center justify-center gap-4">
                <h1 className="font-headline text-4xl sm:text-5xl md:text-7xl font-bold">
                    {recipe.name}
                </h1>
                 <div className="flex items-center gap-2">
                    <RecipeInteraction recipeId={recipe.id} />
                    {user && userGroups.length > 0 && (
                        <Button variant="outline" size="icon" className="h-12 w-12 shrink-0" onClick={() => setShareDialogOpen(true)}>
                            <Share className="h-6 w-6 text-muted-foreground" />
                            <span className="sr-only">Share to community</span>
                        </Button>
                    )}
                 </div>
                </div>
                <p className="mt-4 max-w-3xl mx-auto text-base md:text-lg text-muted-foreground">
                {recipe.description}
                </p>
            </div>

            {/* Image */}
            <div className="flex justify-center mb-8">
                <Card className="overflow-hidden w-full max-w-4xl h-[330px]">
                <Image
                    src={recipe.image_url}
                    alt={recipe.name}
                    width={800}
                    height={400}
                    className="w-full h-full object-cover"
                    priority
                />
                </Card>
            </div>

            {/* Details & Ingredients */}
            <div className="space-y-8 max-w-4xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Details */}
                <Card>
                    <CardHeader>
                    <h3 className="font-headline text-2xl md:text-3xl">Details</h3>
                    </CardHeader>
                    <CardContent className="space-y-4 text-base">
                    <div className="flex items-start gap-4">
                        <Clock className="w-5 h-5 mt-1 text-primary flex-shrink-0" />
                        <p>
                        <strong>Prep:</strong> {recipe.prep_time} |{" "}
                        <strong>Cook:</strong> {recipe.cook_time}
                        </p>
                    </div>
                    <div className="flex items-start gap-4">
                        <Users className="w-5 h-5 mt-1 text-primary flex-shrink-0" />
                        <p>
                        <strong>Servings:</strong> {recipe.servings}
                        </p>
                    </div>
                    <div className="flex items-start gap-4">
                        <Utensils className="w-5 h-5 mt-1 text-primary flex-shrink-0" />
                        <p>
                        <strong>Category:</strong> {recipe.meal_category}
                        </p>
                    </div>
                    <div className="flex items-start gap-4">
                        <Calendar className="w-5 h-5 mt-1 text-primary flex-shrink-0" />
                        <div>
                        <p>
                            <strong>Recommended for:</strong>
                        </p>
                        <div className="flex flex-wrap gap-2 mt-1">
                            {recipe.consumption_time.map((time) => (
                            <Badge key={time} variant="outline">
                                {time}
                            </Badge>
                            ))}
                        </div>
                        </div>
                    </div>
                    <div className="flex items-start gap-4">
                        <Salad className="w-5 h-5 mt-1 text-primary flex-shrink-0" />
                        <div>
                        <p>
                            <strong>Dietary Info:</strong>
                        </p>
                        <div className="flex flex-wrap gap-2 mt-1">
                            <Badge variant="secondary">
                            {recipe.dietary_type}
                            </Badge>
                            {recipe.dietary_notes.map((note) => (
                            <Badge key={note} variant="outline">
                                {note}
                            </Badge>
                            ))}
                        </div>
                        </div>
                    </div>
                    </CardContent>
                </Card>

                {/* Ingredients */}
                <Card>
                    <CardHeader>
                    <h3 className="font-headline text-2xl md:text-3xl">
                        Ingredients
                    </h3>
                    </CardHeader>
                    <CardContent>
                    <ul className="list-disc list-outside space-y-2 text-lg pl-5">
                        {recipe.ingredients.map((ing) => (
                        <li key={ing.id}>
                            {ing.quantity} {ing.name}
                        </li>
                        ))}
                    </ul>
                    </CardContent>
                </Card>
                </div>

                <RecipeInteraction
                recipeId={recipe.id}
                steps={recipe.steps}
                initialTips={initialTips}
                />
            </div>
            </article>
        </div>
        </div>
    </>
  );
}

function RecipePageSkeleton() {
    return (
        <div className="container mx-auto px-4 py-8 animate-pulse">
            <Skeleton className="h-10 w-32 mb-8" />
            <div className="text-center mb-8">
                <Skeleton className="h-6 w-24 mx-auto mb-4" />
                <Skeleton className="h-16 w-3/4 mx-auto mb-4" />
                <Skeleton className="h-5 w-full max-w-2xl mx-auto" />
            </div>
            <div className="flex justify-center mb-8">
                <Skeleton className="w-full max-w-4xl h-[330px]" />
            </div>
            <div className="space-y-8 max-w-4xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Skeleton className="h-80 w-full" />
                    <Skeleton className="h-80 w-full" />
                </div>
                <Skeleton className="h-96 w-full" />
            </div>
        </div>
    );
}

export default function Page() {
    // This component is now a simple wrapper to make Suspense work correctly with client components.
    return (
        <React.Suspense fallback={<RecipePageSkeleton/>}>
            <RecipePageContent />
        </React.Suspense>
    );
}
