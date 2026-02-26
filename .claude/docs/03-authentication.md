# Authentication & RBAC

## Stack
- **NextAuth.js v5** (Auth.js) with credentials provider
- **Prisma adapter** for session/user persistence in SQLite
- **bcryptjs** for password hashing
- **JWT strategy** — role stored in token, no DB lookup on every request

## Install

```bash
pnpm add next-auth @auth/prisma-adapter bcryptjs @types/bcryptjs
```

---

## 1. NextAuth Config

**`auth.ts`** (project root — next to `package.json`)

```typescript
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string }
        });

        if (!user?.password) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role, // important: pass role through
        };
      }
    })
  ],
  callbacks: {
    // Persist role in JWT token
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    // Expose role in session object
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',     // custom login page
    error: '/login',      // redirect auth errors to login
  },
});

// Export route handlers for app/api/auth/[...nextauth]/route.ts
export const { GET, POST } = handlers;
```

---

## 2. TypeScript Augmentation

**`types/next-auth.d.ts`**
```typescript
import { DefaultSession, DefaultUser } from 'next-auth';

type Role = 'admin' | 'developer' | 'viewer';

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      id: string;
      role: Role;
    };
  }
  interface User extends DefaultUser {
    role: Role;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: Role;
  }
}
```

---

## 3. Route Handler

**`app/api/auth/[...nextauth]/route.ts`**
```typescript
export { GET, POST } from '@/auth';
```

---

## 4. Middleware — Protect All Routes

**`middleware.ts`** (project root)
```typescript
import { auth } from '@/auth';

export default auth((req) => {
  const isAuthenticated = !!req.auth;
  const isLoginPage = req.nextUrl.pathname === '/login';
  const isPublicApiRoute = req.nextUrl.pathname.startsWith('/api/auth');
  const isWebhookRoute = req.nextUrl.pathname.startsWith('/api/webhooks');

  // Allow: auth routes, webhook (verified by HMAC internally), login page
  if (isPublicApiRoute || isWebhookRoute || isLoginPage) return;

  // Redirect unauthenticated users to login
  if (!isAuthenticated) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', req.nextUrl.pathname);
    return Response.redirect(loginUrl);
  }
});

export const config = {
  // Apply middleware to everything except static files
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
};
```

---

## 5. Login Page

**`app/login/page.tsx`**
```typescript
import { signIn } from '@/auth';
import { AuthError } from 'next-auth';
import { redirect } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string; error?: string };
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-[360px]">
        <CardHeader>
          <CardTitle>Sign in to Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          {searchParams.error && (
            <p className="text-destructive text-sm mb-4">Invalid credentials</p>
          )}
          <form
            action={async (formData) => {
              'use server';
              try {
                await signIn('credentials', {
                  email: formData.get('email'),
                  password: formData.get('password'),
                  redirectTo: searchParams.callbackUrl ?? '/',
                });
              } catch (err) {
                if (err instanceof AuthError) redirect('/login?error=1');
                throw err;
              }
            }}
            className="space-y-4"
          >
            <Input name="email" type="email" placeholder="Email" required />
            <Input name="password" type="password" placeholder="Password" required />
            <Button type="submit" className="w-full">Sign in</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## 6. Role-Based Access Control

### Roles

| Role | Can do |
|------|--------|
| `admin` | Everything — delete containers, manage users, all API access |
| `developer` | Create/start/stop/restart containers, deploy, edit env vars |
| `viewer` | Read-only — list containers, view logs, view metrics |

### Enforce in API Routes

```typescript
import { auth } from '@/auth';

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();

  if (!session) return new Response('Unauthorized', { status: 401 });
  if (session.user.role !== 'admin') return new Response('Forbidden', { status: 403 });

  // ... proceed with delete
}
```

### Enforce in Server Components (Pages)

```typescript
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function AdminPage() {
  const session = await auth();
  if (session?.user?.role !== 'admin') redirect('/');

  return <div>Admin panel...</div>;
}
```

### Role Helper Utility

**`lib/auth-utils.ts`**
```typescript
import { auth } from '@/auth';
import type { Session } from 'next-auth';

type Role = 'admin' | 'developer' | 'viewer';

const roleLevel: Record<Role, number> = {
  admin: 3,
  developer: 2,
  viewer: 1,
};

export function hasRole(session: Session | null, minRole: Role): boolean {
  if (!session?.user) return false;
  const userRole = (session.user as any).role as Role ?? 'viewer';
  return roleLevel[userRole] >= roleLevel[minRole];
}

// Usage in API routes:
// const session = await auth();
// if (!hasRole(session, 'developer')) return new Response('Forbidden', { status: 403 });
```

---

## 7. User Seeding

Create an admin user on first run.

**`prisma/seed.ts`**
```typescript
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 12);
  await prisma.user.upsert({
    where: { email: 'admin@droplets.local' },
    update: {},
    create: {
      email: 'admin@droplets.local',
      name: 'Admin',
      password: passwordHash,
      role: 'admin',
    },
  });
  console.log('Seeded admin user: admin@droplets.local / admin123');
}

main().then(() => prisma.$disconnect());
```

Add to `package.json`:
```json
"prisma": {
  "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
}
```

Run: `pnpm prisma db seed`

---

## 8. Sign Out Button (for DashboardHeader)

```typescript
// In dashboard-header.tsx
import { signOut } from '@/auth';

// Add to header JSX:
<form action={async () => { 'use server'; await signOut({ redirectTo: '/login' }); }}>
  <Button type="submit" variant="ghost" size="sm">Sign out</Button>
</form>
```
