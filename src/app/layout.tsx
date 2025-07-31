
import type { Metadata } from 'next';
import { Providers } from './providers';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';
import { fetchUsers, fetchRecipes, fetchGroups, fetchUserById } from '@/lib/data';
import { cookies } from 'next/headers';
import type { User } from '@/lib/auth';
import getPool from '@/lib/db';

export const metadata: Metadata = {
  title: 'RecipeRadar',
  description: 'Find your next favorite recipe.',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read session token from cookie
  const cookieStore = cookies();
  const sessionToken = cookieStore.get('session_token')?.value;
  let currentUser: User | null = null;
  
  if (sessionToken) {
    try {
      const pool = getPool();
      // Validate session against the database
      const sessionResult = await pool.query(
        'SELECT user_id FROM sessions WHERE id = $1 AND expires_at > NOW()', 
        [sessionToken]
      );
      
      if (sessionResult.rows.length > 0) {
        const userId = sessionResult.rows[0].user_id;
        // Fetch the full user object if the session is valid
        currentUser = await fetchUserById(userId);
      } else {
        // If session is invalid or expired, delete the cookie
        cookieStore.delete('session_token');
      }

    } catch(error) {
      console.error("Error validating session:", error);
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
