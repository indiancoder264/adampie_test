
'use client';

import { Suspense } from 'react';
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { verifyEmailAction } from '@/lib/actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldCheck, ShieldX } from 'lucide-react';
import Link from 'next/link';

function VerificationComponent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email address...');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token found. Please check your link.');
      return;
    }

    const verifyToken = async () => {
      const result = await verifyEmailAction(token);
      if (result.success) {
        setStatus('success');
        setMessage(result.message);
      } else {
        setStatus('error');
        setMessage(result.error);
      }
    };

    verifyToken();
  }, [token]);

  return (
    <div className="container mx-auto px-4 py-12 max-w-lg">
      <Card>
        <CardHeader className="text-center">
          {status === 'loading' && <Loader2 className="mx-auto h-12 w-12 text-primary mb-4 animate-spin" />}
          {status === 'success' && <ShieldCheck className="mx-auto h-12 w-12 text-green-500 mb-4" />}
          {status === 'error' && <ShieldX className="mx-auto h-12 w-12 text-destructive mb-4" />}
          <CardTitle className="font-headline text-4xl">
            {status === 'loading' && 'Verifying...'}
            {status === 'success' && 'Email Verified!'}
            {status === 'error' && 'Verification Failed'}
          </CardTitle>
          <CardDescription className="text-lg">
            {message}
          </CardDescription>
        </CardHeader>
        {status !== 'loading' && (
          <CardContent className="text-center">
            <Button asChild>
              <Link href="/login">Proceed to Login</Link>
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <VerificationComponent />
        </Suspense>
    )
}
