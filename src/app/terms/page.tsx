
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';

export default function TermsOfServicePage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <Card>
        <CardHeader className="text-center">
          <FileText className="mx-auto h-12 w-12 text-primary mb-4" />
          <CardTitle className="font-headline text-5xl">Terms of Service</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-muted-foreground">
          <h2 className="text-xl font-bold text-foreground">1. Agreement to Terms</h2>
          <p>By using our website, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.</p>
          
          <h2 className="text-xl font-bold text-foreground">2. User Conduct</h2>
          <p>You agree not to use the website for any unlawful purpose or any purpose prohibited under this clause. You agree not to use the website in any way that could damage the website, the services, or the general business of RecipeRadar.</p>
          
          <h2 className="text-xl font-bold text-foreground">3. User Content</h2>
          <p>You are responsible for any content, including text, images, and other material, that you post to the website. By posting content, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, and display such content.</p>
          
          <h2 className="text-xl font-bold text-foreground">4. Intellectual Property</h2>
          <p>All content on this website, including text, graphics, logos, and images, is the property of RecipeRadar or its content suppliers and is protected by international copyright laws.</p>

          <h2 className="text-xl font-bold text-foreground">5. Termination</h2>
          <p>We may terminate or suspend your account and bar access to the service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.</p>
          
          <h2 className="text-xl font-bold text-foreground">6. Governing Law</h2>
          <p>These Terms shall be governed and construed in accordance with the laws of the jurisdiction in which our company is based, without regard to its conflict of law provisions.</p>
        </CardContent>
      </Card>
    </div>
  );
}
