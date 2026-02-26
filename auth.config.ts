import type { NextAuthConfig } from 'next-auth';

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = (user as any).role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isAuthenticated = !!auth?.user;
      const isLoginPage = nextUrl.pathname === '/login';
      const isPublicApiRoute = nextUrl.pathname.startsWith('/api/auth');
      const isWebhookRoute = nextUrl.pathname.startsWith('/api/webhooks');

      if (isPublicApiRoute || isWebhookRoute || isLoginPage) return true;
      if (!isAuthenticated) return false;
      return true;
    },
  },
  providers: [], // Providers added in auth.ts (server-only)
  session: { strategy: 'jwt' },
};
