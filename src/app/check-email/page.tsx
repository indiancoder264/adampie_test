
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MailCheck } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function CheckEmailPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-lg">
      <Card>
        <CardHeader className="text-center">
          <MailCheck className="mx-auto h-12 w-12 text-primary mb-4" />
          <CardTitle className="font-headline text-4xl">Check Your Inbox</CardTitle>
          <CardDescription className="text-lg">
            We've sent a verification code to your email address. Please use it to complete your registration.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground">Didn't receive an email?</p>
          <Button variant="link" asChild>
            <Link href="/signup">Try signing up again</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
