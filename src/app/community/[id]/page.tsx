
"use client";

import React from "react";
import Link from "next/link";
import { useParams, useRouter, notFound } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { cn } from "@/lib/utils";
import { useCommunity, type Post, type Comment, type Group } from "@/lib/community";
import { useAuth } from "@/lib/auth";
import { useAllUsers } from "@/lib/users";
import { useToast } from "@/hooks/use-toast";
import {
  addCommentAction,
  addPostAction,
  deleteCommentAction,
  deletePostAction,
  editCommentAction,
  editPostAction,
  joinGroupAction,
  leaveGroupAction,
  reportContentAction,
  togglePostReactionAction
} from "@/lib/actions";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Users, Send, ThumbsUp, ThumbsDown, Share2, MoreVertical, Edit, Trash2, AlertTriangle, ChefHat } from "lucide-react";
import { Separator } from "@/components/ui/separator";
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
  DialogClose
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import Image from "next/image";
import { supabase } from "@/lib/supabase";


const postSchema = z.object({
  content: z.string().min(1, "Post cannot be empty.").max(1000),
});

const commentSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty.").max(500),
});

const reportSchema = z.object({
  reason: z.string({ required_error: "Please select a reason." }),
  details: z.string().max(500).optional(),
});


function ReportDialog({ open, onOpenChange, onSubmit, hasReported }: { open: boolean, onOpenChange: (open: boolean) => void, onSubmit: (data: z.infer<typeof reportSchema>) => void, hasReported: boolean }) {
    const { toast } = useToast();
    const form = useForm<z.infer<typeof reportSchema>>({
        resolver: zodResolver(reportSchema),
    });

    const handleFormSubmit = (values: z.infer<typeof reportSchema>) => {
        onSubmit(values);
        onOpenChange(false);
        form.reset();
    };
    
    React.useEffect(() => {
      if (hasReported && open) {
        toast({
          title: "Already Reported",
          description: "You have already reported this content.",
          variant: "destructive"
        });
        onOpenChange(false);
      }
      // Reset form when dialog opens
      if (open) {
          form.reset();
      }
    }, [open, hasReported, onOpenChange, toast, form]);

    if (hasReported) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleFormSubmit)}>
                        <DialogHeader>
                            <DialogTitle>Report Content</DialogTitle>
                            <DialogDescription>
                                Please let us know why you are reporting this content. Your feedback is important.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                            <FormField
                                control={form.control}
                                name="reason"
                                render={({ field }) => (
                                    <FormItem className="space-y-3">
                                        <FormLabel>Reason for reporting</FormLabel>
                                        <FormControl>
                                            <RadioGroup
                                                onValueChange={field.onChange}
                                                defaultValue={field.value}
                                                className="flex flex-col space-y-1"
                                            >
                                                <FormItem className="flex items-center space-x-3 space-y-0">
                                                    <FormControl><RadioGroupItem value="Spam" /></FormControl>
                                                    <FormLabel className="font-normal">Spam or Misleading</FormLabel>
                                                </FormItem>
                                                <FormItem className="flex items-center space-x-3 space-y-0">
                                                    <FormControl><RadioGroupItem value="Harassment" /></FormControl>
                                                    <FormLabel className="font-normal">Harassment or Hate Speech</FormLabel>
                                                </FormItem>
                                                <FormItem className="flex items-center space-x-3 space-y-0">
                                                    <FormControl><RadioGroupItem value="Inappropriate Content" /></FormControl>
                                                    <FormLabel className="font-normal">Inappropriate or Explicit Content</FormLabel>
                                                </FormItem>
                                                <FormItem className="flex items-center space-x-3 space-y-0">
                                                    <FormControl><RadioGroupItem value="Other" /></FormControl>
                                                    <FormLabel className="font-normal">Other</FormLabel>
                                                </FormItem>
                                            </RadioGroup>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="details"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel htmlFor="details">Additional Details (Optional)</FormLabel>
                                        <FormControl>
                                            <Textarea id="details" placeholder="Provide more information..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button type="submit">Submit Report</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function CommentDisplay({ comment, postId }: { comment: Comment, postId: string }) {
    const { user } = useAuth();
    const { toast } = useToast();
    
    const [displayDate, setDisplayDate] = React.useState("");
    const [isEditDialogOpen, setEditDialogOpen] = React.useState(false);
    const [isReportDialogOpen, setReportDialogOpen] = React.useState(false);
    const [editedContent, setEditedContent] = React.useState(comment.content);

    const isCommentAuthor = user?.id === comment.author_id;
    const hasReported = user ? (comment.reports || []).some(r => r.reporter_id === user.id) : false;
    
    const createdAt = new Date(comment.created_at).getTime();
    const updatedAt = comment.updated_at ? new Date(comment.updated_at).getTime() : createdAt;
    const isEdited = updatedAt > createdAt;

    const handleEditSubmit = async () => {
        if (editedContent.trim() === "") {
            toast({ title: "Error", description: "Comment content cannot be empty.", variant: "destructive" });
            return;
        }
        const result = await editCommentAction(comment.id, editedContent);
        setEditDialogOpen(false);
        if (result.success) {
            toast({ title: "Comment Updated", description: "Your comment has been successfully updated." });
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
    };

    const handleDeleteComment = async () => {
        const result = await deleteCommentAction(comment.id);
         if (result.success) {
            toast({ title: "Comment Deleted", description: "Your comment has been removed.", variant: "destructive"});
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
    };
    
    const handleReportSubmit = async (data: z.infer<typeof reportSchema>) => {
        if (!user) return;
        const result = await reportContentAction(comment.id, 'comment', data.reason, data.details);
        if (result.success) {
            toast({ title: "Report Submitted", description: "Thank you for your feedback." });
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
    };

    React.useEffect(() => {
        const dateToDisplay = comment.updated_at || comment.created_at;
        setDisplayDate(new Date(dateToDisplay).toLocaleString());
    }, [comment.created_at, comment.updated_at]);

    const getAvatarUrl = (seed: string) => {
        return `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(seed)}`;
    };

    return (
        <>
            <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8 border">
                    <AvatarImage src={getAvatarUrl(comment.author_name || 'adventurer')} />
                    <AvatarFallback>{comment.author_name ? comment.author_name.charAt(0) : '?'}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                    <div className="bg-muted p-3 rounded-lg">
                        <div className="flex items-center justify-between">
                            <p className="font-semibold text-sm">{comment.author_name}</p>
                            <div className="flex items-center gap-2">
                                {displayDate && <p className="text-xs text-muted-foreground">{displayDate} {isEdited && '(edited)'}</p>}
                                {user && (
                                     <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-6 w-6">
                                            <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            {isCommentAuthor ? (
                                                <>
                                                    <DropdownMenuItem onClick={() => { setEditedContent(comment.content); setEditDialogOpen(true); }}>
                                                        <Edit className="mr-2 h-4 w-4" /> Edit
                                                    </DropdownMenuItem>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                                                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                            </DropdownMenuItem>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                                <AlertDialogDescription>This will permanently delete your comment.</AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction onClick={handleDeleteComment}>Delete</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </>
                                            ) : (
                                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} onClick={() => setReportDialogOpen(true)}>
                                                    <AlertTriangle className="mr-2 h-4 w-4" /> Report
                                                </DropdownMenuItem>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )}
                            </div>
                        </div>
                        <p className="text-sm mt-1">{comment.content}</p>
                    </div>
                </div>
            </div>

            <Dialog open={isEditDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Comment</DialogTitle>
                        <DialogDescription>
                            Make changes to your comment here. Click save when you're done.
                        </DialogDescription>
                    </DialogHeader>
                    <Textarea value={editedContent} onChange={(e) => setEditedContent(e.target.value)} rows={4} />
                    <DialogFooter>
                        <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
                        <Button onClick={handleEditSubmit}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ReportDialog 
                open={isReportDialogOpen} 
                onOpenChange={setReportDialogOpen}
                onSubmit={handleReportSubmit}
                hasReported={hasReported}
            />
        </>
    )
}

function PostDisplay({ post, groupId }: { post: Post, groupId: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [displayDate, setDisplayDate] = React.useState("");
  const [isEditDialogOpen, setEditDialogOpen] = React.useState(false);
  const [isReportDialogOpen, setReportDialogOpen] = React.useState(false);
  const [editedContent, setEditedContent] = React.useState(post.content);

  const commentForm = useForm<z.infer<typeof commentSchema>>({
    resolver: zodResolver(commentSchema),
    defaultValues: { content: "" },
  });

  const isPostAuthor = user?.id === post.author_id;
  const hasReported = user ? (post.reports || []).some(r => r.reporter_id === user.id) : false;

  const createdAt = new Date(post.created_at).getTime();
  const updatedAt = post.updated_at ? new Date(post.updated_at).getTime() : createdAt;
  const isEdited = updatedAt > createdAt;

  const onSubmitComment = async (values: z.infer<typeof commentSchema>) => {
    if (!user) {
        toast({ title: "Please log in", description: "You must be logged in to comment.", variant: "destructive" });
        return;
    }
    const result = await addCommentAction(post.id, values.content);
    if(result.success) {
      commentForm.reset();
    } else {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    }
  };
  
  const handleEditSubmit = async () => {
    if (editedContent.trim() === "") {
        toast({ title: "Error", description: "Post content cannot be empty.", variant: "destructive" });
        return;
    }
    const result = await editPostAction(post.id, editedContent);
    setEditDialogOpen(false);
    if (result.success) {
        toast({ title: "Post Updated", description: "Your post has been successfully updated." });
    } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
    }
  };

  const handleDeletePost = async () => {
    const result = await deletePostAction(post.id);
    if (result.success) {
        toast({ title: "Post Deleted", description: "Your post has been removed.", variant: "destructive"});
    } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
    }
  };

  const handleReportSubmit = async (data: z.infer<typeof reportSchema>) => {
    if (!user) return;
    const result = await reportContentAction(post.id, 'post', data.reason, data.details);
    if (result.success) {
        toast({ title: "Report Submitted", description: "Thank you for your feedback." });
    } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
    }
  };

  const handleReaction = async (reaction: "like" | "dislike") => {
    if (!user) {
      toast({
        title: "Please log in",
        description: "You must be logged in to react to a post.",
        variant: "destructive",
      });
      return;
    }
    const result = await togglePostReactionAction(post.id, reaction);
    if (!result.success) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(`${window.location.origin}/community/${groupId}#${post.id}`)
      .then(() => {
        toast({
          title: "Link Copied!",
          description: "A link to this post has been copied to your clipboard.",
        });
      })
      .catch(err => {
        console.error('Could not copy text: ', err);
        toast({
          title: "Error",
          description: "Could not copy link to clipboard.",
          variant: "destructive",
        });
      });
  };
  
  React.useEffect(() => {
    const dateToDisplay = post.updated_at || post.created_at;
    setDisplayDate(new Date(dateToDisplay).toLocaleString());
  }, [post.created_at, post.updated_at]);

  const userHasLiked = user ? post.likes?.includes(user.id) : false;
  const userHasDisliked = user ? post.dislikes?.includes(user.id) : false;

  const getAvatarUrl = (seed: string) => {
    return `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(seed)}`;
  };

  return (
    <>
      <Card id={post.id}>
        <CardHeader className="flex flex-row items-start gap-4">
          <Avatar className="h-12 w-12 border">
              <AvatarImage src={getAvatarUrl(post.author_name || 'adventurer')} />
              <AvatarFallback>{post.author_name ? post.author_name.charAt(0) : '?'}</AvatarFallback>
          </Avatar>
          <div className="flex-grow">
              <p className="font-semibold">{post.author_name}</p>
              {displayDate && <p className="text-sm text-muted-foreground">{displayDate} {isEdited && '(edited)'}</p>}
          </div>
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isPostAuthor ? (
                    <>
                        <DropdownMenuItem onClick={() => { setEditedContent(post.content); setEditDialogOpen(true); }}>
                            <Edit className="mr-2 h-4 w-4" /> <span>Edit</span>
                        </DropdownMenuItem>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4" /> <span>Delete</span>
                                </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>This action will permanently delete your post.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDeletePost}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </>
                ) : (
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} onClick={() => setReportDialogOpen(true)}>
                        <AlertTriangle className="mr-2 h-4 w-4" /> <span>Report Post</span>
                    </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </CardHeader>
        <CardContent>
            {post.shared_recipe && post.shared_recipe.id && (
                <Link href={`/recipes/${post.shared_recipe.id}`} className="block mb-4 border rounded-lg hover:border-primary transition-colors">
                    <div className="flex gap-4 p-4">
                        <div className="relative w-24 h-24 rounded-md overflow-hidden flex-shrink-0">
                            <Image src={post.shared_recipe.image_url} alt={post.shared_recipe.name} fill style={{objectFit: 'cover'}} />
                        </div>
                        <div className="flex-grow">
                            <div className="flex items-center gap-2 mb-1 text-sm text-primary">
                                <ChefHat className="h-4 w-4" />
                                <span>Recipe Shared</span>
                            </div>
                            <h4 className="font-headline text-lg leading-tight">{post.shared_recipe.name}</h4>
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{post.shared_recipe.description}</p>
                        </div>
                    </div>
                </Link>
            )}
            <p className="whitespace-pre-wrap">{post.content}</p>
        </CardContent>
        <CardFooter className="flex-col items-start gap-4">
          <div className="flex w-full items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-4">
                  {post.likes && post.likes.length > 0 && (
                      <span className="flex items-center gap-1">
                          <ThumbsUp className="h-4 w-4 text-primary" /> {post.likes.length}
                      </span>
                  )}
                  {post.dislikes && post.dislikes.length > 0 && (
                       <span className="flex items-center gap-1">
                          <ThumbsDown className="h-4 w-4 text-muted-foreground" /> {post.dislikes.length}
                      </span>
                  )}
              </div>
              <span>{post.comments.length} {post.comments.length === 1 ? 'Comment' : 'Comments'}</span>
          </div>
          <Separator />
          <div className="grid w-full grid-cols-3">
            <Button variant="ghost" className="flex items-center justify-center" onClick={() => handleReaction('like')}>
              <ThumbsUp className={cn("h-4 w-4", userHasLiked && "fill-primary text-primary")} />
              <span className="ml-2">Like</span>
            </Button>
            <Button variant="ghost" className="flex items-center justify-center" onClick={() => handleReaction('dislike')}>
              <ThumbsDown className={cn("h-4 w-4", userHasDisliked && "fill-destructive text-destructive")} />
              <span className="ml-2">Dislike</span>
            </Button>
            <Button variant="ghost" className="flex items-center justify-center" onClick={handleShare}>
              <Share2 className="h-4 w-4" />
              <span className="ml-2">Share</span>
            </Button>
          </div>
          <Separator />
          <div className="w-full space-y-4">
              {post.comments.map(comment => <CommentDisplay key={comment.id} comment={comment} postId={post.id} />)}
          </div>
          {user && (
              <Form {...commentForm}>
                  <form onSubmit={commentForm.handleSubmit(onSubmitComment)} className="flex w-full items-start gap-2 pt-4">
                      <FormField
                          control={commentForm.control}
                          name="content"
                          render={({ field }) => (
                              <FormItem className="flex-grow">
                                  <FormControl>
                                      <Textarea placeholder="Write a comment..." {...field} rows={1} className="min-h-0" />
                                  </FormControl>
                              </FormItem>
                          )}
                      />
                      <Button type="submit" size="icon"><Send className="h-4 w-4" /></Button>
                  </form>
              </Form>
          )}
        </CardFooter>
      </Card>
      
      <Dialog open={isEditDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Edit Post</DialogTitle>
                <DialogDescription>
                    Make changes to your post here. Click save when you're done.
                </DialogDescription>
            </DialogHeader>
            <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                rows={6}
            />
            <DialogFooter className="flex-row justify-end gap-2 pt-2">
                <DialogClose asChild>
                    <Button type="button" variant="secondary">Cancel</Button>
                </DialogClose>
                <Button onClick={handleEditSubmit}>Save Changes</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      <ReportDialog 
          open={isReportDialogOpen} 
          onOpenChange={setReportDialogOpen}
          onSubmit={handleReportSubmit}
          hasReported={hasReported}
      />
    </>
  )
}

export default function GroupDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { groups } = useCommunity();
  const { user } = useAuth();
  const { allUsers } = useAllUsers();
  const { toast } = useToast();
  
  const [timeFilter, setTimeFilter] = React.useState('24h');
  const [visiblePostsCount, setVisiblePostsCount] = React.useState(10);
  const [visibleMembersCount, setVisibleMembersCount] = React.useState(12);

  const [group, setGroup] = React.useState<Group | undefined | null>(undefined);
  
  React.useEffect(() => {
    const initialGroup = groups.find((g) => g.id === params.id);
    if(initialGroup) {
      setGroup(initialGroup);
    } else if (groups.length > 0) {
      setGroup(null); // Explicitly null if not found after groups have loaded
    }
  }, [groups, params.id]);


  // Real-time listeners for posts and comments
  React.useEffect(() => {
    if (!supabase || !params.id) return;
    
    const userMap = new Map(allUsers.map(u => [u.id, u.name]));

    const handlePostChange = (payload: any) => {
      setGroup(currentGroup => {
        if (!currentGroup) return currentGroup;
        const { eventType, new: newRecord, old } = payload;
        
        if (eventType === 'INSERT') {
          const authorName = userMap.get(newRecord.author_id) || 'Unknown User';
          const newPost = { ...newRecord, author_name: authorName, comments: [], likes: [], dislikes: [] };
          return { ...currentGroup, posts: [newPost, ...currentGroup.posts] };
        }
        if (eventType === 'UPDATE') {
          return { ...currentGroup, posts: currentGroup.posts.map(p => p.id === newRecord.id ? {...p, ...newRecord} : p) };
        }
        if (eventType === 'DELETE') {
          return { ...currentGroup, posts: currentGroup.posts.filter(p => p.id !== old.id) };
        }
        return currentGroup;
      });
    };
    
    const handleCommentChange = (payload: any) => {
      setGroup(currentGroup => {
        if (!currentGroup) return currentGroup;
        const { eventType, new: newRecord, old } = payload;
        
        if (eventType === 'INSERT') {
          const authorName = userMap.get(newRecord.author_id) || 'Unknown User';
          const newComment = { ...newRecord, author_name: authorName };
          const posts = currentGroup.posts.map(post => {
            if (post.id === newRecord.post_id) {
              return { ...post, comments: [...post.comments, newComment] };
            }
            return post;
          });
          return { ...currentGroup, posts };
        }
        if (eventType === 'UPDATE') {
           const posts = currentGroup.posts.map(post => {
            if (post.id === newRecord.post_id) {
              const comments = post.comments.map(c => c.id === newRecord.id ? {...c, ...newRecord} : c);
              return { ...post, comments };
            }
            return post;
          });
          return { ...currentGroup, posts };
        }
        if (eventType === 'DELETE') {
          const posts = currentGroup.posts.map(post => {
            if (post.id === old.post_id) {
                return { ...post, comments: post.comments.filter(c => c.id !== old.id) };
            }
            return post;
          });
          return { ...currentGroup, posts };
        }
        return currentGroup;
      });
    };
    
    const postsChannel = supabase.channel(`group-${params.id}-posts`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts', filter: `group_id=eq.${params.id}` }, handlePostChange)
      .subscribe();
      
    const commentsChannel = supabase.channel(`group-${params.id}-comments`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, handleCommentChange)
      .subscribe();
      
    return () => {
      if (supabase) {
        supabase.removeChannel(postsChannel);
        supabase.removeChannel(commentsChannel);
      }
    };

  }, [params.id, allUsers]);

  const form = useForm<z.infer<typeof postSchema>>({
    resolver: zodResolver(postSchema),
    defaultValues: { content: "" },
  });
  
  const filteredPosts = React.useMemo(() => {
    if (!group) return [];
    
    const now = new Date();
    const filtered = group.posts.filter(post => {
      const postDate = new Date(post.created_at);
      switch (timeFilter) {
        case '24h':
          return now.getTime() - postDate.getTime() < 24 * 60 * 60 * 1000;
        case '7d':
          return now.getTime() - postDate.getTime() < 7 * 24 * 60 * 60 * 1000;
        case '30d':
          return now.getTime() - postDate.getTime() < 30 * 24 * 60 * 60 * 1000;
        case 'all':
        default:
          return true;
      }
    });

    return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [group, timeFilter]);
  
  const postsToShow = filteredPosts.slice(0, visiblePostsCount);

  if (group === undefined) {
    return <div>Loading...</div>
  }
  
  if (group === null) {
    return notFound();
  }
  
  const isMember = user ? group.members.includes(user.id) : false;
  
  const onSubmitPost = async (values: z.infer<typeof postSchema>) => {
      if (!user) {
        toast({ title: "Please log in", description: "You must be logged in to create a post.", variant: "destructive" });
        return;
      }
      const result = await addPostAction(group.id, values.content);
      if(result.success) {
        form.reset();
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      }
  };

  const groupMembers = allUsers.filter(u => group.members.includes(u.id));
  const membersToShow = groupMembers.slice(0, visibleMembersCount);

  const getAvatarUrl = (seed: string) => {
    return `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(seed)}`;
  };
  
  const handleJoinGroup = async () => {
    if (!user) return;
    const result = await joinGroupAction(group.id);
    if (!result.success) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    }
  };
  
  const handleLeaveGroup = async () => {
    if (!user) return;
    const result = await leaveGroupAction(group.id);
    if (!result.success) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Button variant="outline" onClick={() => router.back()} className="mb-8">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Community
      </Button>

      <div className="flex flex-col gap-8">
        <main className="w-full space-y-8">
            <header className="mb-6">
            <h1 className="font-headline text-5xl font-bold">{group.name}</h1>
            <p className="text-muted-foreground text-lg mt-2">{group.description}</p>
            </header>

            {isMember && (
            <Card>
                <CardHeader>
                    <CardTitle>Create a New Post</CardTitle>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmitPost)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="content"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <Textarea placeholder="Share your thoughts with the group..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="flex justify-end">
                                <Button type="submit">Post</Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
            )}

            <div className="flex justify-end items-center gap-2">
            <Label htmlFor="time-filter" className="text-sm">Show posts from:</Label>
            <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger id="time-filter" className="w-[180px]">
                <SelectValue placeholder="Select time period" />
                </SelectTrigger>
                <SelectContent>
                <SelectItem value="24h">Last 24 Hours</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
            </Select>
            </div>

            <div className="space-y-6">
            {postsToShow.length > 0 ? (
                postsToShow.map(post => <PostDisplay key={post.id} post={post} groupId={group.id} />)
            ) : (
                <div className="text-center py-16 bg-card rounded-lg">
                    <h3 className="font-headline text-2xl mb-2">No Posts Yet</h3>
                    <p className="text-muted-foreground">No posts in this time period. Try selecting "All Time" or be the first to share something!</p>
                </div>
            )}
            {filteredPosts.length > visiblePostsCount && (
                <div className="flex justify-center">
                <Button onClick={() => setVisiblePostsCount(prev => prev + 10)} variant="secondary">
                    Show More Posts
                </Button>
                </div>
            )}
            </div>
        </main>

        <aside className="w-full space-y-6 pt-8 border-t">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" /> Members ({group.members.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {!user ? (
                    <Button asChild className="w-full">
                        <Link href="/login">Join Group</Link>
                    </Button>
                    ) : isMember ? (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" className="w-full">Leave Group</Button>
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
                            <AlertDialogAction onClick={handleLeaveGroup}>Leave Group</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    ) : (
                        <Button className="w-full" onClick={handleJoinGroup}>Join Group</Button>
                    )
                  }
                  <Separator />
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {membersToShow.map(member => (
                      <div key={member.id} className="flex flex-col items-center gap-2 text-center">
                          <Avatar className="h-16 w-16 border">
                              <AvatarImage src={getAvatarUrl(member.avatar)} />
                              <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                              <p className="font-semibold text-sm">{member.name}</p>
                              {group.creator_id === member.id && <p className="text-xs text-primary">Creator</p>}
                          </div>
                      </div>
                    ))}
                  </div>
                  {groupMembers.length > visibleMembersCount && (
                    <div className="flex justify-center mt-4">
                        <Button onClick={() => setVisibleMembersCount(groupMembers.length)} variant="secondary">
                            Show All {groupMembers.length} Members
                        </Button>
                    </div>
                  )}
                </CardContent>
            </Card>
        </aside>
      </div>
    </div>
  );
}