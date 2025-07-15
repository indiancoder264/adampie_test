
"use client";

import React from "react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ChefHat, MessageSquare } from "lucide-react";
import { useRecipes } from "@/lib/recipes";
import { useAllUsers } from "@/lib/users";

export function Analytics() {
  const { recipes } = useRecipes();
  const { allUsers } = useAllUsers();
  
  const totalRecipes = recipes.length;
  const totalTips = recipes.reduce((acc, recipe) => acc + (recipe.tips || []).length, 0);
  // In a real app, this would come from a database query.
  const totalUsers = allUsers.length; 

  const recipesByRegion = React.useMemo(() => {
    const data = recipes.reduce((acc, recipe) => {
        acc[recipe.region] = (acc[recipe.region] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return Object.entries(data).map(([name, value]) => ({
        name,
        recipes: value,
    }));
  }, [recipes]);

  const { topVisitedRecipes, topVisitedCuisines } = React.useMemo(() => {
    const recipeVisitCounts: Record<string, number> = {};
    
    allUsers.forEach(user => {
        user.readHistory.forEach(recipeId => {
            recipeVisitCounts[recipeId] = (recipeVisitCounts[recipeId] || 0) + 1;
        });
    });

    const sortedRecipeVisits = Object.entries(recipeVisitCounts)
        .map(([id, visits]) => {
            const recipe = recipes.find(r => r.id === id);
            return { name: recipe?.name || `Recipe ${id}`, visits };
        })
        .sort((a, b) => b.visits - a.visits)
        .slice(0, 5);

    const cuisineVisitCounts: Record<string, number> = {};
    Object.entries(recipeVisitCounts).forEach(([recipeId, visits]) => {
        const recipe = recipes.find(r => r.id === recipeId);
        if (recipe) {
            cuisineVisitCounts[recipe.region] = (cuisineVisitCounts[recipe.region] || 0) + visits;
        }
    });

    const sortedCuisineVisits = Object.entries(cuisineVisitCounts)
        .map(([name, visits]) => ({ name, visits }))
        .sort((a, b) => b.visits - a.visits);

    return { topVisitedRecipes: sortedRecipeVisits, topVisitedCuisines: sortedCuisineVisits };
  }, [allUsers, recipes]);

  const chartTooltip = (
    <Tooltip
        cursor={{ fill: 'hsl(var(--muted))' }}
        contentStyle={{
            backgroundColor: 'hsl(var(--background))',
            borderColor: 'hsl(var(--border))',
            borderRadius: 'var(--radius)'
        }}
    />
  );

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Recipes</CardTitle>
            <ChefHat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRecipes}</div>
            <p className="text-xs text-muted-foreground">All delicious recipes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">Registered food lovers</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tips</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTips}</div>
            <p className="text-xs text-muted-foreground">Community-submitted tips</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-2">
        <Card>
            <CardHeader>
                <CardTitle className="font-headline text-2xl">Top 5 Most Visited Recipes</CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={topVisitedRecipes} layout="vertical">
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={150} stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        {chartTooltip}
                        <Bar dataKey="visits" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} background={{ fill: 'hsl(var(--muted))', radius: 4 }} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
        <Card>
            <CardHeader>
                <CardTitle className="font-headline text-2xl">Most Visited Cuisines</CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={topVisitedCuisines}>
                        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                        {chartTooltip}
                        <Bar dataKey="visits" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Recipes by Region</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={recipesByRegion}>
              <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
              {chartTooltip}
              <Legend />
              <Bar dataKey="recipes" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
