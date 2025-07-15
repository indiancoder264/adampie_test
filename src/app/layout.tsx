
import type { Metadata } from 'next';
import { Providers } from './providers';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';
import { fetchUsers, fetchRecipes, fetchGroups } from '@/lib/data';
import { cookies } from 'next/headers';
import type { User } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'RecipeRadar',
  description: 'Find your next favorite recipe.',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read user from cookie on the server to ensure auth state is fresh
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('user');
  let currentUser: User | null = null;
  if (userCookie) {
    try {
      currentUser = JSON.parse(userCookie.value);
    } catch {
      currentUser = null;
    }
  }

  // Fetch initial data on the server
  const users = await fetchUsers();
  const recipes = await fetchRecipes();
  const groups = await fetchGroups();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <Providers
          currentUser={currentUser}
          users={users}
          recipes={recipes}
          groups={groups}
        >
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-grow">{children}</main>
            <Footer />
          </div>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
