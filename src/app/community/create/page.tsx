
"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { createGroupAction } from "@/lib/actions";
import { ArrowLeft } from "lucide-react";

const createGroupSchema = z.object({
  name: z.string().min(3, "Group name must be at least 3 characters long.").max(50, "Group name cannot exceed 50 characters."),
  description: z.string().min(10, "Description must be at least 10 characters long.").max(200, "Description cannot exceed 200 characters."),
});

export default function CreateGroupPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof createGroupSchema>>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  React.useEffect(() => {
    if (!user) {
      router.push("/login");
      toast({
        title: "Authentication Required",
        description: "You must be logged in to create a group.",
        variant: "destructive",
      });
    }
  }, [user, router, toast]);

  const onSubmit = async (values: z.infer<typeof createGroupSchema>) => {
    if (user) {
      const result = await createGroupAction(values, user);
      if(result.success) {
        toast({ title: "Group Created!", description: `The group "${values.name}" has been created.` });
        router.push("/community");
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      }
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Button variant="outline" onClick={() => router.back()} className="mb-8">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Community
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-4xl">Create a New Group</CardTitle>
          <CardDescription>Start a new community around a topic you're passionate about.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Group Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Vegan Baking Enthusiasts" {...field} />
                    </FormControl>
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
                    <FormControl>
                      <Textarea placeholder="What is this group about?" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end">
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Creating...' : 'Create Group'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
