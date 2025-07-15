
"use client";

import Link from "next/link";
import React from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useCommunity, type Group } from "@/lib/community";
import { useAuth } from "@/lib/auth";
import { PlusCircle, Users, Edit, Trash2 } from "lucide-react";
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
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { deleteGroupAction, editGroupAction, joinGroupAction, leaveGroupAction } from "@/lib/actions";


const editGroupSchema = z.object({
  name: z.string().min(3, "Group name must be at least 3 characters long.").max(50, "Group name cannot exceed 50 characters."),
  description: z.string().min(10, "Description must be at least 10 characters long.").max(200, "Description cannot exceed 200 characters."),
});

function EditGroupDialog({ group, open, onOpenChange, onSave }: { group: Group, open: boolean, onOpenChange: (open: boolean) => void, onSave: (data: z.infer<typeof editGroupSchema>) => void }) {
  const form = useForm<z.infer<typeof editGroupSchema>>({
    resolver: zodResolver(editGroupSchema),
    defaultValues: {
      name: group.name,
      description: group.description,
    },
  });

  React.useEffect(() => {
    form.reset({ name: group.name, description: group.description });
  }, [group, form]);

  const handleSave = (values: z.infer<typeof editGroupSchema>) => {
    onSave(values);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Group</DialogTitle>
          <DialogDescription>Make changes to your group details here.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Group Name</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Group Description</FormLabel>
                  <FormControl><Textarea {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="ghost">Cancel</Button></DialogClose>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}


function GroupCard({ group, onEdit }: { group: Group, onEdit: (group: Group) => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const isMember = user ? group.members.includes(user.id) : false;
  const isCreator = user ? group.creator_id === user.id : false;

  const handleJoin = async () => {
    const result = await joinGroupAction(group.id);
    if (!result.success) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    }
  };
  
  const handleLeave = async () => {
    const result = await leaveGroupAction(group.id);
    if (!result.success) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    const result = await deleteGroupAction(group.id);
    if (result.success) {
        toast({ title: "Group Deleted" });
    } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
    }
  }

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="font-headline text-2xl">
              <Link href={`/community/${group.id}`} className="hover:text-primary transition-colors">
                {group.name}
              </Link>
            </CardTitle>
            <CardDescription>Created by {group.creator_name}</CardDescription>
          </div>
          {isCreator && (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(group)}>
                <Edit className="h-4 w-4" />
                <span className="sr-only">Edit</span>
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the group "{group.name}" and all of its posts.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Delete Group</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-muted-foreground">{group.description}</p>
      </CardContent>
      <CardFooter className="flex justify-between items-center">
        <div className="flex items-center text-muted-foreground">
          <Users className="w-4 h-4 mr-2" />
          <span>{group.members.length} member(s)</span>
        </div>
        {!user ? (
          <Button asChild>
            <Link href="/login">Join</Link>
          </Button>
        ) : isMember ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={isCreator}>Leave</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure you want to leave?</AlertDialogTitle>
                <AlertDialogDescription>
                  You will lose membership to the group "{group.name}" and will no longer be able to post. You can rejoin at any time.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleLeave}>Leave</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <Button onClick={handleJoin}>Join</Button>
        )}
      </CardFooter>
    </Card>
  );
}

function GroupGrid({ groups, onEdit }: { groups: Group[]; onEdit: (group: Group) => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {groups.map((group) => (
        <GroupCard key={group.id} group={group} onEdit={onEdit} />
      ))}
    </div>
  );
}


export default function CommunityPage() {
  const { groups } = useCommunity();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [selectedGroup, setSelectedGroup] = React.useState<Group | null>(null);

  const { myGroups, memberGroups, otherGroups } = React.useMemo(() => {
    if (!user) {
      return { myGroups: [], memberGroups: [], otherGroups: groups };
    }
    const myGroups = groups.filter(g => g.creator_id === user.id);
    const memberGroups = groups.filter(g => g.members.includes(user.id) && g.creator_id !== user.id);
    const otherGroups = groups.filter(g => !g.members.includes(user.id));
    return { myGroups, memberGroups, otherGroups };
  }, [groups, user]);
  
  const handleEdit = (group: Group) => {
    setSelectedGroup(group);
    setIsEditDialogOpen(true);
  };
  
  const handleSaveEdit = async (data: z.infer<typeof editGroupSchema>) => {
    if (selectedGroup) {
      const result = await editGroupAction(selectedGroup.id, data);
      if (result.success) {
        toast({ title: "Group Updated" });
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      }
    }
  };

  return (
    <>
      {selectedGroup && (
        <EditGroupDialog
          group={selectedGroup}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onSave={handleSaveEdit}
        />
      )}

      <div className="container mx-auto px-4 py-8">
        <div className="relative mb-8 text-center">
          <h1 className="font-headline text-5xl font-bold">Community Groups</h1>
          <p className="text-muted-foreground text-lg mt-2 max-w-xl mx-auto">
            Find and join groups of like-minded food lovers.
          </p>
          <div className="mt-4 md:absolute md:top-1/2 md:-translate-y-1/2 md:right-0 md:mt-0">
            <Button asChild>
              <Link href="/community/create">
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Group
              </Link>
            </Button>
          </div>
        </div>
        
        {user ? (
          <Tabs defaultValue="my-groups">
            <TabsList className="mb-6 grid w-full grid-cols-3">
              <TabsTrigger value="my-groups">My Groups ({myGroups.length})</TabsTrigger>
              <TabsTrigger value="member-of">Groups I'm In ({memberGroups.length})</TabsTrigger>
              <TabsTrigger value="explore">Explore ({otherGroups.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="my-groups">
              {myGroups.length > 0 ? (
                <GroupGrid groups={myGroups} onEdit={handleEdit} />
              ) : (
                 <div className="text-center py-16 bg-card rounded-lg">
                    <h3 className="font-headline text-2xl mb-2">No Groups Created</h3>
                    <p className="text-muted-foreground">You haven't created any groups yet. Why not start one?</p>
                </div>
              )}
            </TabsContent>
            <TabsContent value="member-of">
              {memberGroups.length > 0 ? (
                <GroupGrid groups={memberGroups} onEdit={handleEdit} />
              ) : (
                <div className="text-center py-16 bg-card rounded-lg">
                    <h3 className="font-headline text-2xl mb-2">Not in Any Groups</h3>
                    <p className="text-muted-foreground">You haven't joined any groups. Go explore!</p>
                </div>
              )}
            </TabsContent>
            <TabsContent value="explore">
              {otherGroups.length > 0 ? (
                <GroupGrid groups={otherGroups} onEdit={handleEdit} />
              ) : (
                <div className="text-center py-16 bg-card rounded-lg">
                    <h3 className="font-headline text-2xl mb-2">All Caught Up!</h3>
                    <p className="text-muted-foreground">You are a member of every group available.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <GroupGrid groups={groups} onEdit={handleEdit} />
        )}

      </div>
    </>
  );
}
