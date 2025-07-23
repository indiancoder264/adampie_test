
"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { Suspense } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { resetPasswordAction } from "@/lib/actions";


const resetPasswordSchema = z.object({
  password: z.string()
    .min(8, "Password must be at least 8 characters.")
    .regex(/[a-zA-Z]/, "Password must contain at least one letter.")
    .regex(/[0-9]/, "Password must contain at least one number."),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
});


function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const { toast } = useToast();

    const form = useForm<z.infer<typeof resetPasswordSchema>>({
        resolver: zodResolver(resetPasswordSchema),
        defaultValues: { password: "", confirmPassword: "" },
    });
    
    React.useEffect(() => {
        if (!token) {
            toast({
                title: "Invalid Link",
                description: "The password reset link is missing or invalid. Please request a new one.",
                variant: "destructive",
            });
            router.push('/forgot-password');
        }
    }, [token, router, toast]);


    const onSubmit = async (values: z.infer<typeof resetPasswordSchema>) => {
        if (!token) return;

        const result = await resetPasswordAction(token, values.password);

        if (result.success) {
            toast({
                title: "Password Reset!",
                description: "Your password has been changed successfully. You can now log in.",
            });
            router.push('/login');
        } else {
            toast({
                title: "Reset Failed",
                description: result.error,
                variant: "destructive",
            });
        }
    };

    if (!token) {
        return null; // Render nothing while redirecting
    }

    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-14rem)] py-12 px-4">
            <Card className="w-full max-w-md mx-auto">
                <CardHeader className="text-center">
                    <CardTitle className="font-headline text-4xl">Reset Your Password</CardTitle>
                    <CardDescription>Choose a new, secure password for your account.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                <FormItem>
                                    <Label>New Password</Label>
                                    <FormControl><Input type="password" placeholder="********" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="confirmPassword"
                                render={({ field }) => (
                                <FormItem>
                                    <Label>Confirm New Password</Label>
                                    <FormControl><Input type="password" placeholder="********" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting ? 'Resetting...' : 'Reset Password'}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ResetPasswordForm />
        </Suspense>
    )
}

