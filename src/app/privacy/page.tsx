
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield } from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <Card>
        <CardHeader className="text-center">
          <Shield className="mx-auto h-12 w-12 text-primary mb-4" />
          <CardTitle className="font-headline text-5xl">Privacy Policy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-muted-foreground">
            <h2 className="text-xl font-bold text-foreground">1. Introduction</h2>
            <p>Welcome to RecipeRadar. We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website.</p>
            
            <h2 className="text-xl font-bold text-foreground">2. Information We Collect</h2>
            <p>We may collect personal information such as your name, email address, and demographic information, such as your country and dietary preferences, when you register for an account. We also collect non-personal information, such as browser type, operating system, and web pages visited to help us manage our website.</p>
            
            <h2 className="text-xl font-bold text-foreground">3. Use of Your Information</h2>
            <p>We use the information we collect to operate and maintain our website, send you promotional information, respond to your comments or inquiries, and to personalize your user experience.</p>
            
            <h2 className="text-xl font-bold text-foreground">4. Disclosure of Your Information</h2>
            <p>We do not sell, trade, or otherwise transfer to outside parties your personally identifiable information. This does not include trusted third parties who assist us in operating our website, conducting our business, or servicing you, so long as those parties agree to keep this information confidential.</p>
            
            <h2 className="text-xl font-bold text-foreground">5. Security of Your Information</h2>
            <p>We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable.</p>
            
            <h2 className="text-xl font-bold text-foreground">6. Contact Us</h2>
            <p>If you have questions or comments about this Privacy Policy, please contact us through the contact page.</p>
        </CardContent>
      </Card>
    </div>
  );
}
