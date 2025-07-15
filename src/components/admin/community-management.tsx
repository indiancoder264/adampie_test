
"use client";

import React from "react";
import { useCommunity, type Report } from "@/lib/community";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Check, Trash2, Info } from "lucide-react";
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
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"
import { useAllUsers } from "@/lib/users";
import { useToast } from "@/hooks/use-toast";
import { deleteGroupAction, deletePostAction, deleteCommentAction } from "@/lib/actions";

export function CommunityManagement() {
  const { groups } = useCommunity();
  const { allUsers } = useAllUsers();
  const { toast } = useToast();
  const [displayDates, setDisplayDates] = React.useState<Record<string, string>>({});

  const userMap = React.useMemo(() => {
    return new Map(allUsers.map(user => [user.id, user.name]));
  }, [allUsers]);

  const reportedContent = React.useMemo(() => {
    const content: {
        type: 'Post' | 'Comment';
        item: { id: string; content: string; author_name: string; reports?: Report[] };
        groupName: string;
        postId: string;
        commentId?: string;
    }[] = [];

    for (const group of groups) {
      for (const post of group.posts) {
        if (post.reports && post.reports.length > 0) {
          content.push({ type: 'Post', item: post, groupName: group.name, postId: post.id });
        }
        for (const comment of post.comments) {
          if (comment.reports && comment.reports.length > 0) {
            content.push({ type: 'Comment', item: comment, groupName: group.name, postId: post.id, commentId: comment.id });
          }
        }
      }
    }
    return content.sort((a, b) => (b.item.reports?.length ?? 0) - (a.item.reports?.length ?? 0));
  }, [groups]);

  React.useEffect(() => {
    const newDates: Record<string, string> = {};
    groups.forEach(group => {
      newDates[group.id] = new Date(group.created_at).toLocaleDateString();
    });
    setDisplayDates(newDates);
  }, [groups]);

  const getUserName = (userId: string) => {
    return userMap.get(userId) || "Unknown User";
  };

  const handleDeleteContent = async (identifiers: { postId: string; commentId?: string }) => {
    const result = identifiers.commentId
      ? await deleteCommentAction(identifiers.commentId)
      : await deletePostAction(identifiers.postId);
    
    if (result.success) {
      toast({ title: "Content Deleted" });
    } else {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    }
  };

  const handleGroupDelete = async (groupId: string) => {
    const result = await deleteGroupAction(groupId);
    if (result.success) {
      toast({
        title: "Group Deleted",
        description: "The group has been successfully deleted.",
      });
    } else {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
    }
  };

  const handleDismissReport = (identifiers: { postId: string; commentId?: string }) => {
    // This would require a DB change to add a 'dismissed' flag to reports.
    // For now, it's a placeholder.
    console.log("Dismissing report (not implemented)", identifiers);
    toast({ title: "Note", description: "Dismissing reports is not yet implemented."});
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Manage Community</CardTitle>
        <CardDescription>Oversee groups and moderate reported content.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="groups">
          <TabsList>
            <TabsTrigger value="groups">Groups</TabsTrigger>
            <TabsTrigger value="reports">
              Reported Content
              {reportedContent.length > 0 && (
                <Badge variant="destructive" className="ml-2">{reportedContent.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="groups" className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Group Name</TableHead>
                  <TableHead>Creator</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-center">Members</TableHead>
                  <TableHead className="text-center">Posts</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell className="font-medium">{group.name}</TableCell>
                    <TableCell>{group.creator_name}</TableCell>
                    <TableCell>{displayDates[group.id] || "..."}</TableCell>
                    <TableCell className="text-center">{group.members.length}</TableCell>
                    <TableCell className="text-center">{group.posts.length}</TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete Group</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the group "{group.name}" and all of its posts and comments. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleGroupDelete(group.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="reports" className="mt-4">
             {reportedContent.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Content</TableHead>
                      <TableHead>Author</TableHead>
                      <TableHead>Group</TableHead>
                      <TableHead>Reports</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportedContent.map(({ type, item, groupName, postId, commentId }) => (
                      <TableRow key={`${type}-${item.id}`}>
                        <TableCell><Badge variant={type === 'Post' ? 'default' : 'secondary'}>{type}</Badge></TableCell>
                        <TableCell className="max-w-sm truncate italic">"{item.content}"</TableCell>
                        <TableCell>{item.author_name}</TableCell>
                        <TableCell>{groupName}</TableCell>
                        <TableCell>
                          <HoverCard>
                            <HoverCardTrigger asChild>
                              <Button variant="link" className="p-0 h-auto">
                                <Info className="h-4 w-4 mr-1" />
                                {item.reports?.length || 0}
                              </Button>
                            </HoverCardTrigger>
                            <HoverCardContent className="w-80">
                                <div className="space-y-2">
                                  <h4 className="font-semibold">Report Details</h4>
                                  {(item.reports || []).map((report, index) => (
                                      <div key={index} className="text-sm border-b pb-2 last:border-b-0">
                                          <p><span className="font-medium">Reporter:</span> {getUserName(report.reporter_id)}</p>
                                          <p><span className="font-medium">Reason:</span> {report.reason}</p>
                                          {report.details && <p><span className="font-medium">Details:</span> {report.details}</p>}
                                      </div>
                                  ))}
                                </div>
                            </HoverCardContent>
                          </HoverCard>
                        </TableCell>
                        <TableCell className="text-right">
                           <Button variant="ghost" size="icon" onClick={() => handleDismissReport({ postId, commentId })}>
                              <Check className="h-4 w-4" />
                              <span className="sr-only">Dismiss Report</span>
                           </Button>
                           <AlertDialog>
                             <AlertDialogTrigger asChild>
                               <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                  <span className="sr-only">Delete Content</span>
                               </Button>
                             </AlertDialogTrigger>
                             <AlertDialogContent>
                               <AlertDialogHeader>
                                 <AlertDialogTitle>Delete Content?</AlertDialogTitle>
                                 <AlertDialogDescription>
                                   This will permanently delete this {type.toLowerCase()}. This action cannot be undone.
                                 </AlertDialogDescription>
                               </AlertDialogHeader>
                               <AlertDialogFooter>
                                 <AlertDialogCancel>Cancel</AlertDialogCancel>
                                 <AlertDialogAction onClick={() => handleDeleteContent({ postId, commentId })}>Delete</AlertDialogAction>
                               </AlertDialogFooter>
                             </AlertDialogContent>
                           </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center text-muted-foreground py-12">
                  <p>There is no reported content to review. Great job!</p>
                </div>
              )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
