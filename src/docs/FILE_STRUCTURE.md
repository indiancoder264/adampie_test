
# RecipeRadar Project File Structure

This document outlines the file and folder structure for the RecipeRadar application.

```
/
├── .env                  # Environment variables (POSTGRES_URL, RESEND_API_KEY, etc.)
├── .vscode/
│   └── settings.json     # VSCode editor settings
├── database/
│   └── schema.sql        # Executable SQL script to set up the entire database from scratch
├── README.md             # Basic project README
├── apphosting.yaml       # Firebase App Hosting configuration
├── components.json       # Configuration for ShadCN UI components
├── next.config.ts        # Next.js configuration file
├── package.json          # Project dependencies and scripts
├── tailwind.config.ts    # Tailwind CSS configuration
└── tsconfig.json         # TypeScript configuration
└── src/
    ├── app/              # Next.js App Router: all pages, layouts, and API routes
    │   ├── about/
    │   │   └── page.tsx  # About Us page
    │   ├── admin/
    │   │   └── page.tsx  # Admin Dashboard page (Client Component orchestrating admin features)
    │   ├── community/
    │   │   ├── [id]/
    │   │   │   └── page.tsx # Individual community group discussion page
    │   │   ├── create/
    │   │   │   └── page.tsx # Page to create a new community group
    │   │   └── page.tsx    # Main community hub page listing all groups
    │   ├── contact/
    │   │   └── page.tsx  # Contact Us page
    │   ├── cuisine/
    │   │   └── [region]/
    │   │       └── page.tsx # Page displaying all recipes for a specific cuisine
    │   ├── forgot-password/
    │   │   └── page.tsx  # Page for initiating a password reset
    │   ├── globals.css     # Global styles and Tailwind directives
    │   ├── layout.tsx      # Root layout (Server Component that fetches initial data)
    │   ├── login/
    │   │   └── page.tsx  # Login page (Client Component using a Server Action)
    │   ├── page.tsx        # Homepage
    │   ├── privacy/
    │   │   └── page.tsx  # Privacy Policy page
    │   ├── profile/
    │   │   └── page.tsx  # User profile page
    │   ├── providers.tsx   # Aggregates all React Context providers for client-side state
    │   ├── recipes/
    │   │   └── [id]/
    │   │       └── page.tsx # Recipe detail page
    │   ├── reset-password/
    │   │   └── page.tsx  # Page for completing a password reset with an OTP
    │   ├── signup/
    │   │   └── page.tsx  # Signup page (Client Component using a Server Action)
    │   ├── sitemap.ts      # Dynamically generates sitemap.xml on build
    │   ├── terms/
    │   │   └── page.tsx  # Terms of Service page
    │   └── verify-otp/
    │       └── page.tsx  # Page that handles the email verification OTP
    ├── components/         # Reusable React components
    │   ├── admin/          # Components used only on the Admin Dashboard
    │   ├── layout/         # Components for the overall site layout (Header, Footer)
    │   ├── recipe-card.tsx # Card for displaying a recipe summary
    │   ├── recipe-interaction.tsx # Client component for recipe page interactivity
    │   ├── search-and-filter.tsx  # Client component for the homepage search bar
    │   ├── star-rating.tsx # Component for displaying/interacting with star ratings
    │   └── ui/             # ShadCN UI components (Button, Card, etc.)
    ├── docs/               # Project documentation
    │   ├── setup/
    │   │   ├── DATABASE_MIGRATIONS.md
    │   │   ├── RESEND_SETUP.md
    │   │   ├── SUPABASE_SETUP.md
    │   │   └── VERCEL_DEPLOYMENT.md
    │   ├── APP_GUIDE.md
    │   ├── DATABASE_SCHEMA.md
    │   ├── FILE_STRUCTURE.md
    │   ├── implementation.md
    │   └── vulnerabilities.md
    ├── hooks/              # Custom React hooks (e.g., use-toast, use-mobile)
    │   ├── use-mobile.tsx
    │   └── use-toast.ts
    └── lib/                # Core logic, data access, and state management
        ├── actions.ts      # Server Actions for all secure database mutations
        ├── auth.tsx        # Auth Context provider for client-side user state
        ├── community.tsx   # Community Context provider
        ├── data.ts         # Server-side functions for fetching data from the database
        ├── db.ts           # PostgreSQL database connection pool setup
        ├── rate-limiter.ts # IP-based rate limiting service
        ├── recipes.tsx     # Recipes Context provider
        ├── supabase.ts     # Supabase client initialization
        ├── users.tsx       # Users Context provider
        └── utils.ts        # Utility functions (e.g., cn for Tailwind classes)
```