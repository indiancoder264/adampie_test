
'use client';

import { Suspense } from 'react';
import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { verifyOtpAction } from '@/lib/actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ShieldCheck, ShieldX } from 'lucide-react';
import Link from 'next/link';

function VerificationComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  
  const [otp, setOtp] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('Enter the 6-digit code sent to your email.');

  useEffect(() => {
    if (!email) {
      setStatus('error');
      setMessage('No email address found. Please start the signup process again.');
    }
  }, [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !otp || otp.length !== 6) {
      setStatus('error');
      setMessage('Please enter a valid 6-digit code.');
      return;
    }
    
    setStatus('loading');
    setMessage('Verifying your code...');

    const result = await verifyOtpAction(email, otp);
    if (result.success) {
      setStatus('success');
      setMessage(result.message || 'Verification successful! Redirecting...');
      setTimeout(() => router.push('/login'), 2000); // Redirect to login after a short delay
    } else {
      setStatus('error');
      setMessage(result.error || 'An unknown error occurred.');
    }
  };
  
  const getIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="mx-auto h-12 w-12 text-primary mb-4 animate-spin" />;
      case 'success':
        return <ShieldCheck className="mx-auto h-12 w-12 text-green-500 mb-4" />;
      case 'error':
        return <ShieldX className="mx-auto h-12 w-12 text-destructive mb-4" />;
      default:
        return <ShieldCheck className="mx-auto h-12 w-12 text-primary mb-4" />;
    }
  }

  const getTitle = () => {
     switch (status) {
      case 'loading':
        return 'Verifying...';
      case 'success':
        return 'Email Verified!';
      case 'error':
        return 'Verification Failed';
      default:
        return 'Verify Your Account';
    }
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-lg">
      <Card>
        <CardHeader className="text-center">
          {getIcon()}
          <CardTitle className="font-headline text-4xl">{getTitle()}</CardTitle>
          <CardDescription className="text-lg">
            {message}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status !== 'success' && (
             <form onSubmit={handleSubmit} className="space-y-4">
               <div className="space-y-2">
                 <Label htmlFor="otp">Verification Code</Label>
                 <Input 
                   id="otp" 
                   type="text"
                   inputMode="numeric"
                   maxLength={6}
                   value={otp}
                   onChange={(e) => setOtp(e.target.value)}
                   placeholder="123456"
                   disabled={status === 'loading'}
                 />
               </div>
               <Button type="submit" className="w-full" disabled={status === 'loading'}>
                 {status === 'loading' ? 'Verifying...' : 'Verify'}
               </Button>
            </form>
          )}
          {status === 'success' && (
             <div className="text-center">
                <Button asChild>
                  <Link href="/login">Proceed to Login</Link>
                </Button>
            </div>
          )}
           {status === 'error' && (
             <div className="text-center mt-4">
                <Button asChild variant="secondary">
                  <Link href="/signup">Try Signing Up Again</Link>
                </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyOtpPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <VerificationComponent />
        </Suspense>
    )
}
