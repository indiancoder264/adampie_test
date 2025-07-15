
"use client";

import React from "react";
import { useAllUsers } from "@/lib/users";
import { useRecipes } from "@/lib/recipes";
import type { User } from "@/lib/auth";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { BookOpen, Heart, MessageSquare, Trash2, UserX, UserCheck } from "lucide-react";
import { deleteUserAction, suspendUserAction, unsuspendUserAction } from "@/lib/actions";


function SuspendDialog({ user, open, onOpenChange, onSuspend }: { user: User, open: boolean, onOpenChange: (open: boolean) => void, onSuspend: (userId: string, days: number) => void}) {
  const [days, setDays] = React.useState("7");

  const handleSuspend = () => {
    onSuspend(user.id, parseInt(days, 10));
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Suspend User</DialogTitle>
          <DialogDescription>
            Select a duration to suspend {user.name}. They will not be able to log in during this period.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="suspension-duration">Suspension Duration</Label>
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger id="suspension-duration" className="w-full">
              <SelectValue placeholder="Select duration" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 Day</SelectItem>
              <SelectItem value="7">7 Days</SelectItem>
              <SelectItem value="30">30 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSuspend}>Confirm Suspension</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function UserDetails({ 
  user, 
  recipes,
}: { 
  user: User; 
  recipes: ReturnType<typeof useRecipes>['recipes'];
}) {
    const { toast } = useToast();
    const [isSuspendDialogOpen, setSuspendDialogOpen] = React.useState(false);
    
    const userTips = recipes.flatMap(recipe =>
        (recipe.tips || [])
          .filter(tip => tip.user_id === user.id)
          .map(tip => ({ ...tip, recipeName: recipe.name, recipeId: recipe.id }))
      );

    const getRecipeName = (id: string) => recipes.find(r => r.id === id)?.name || 'Unknown Recipe';
    const isSuspended = user.suspendedUntil && new Date(user.suspendedUntil) > new Date();

    const getAvatarUrl = (seed: string) => {
        return `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(seed)}`;
    };

    const handleDelete = async (userId: string) => {
        const result = await deleteUserAction(userId);
        if (result.success) {
            toast({ title: "User Deleted", variant: "destructive" });
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
    };

    const handleSuspend = async (userId: string, days: number) => {
        const result = await suspendUserAction(userId, days);
        if (result.success) {
            toast({ title: "User Suspended", description: `The user has been suspended for ${days} day(s).` });
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
    };

    const handleUnsuspend = async (userId: string) => {
        const result = await unsuspendUserAction(userId);
        if (result.success) {
            toast({ title: "User Unsuspended", description: "The user's suspension has been lifted." });
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
    };

    return (
      <>
        <Card className="h-full">
            <CardHeader className="flex flex-row items-center gap-4">
                <Avatar className="h-16 w-16 border flex-shrink-0">
                    <AvatarImage src={getAvatarUrl(user.avatar)} />
                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                    <CardTitle className="font-headline text-2xl truncate">{user.name}</CardTitle>
                    <CardDescription className="truncate">{user.email}</CardDescription>
                </div>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[calc(100vh-22rem)]">
                    <div className="space-y-6 pr-4">
                        <div>
                            <h3 className="font-semibold mb-2">Details</h3>
                            <div className="p-3 bg-secondary/50 rounded-md space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Country</span>
                                    <span className="font-medium">{user.country}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Dietary Preference</span>
                                    <span className="font-medium">{user.dietaryPreference}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">Status</span>
                                    {isSuspended ? (
                                        <Badge variant="destructive">Suspended until {new Date(user.suspendedUntil!).toLocaleDateString()}</Badge>
                                    ) : user.isAdmin ? (
                                        <Badge variant="default" className="bg-green-600 hover:bg-green-700">Admin</Badge>
                                    ) : (
                                        <Badge variant="secondary">Active</Badge>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="font-semibold mb-2">Actions</h3>
                            <div className="p-3 bg-secondary/50 rounded-md grid grid-cols-1 gap-2">
                                    {isSuspended ? (
                                        <Button variant="outline" size="sm" onClick={() => handleUnsuspend(user.id)}>
                                            <UserCheck className="mr-2 h-4 w-4" /> Unsuspend User
                                        </Button>
                                    ) : (
                                        <Button variant="outline" size="sm" onClick={() => setSuspendDialogOpen(true)}>
                                            <UserX className="mr-2 h-4 w-4" /> Suspend User
                                        </Button>
                                    )}
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                        <Button variant="destructive" size="sm">
                                            <Trash2 className="mr-2 h-4 w-4" /> Delete User
                                        </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                            This will permanently delete {user.name}'s account and all associated data. This action cannot be undone.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDelete(user.id)}>Yes, delete user</AlertDialogAction>
                                        </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                            </div>
                        </div>

                        <div>
                            <h3 className="font-semibold mb-2">Favorite Cuisines</h3>
                            {user.favoriteCuisines.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                {user.favoriteCuisines.map(cuisine => (
                                    <Badge key={cuisine} variant="secondary">{cuisine}</Badge>
                                ))}
                                </div>
                            ) : <p className="text-sm text-muted-foreground">No favorite cuisines.</p>}
                        </div>
                        
                        <div>
                            <h3 className="font-semibold mb-2 flex items-center gap-2"><Heart className="w-4 h-4"/> Favorite Recipes ({user.favorites.length})</h3>
                            {user.favorites.length > 0 ? (
                                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                    {user.favorites.map(recipeId => (
                                        <li key={recipeId}><Link className="hover:underline text-primary" href={`/recipes/${recipeId}`}>{getRecipeName(recipeId)}</Link></li>
                                    ))}
                                </ul>
                            ) : <p className="text-sm text-muted-foreground">No favorite recipes yet.</p>}
                        </div>

                        <div>
                            <h3 className="font-semibold mb-2 flex items-center gap-2"><BookOpen className="w-4 h-4" /> Read History ({user.readHistory.length})</h3>
                            {user.readHistory.length > 0 ? (
                                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                    {user.readHistory.map(recipeId => (
                                        <li key={recipeId}><Link className="hover:underline text-primary" href={`/recipes/${recipeId}`}>{getRecipeName(recipeId)}</Link></li>
                                    ))}
                                </ul>
                            ) : <p className="text-sm text-muted-foreground">No read history.</p>}
                        </div>
                        
                        <div>
                            <h3 className="font-semibold mb-2 flex items-center gap-2"><MessageSquare className="w-4 h-4"/> Submitted Tips ({userTips.length})</h3>
                            {userTips.length > 0 ? (
                                <div className="space-y-2">
                                    {userTips.map(tip => (
                                        <div key={tip.id} className="text-sm p-2 bg-secondary/50 rounded-md">
                                            <p className="italic">“{tip.tip}”</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                for <Link className="hover:underline text-primary" href={`/recipes/${tip.recipeId}`}>{tip.recipeName}</Link>
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ) : <p className="text-sm text-muted-foreground">No tips submitted yet.</p>}
                        </div>
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
        <SuspendDialog 
            user={user} 
            open={isSuspendDialogOpen} 
            onOpenChange={setSuspendDialogOpen}
            onSuspend={handleSuspend}
        />
      </>
    )
}


export function UserManagement() {
  const { allUsers } = useAllUsers();
  const { recipes } = useRecipes();
  const [selectedUserId, setSelectedUserId] = React.useState<string | null>(null);
  const [countryFilter, setCountryFilter] = React.useState<string>("all");

  const uniqueCountries = React.useMemo(() => {
    const countries = new Set(allUsers.map(user => user.country).filter(Boolean));
    return ["all", ...Array.from(countries).sort()];
  }, [allUsers]);

  const filteredUsers = React.useMemo(() => {
    if (countryFilter === "all") {
      return allUsers;
    }
    return allUsers.filter(user => user.country === countryFilter);
  }, [allUsers, countryFilter]);

  React.useEffect(() => {
    // If a user is selected, ensure they still exist in the main list.
    // If not, clear selection. This handles deletion.
    const userExists = selectedUserId && allUsers.some(u => u.id === selectedUserId);
    if (selectedUserId && !userExists) {
        setSelectedUserId(null);
    }
    
    // If the current selection is no longer valid due to filtering,
    // select the first user in the filtered list or clear if empty.
    const selectionInFilteredList = selectedUserId && filteredUsers.some(u => u.id === selectedUserId);
    if (selectedUserId && !selectionInFilteredList) {
        setSelectedUserId(filteredUsers.length > 0 ? filteredUsers[0].id : null);
    }

    // If no user is selected and there are users in the filtered list, select the first one.
    if (!selectedUserId && filteredUsers.length > 0) {
        setSelectedUserId(filteredUsers[0].id);
    }
  }, [allUsers, filteredUsers, selectedUserId]);


  const selectedUser = allUsers.find(u => u.id === selectedUserId) ?? null;

  const getUserTipCount = (userId: string) => {
    return recipes.reduce((count, recipe) => {
      return count + (recipe.tips || []).filter(tip => tip.user_id === userId).length;
    }, 0);
  };
  
  const getAvatarUrl = (seed: string) => {
    return `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(seed)}`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div className="md:col-span-2">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="font-headline text-2xl">All Users</CardTitle>
                <CardDescription>Select a user to view their details and activity.</CardDescription>
              </div>
               <div className="w-48">
                <Label htmlFor="country-filter" className="text-xs">Filter by Country</Label>
                <Select value={countryFilter} onValueChange={setCountryFilter}>
                  <SelectTrigger id="country-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueCountries.map(country => (
                      <SelectItem key={country} value={country}>
                        {country === 'all' ? 'All Countries' : country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead className="text-center">Favorites</TableHead>
                  <TableHead className="text-center">Tips</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow 
                    key={user.id} 
                    onClick={() => setSelectedUserId(user.id)}
                    className="cursor-pointer"
                    data-state={selectedUserId === user.id ? 'selected' : ''}
                  >
                    <TableCell className="font-medium flex items-center gap-2">
                      <Avatar className="h-8 w-8 border">
                        <AvatarImage src={getAvatarUrl(user.avatar)} />
                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      {user.name}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.country}</TableCell>
                    <TableCell className="text-center">{user.favorites.length}</TableCell>
                    <TableCell className="text-center">{getUserTipCount(user.id)}</TableCell>
                    <TableCell className="text-center">
                        {user.suspendedUntil && new Date(user.suspendedUntil) > new Date() ? (
                            <Badge variant="destructive">Suspended</Badge>
                        ) : user.isAdmin ? (
                            <Badge variant="default" className="bg-green-600 hover:bg-green-700">Admin</Badge>
                         ) : (
                            <Badge variant="outline">Active</Badge>
                        )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      
      <div className="md:col-span-1">
        {selectedUser ? (
          <UserDetails
            user={selectedUser}
            recipes={recipes}
          />
        ) : (
          <Card className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">{ filteredUsers.length > 0 ? "Select a user to see details" : "No users match the current filter."}</p>
          </Card>
        )}
      </div>
    </div>
  );
}
