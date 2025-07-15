
"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth, type User } from "@/lib/auth";
import { useRecipes, type Recipe, type Tip } from "@/lib/recipes";
import { useCommunity } from "@/lib/community";
import { useToast } from "@/hooks/use-toast";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RecipeCard } from "@/components/recipe-card";
import { Shield, FilePenLine, Users } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Component for displaying a user's submitted tip
function UserTip({ tip, recipe }: { tip: Tip; recipe: Recipe }) {
  return (
    <div className="p-4 border rounded-lg bg-secondary/30">
      <p className="text-sm text-muted-foreground">
        Your tip for <Link href={`/recipes/${recipe.id}`} className="font-medium text-primary hover:underline">{recipe.name}</Link>
      </p>
      <p className="mt-1 italic">“{tip.tip}”</p>
    </div>
  );
}

// Main Profile Page Component
export default function ProfilePage() {
  const { user, updateUser, updateFavoriteCuisines } = useAuth();
  const { recipes } = useRecipes();
  const { groups } = useCommunity();
  const router = useRouter();
  const { toast } = useToast();

  const [name, setName] = React.useState(user?.name || "");
  const [email, setEmail] = React.useState(user?.email || "");
  const [country, setCountry] = React.useState(user?.country || "");
  const [dietaryPreference, setDietaryPreference] = React.useState<User['dietaryPreference']>(user?.dietaryPreference || 'All');
  const [selectedCuisines, setSelectedCuisines] = React.useState<string[]>(user?.favoriteCuisines || []);
  
  const allCuisines = React.useMemo(() => {
    return [...new Set(recipes.map(recipe => recipe.region))].sort();
  }, [recipes]);

  React.useEffect(() => {
    if (!user) {
      router.push("/login");
    } else {
        setName(user.name);
        setEmail(user.email);
        setCountry(user.country);
        setDietaryPreference(user.dietaryPreference);
        setSelectedCuisines(user.favoriteCuisines);
    }
  }, [user, router]);

  const createdGroups = React.useMemo(() => {
    if (!user) return [];
    return groups.filter(g => g.creatorId === user.id);
  }, [groups, user]);

  const memberGroups = React.useMemo(() => {
    if (!user) return [];
    // Exclude groups they created from the "member of" list
    return groups.filter(g => g.members.includes(user.id) && g.creatorId !== user.id);
  }, [groups, user]);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-14rem)] text-center">
        <Shield className="w-16 h-16 text-destructive mb-4" />
        <h1 className="font-headline text-4xl mb-2">Please Log In</h1>
        <p className="text-muted-foreground">You need to be logged in to view this page.</p>
        <Button onClick={() => router.push('/login')} className="mt-4">Go to Login</Button>
      </div>
    );
  }

  const handleProfileUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser({ name, email, country, dietaryPreference });
    toast({
      title: "Profile Updated",
      description: "Your details have been saved.",
    });
  };

  const handlePasswordUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    // This is a mock since we don't have a real backend
    (e.target as HTMLFormElement).reset();
    toast({
      title: "Password Updated!",
      description: "In a real app, your password would be changed.",
    });
  };

  const handleSaveCuisines = () => {
    updateFavoriteCuisines(selectedCuisines);
    toast({
      title: "Cuisines Updated",
      description: "Your favorite cuisines have been saved.",
    });
  };

  const favoriteRecipes = recipes.filter(recipe => user.favorites.includes(recipe.id));

  const userTips = recipes.flatMap(recipe =>
    (recipe.tips || [])
      .filter(tip => tip.userId === user.id)
      .map(tip => ({ tip, recipe }))
  );
  
  const getAvatarUrl = (seed: string) => {
    return `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(seed)}`;
  };

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-col md:flex-row items-center gap-6 mb-8">
        <Avatar className="h-24 w-24 border">
          <AvatarImage src={getAvatarUrl(user.name)} />
          <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="font-headline text-4xl md:text-5xl font-bold">{user.name}</h1>
          <p className="text-muted-foreground text-base md:text-lg">{user.email}</p>
        </div>
      </div>
      
      <Tabs defaultValue="account">
        <TabsList className="mb-4 grid h-auto grid-cols-2 gap-2 md:inline-flex md:h-10 md:w-auto">
          <TabsTrigger value="account">Account Settings</TabsTrigger>
          <TabsTrigger value="favorites">Favorite Recipes ({favoriteRecipes.length})</TabsTrigger>
          <TabsTrigger value="activity">My Activity ({userTips.length})</TabsTrigger>
          <TabsTrigger value="community">Community</TabsTrigger>
        </TabsList>
        
        <TabsContent value="account" className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Update your name, email address and preferences.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" value={name} onChange={e => setName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Select value={country} onValueChange={setCountry}>
                      <SelectTrigger id="country">
                        <SelectValue placeholder="Select your country" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USA">United States</SelectItem>
                        <SelectItem value="Canada">Canada</SelectItem>
                        <SelectItem value="France">France</SelectItem>
                        <SelectItem value="Germany">Germany</SelectItem>
                        <SelectItem value="India">India</SelectItem>
                        <SelectItem value="Italy">Italy</SelectItem>
                        <SelectItem value="Japan">Japan</SelectItem>
                        <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dietary-preference">Dietary Preference</Label>
                    <Select value={dietaryPreference} onValueChange={(value) => setDietaryPreference(value as User['dietaryPreference'])}>
                      <SelectTrigger id="dietary-preference">
                        <SelectValue placeholder="Select your preference" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="All">All</SelectItem>
                        <SelectItem value="Vegetarian">Vegetarian</SelectItem>
                        <SelectItem value="Non-Vegetarian">Non-Vegetarian</SelectItem>
                        <SelectItem value="Vegan">Vegan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit">Save Changes</Button>
                </form>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Choose a new password for your account.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordUpdate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input id="current-password" type="password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input id="new-password" type="password" />
                  </div>
                  <Button type="submit">Update Password</Button>
                </form>
              </CardContent>
            </Card>
          </div>
           
           <Card>
            <CardHeader>
              <CardTitle>Favorite Cuisines</CardTitle>
              <CardDescription>Select your preferred types of food and save your choices.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-6">
                {allCuisines.map((cuisine) => (
                  <div key={cuisine} className="flex items-center space-x-2">
                    <Checkbox
                      id={`cuisine-${cuisine}`}
                      checked={selectedCuisines.includes(cuisine)}
                      onCheckedChange={(checked) => {
                        setSelectedCuisines(prev => 
                          checked
                            ? [...prev, cuisine]
                            : prev.filter((c) => c !== cuisine)
                        );
                      }}
                    />
                    <label
                      htmlFor={`cuisine-${cuisine}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {cuisine}
                    </label>
                  </div>
                ))}
              </div>
              <Button onClick={handleSaveCuisines}>Save Cuisines</Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="favorites">
          <Card>
             <CardHeader>
                <CardTitle>Your Favorite Recipes</CardTitle>
                <CardDescription>All the recipes you've saved.</CardDescription>
            </CardHeader>
            <CardContent>
              {favoriteRecipes.length > 0 ? (
                <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
                  {favoriteRecipes.map(recipe => (
                    <RecipeCard key={recipe.id} recipe={recipe} />
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-12">You have no favorite recipes yet. Click the heart icon on a recipe to save it!</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="activity">
           <Card>
             <CardHeader>
                <CardTitle>Your Contributions</CardTitle>
                <CardDescription>All the helpful tips you've shared with the community.</CardDescription>
            </CardHeader>
            <CardContent>
              {userTips.length > 0 ? (
                <div className="space-y-4">
                  {userTips.map(({ tip, recipe }) => (
                    <UserTip key={tip.id} tip={tip} recipe={recipe} />
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-12">You haven't submitted any tips yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="community">
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FilePenLine className="w-5 h-5"/> Groups You've Created</CardTitle>
                <CardDescription>These are the communities you started.</CardDescription>
              </CardHeader>
              <CardContent>
                {createdGroups.length > 0 ? (
                  <div className="space-y-2">
                    {createdGroups.map(group => (
                      <Link key={group.id} href={`/community/${group.id}`} className="block p-3 rounded-md hover:bg-muted transition-colors">
                        <p className="font-semibold text-primary">{group.name}</p>
                        <p className="text-sm text-muted-foreground">{group.members.length} member(s) &middot; {group.posts.length} post(s)</p>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">You haven't created any groups yet.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5"/> Groups You're In</CardTitle>
                <CardDescription>These are the communities you are a member of.</CardDescription>
              </CardHeader>
              <CardContent>
                {memberGroups.length > 0 ? (
                  <div className="space-y-2">
                    {memberGroups.map(group => (
                      <Link key={group.id} href={`/community/${group.id}`} className="block p-3 rounded-md hover:bg-muted transition-colors">
                         <p className="font-semibold text-primary">{group.name}</p>
                        <p className="text-sm text-muted-foreground">{group.members.length} member(s) &middot; {group.posts.length} post(s)</p>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">You haven't joined any groups yet.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
