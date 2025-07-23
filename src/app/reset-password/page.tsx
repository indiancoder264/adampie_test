
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import React, { Suspense, useEffect } from "react";
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
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";


const resetPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  otp: z.string().min(6, "Please enter the 6-digit code."),
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
    const emailFromQuery = searchParams.get('email');
    const { toast } = useToast();

    const form = useForm<z.infer<typeof resetPasswordSchema>>({
        resolver: zodResolver(resetPasswordSchema),
        defaultValues: { 
          email: emailFromQuery || "", 
          otp: "",
          password: "", 
          confirmPassword: "" 
        },
    });
    
    useEffect(() => {
        if (!emailFromQuery) {
            toast({
                title: "Invalid Link",
                description: "The password reset page was accessed without an email. Please start from the 'Forgot Password' page.",
                variant: "destructive",
            });
            router.push('/forgot-password');
        }
    }, [emailFromQuery, router, toast]);

    const onSubmit = async (values: z.infer<typeof resetPasswordSchema>) => {
        const result = await resetPasswordAction(values);
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

    if (!emailFromQuery) {
        return null; // Render nothing while redirecting
    }

    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-14rem)] py-12 px-4">
            <Card className="w-full max-w-md mx-auto">
                <CardHeader className="text-center">
                    <CardTitle className="font-headline text-4xl">Reset Your Password</CardTitle>
                    <CardDescription>Enter the code from your email and choose a new password.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                <FormItem>
                                    <Label>Email</Label>
                                    <FormControl><Input type="email" placeholder="you@example.com" {...field} readOnly /></FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="otp"
                                render={({ field }) => (
                                  <FormItem>
                                    <Label>Verification Code</Label>
                                    <FormControl>
                                      <InputOTP maxLength={6} {...field}>
                                        <InputOTPGroup>
                                          <InputOTPSlot index={0} />
                                          <InputOTPSlot index={1} />
                                          <InputOTPSlot index={2} />
                                          <InputOTPSlot index={3} />
                                          <InputOTPSlot index={4} />
                                          <InputOTPSlot index={5} />
                                        </InputOTPGroup>
                                      </InputOTP>
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
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
