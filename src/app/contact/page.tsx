import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Mail } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function ContactPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <Card>
        <CardHeader className="text-center">
          <Mail className="mx-auto h-12 w-12 text-primary mb-4" />
          <CardTitle className="font-headline text-5xl">Contact Us</CardTitle>
          <CardDescription className="text-lg">
            We'd love to hear from you! Whether you have a question, feedback, or just want to say hello, feel free to reach out.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" placeholder="Your Name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea id="message" placeholder="Your message..." rows={5} />
            </div>
            <div className="flex justify-end">
              <Button type="submit">Send Message</Button>
            </div>
          </form>

          <div className="mt-8 border-t pt-6">
            <h3 className="text-xl font-semibold mb-2">Other ways to contact us</h3>
            <p className="mb-2">
              📧 Email us at:{" "}
              <a
                href="mailto:bobby.ch6969@gmail.com"
                className="text-primary underline"
              >
                bobby.ch6969@gmail.com
              </a>
            </p>
            <p>
              📸 Connect on Instagram:{" "}
              <Link
                href=""
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                @recipeshare_demo
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
