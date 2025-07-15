
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <Card>
        <CardHeader className="text-center">
          <Users className="mx-auto h-12 w-12 text-primary mb-4" />
          <CardTitle className="font-headline text-5xl">About RecipeRadar</CardTitle>
        </CardHeader>
        <CardContent className="text-lg text-muted-foreground space-y-6">
          <p>
            Welcome to RecipeRadar, your ultimate culinary companion! Our mission is to bring the joy of cooking to everyone, from seasoned chefs to kitchen novices. We believe that a great meal has the power to bring people together, create lasting memories, and nourish both body and soul.
          </p>
          <p>
            RecipeRadar was born from a passion for exploring global cuisines and sharing delicious discoveries. We noticed that while there are countless recipes online, it can be hard to find reliable, easy-to-follow instructions and a community to share the experience with. We set out to change that.
          </p>
          <p>
            Our platform offers a diverse collection of recipes from around the world, each one tested and curated to ensure you get perfect results every time. With our interactive step-by-step guides, you'll feel like you have a personal chef walking you through each recipe.
          </p>
          <p>
            But RecipeRadar is more than just a collection of recipes. It's a vibrant community of food lovers. You can share your own tips, rate recipes, and join groups to connect with others who share your culinary passions.
          </p>
          <p>
            Thank you for being part of our journey. We're excited to see what you create!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
