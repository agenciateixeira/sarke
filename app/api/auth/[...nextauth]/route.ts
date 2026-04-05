import NextAuth from 'next-auth'
import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { logAuthEvent, serializeError } from '@/lib/auth-logger'

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/calendar',
            'https://www.googleapis.com/auth/calendar.events',
          ].join(' '),
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.expiresAt = account.expires_at
        token.providerAccountId = account.providerAccountId

        await logAuthEvent({
          event:      'oauth_jwt',
          status:     account.access_token ? 'success' : 'warning',
          message:    account.access_token
            ? 'Tokens OAuth recebidos do Google com sucesso'
            : 'Google retornou sem access_token',
          user_email: token.email as string,
          metadata: {
            provider:          account.provider,
            has_access_token:  !!account.access_token,
            has_refresh_token: !!account.refresh_token,
            expires_at:        account.expires_at,
          },
        })
      }
      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string
      session.refreshToken = token.refreshToken as string
      session.expiresAt = token.expiresAt as number
      session.providerAccountId = token.providerAccountId as string
      return session
    },
  },
  events: {
    async signIn({ user, account }) {
      await logAuthEvent({
        event:      'oauth_signin',
        status:     'success',
        message:    `Login Google concluído para ${user.email}`,
        user_email: user.email,
        metadata: {
          provider:       account?.provider,
          provider_id:    account?.providerAccountId,
        },
      })
    },
    async signOut({ token }) {
      await logAuthEvent({
        event:      'oauth_signout',
        status:     'success',
        message:    `Logout Google para ${token?.email}`,
        user_email: token?.email as string,
      })
    },
  },
  logger: {
    error(code, metadata) {
      logAuthEvent({
        event:   'nextauth_error',
        status:  'error',
        message: `NextAuth error: ${code}`,
        metadata: serializeError(metadata),
      })
    },
    warn(code) {
      logAuthEvent({
        event:   'nextauth_warning',
        status:  'warning',
        message: `NextAuth warning: ${code}`,
      })
    },
  },
  pages: {
    signIn: '/dashboard/configuracoes/calendario',
  },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
