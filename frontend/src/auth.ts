import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username (testuser)", type: "text", placeholder: "testuser" },
        password: { label: "Password (password)", type: "password" }
      },
      async authorize(credentials) {
        if (credentials?.username === "testuser" && credentials?.password === "password") {
          return { id: "user_test", name: "Test User", email: "test@example.com" }
        }
        if (credentials?.username === "alice" && credentials?.password === "password") {
          return { id: "user_alice", name: "Alice", email: "alice@example.com" }
        }
        return null;
      }
    })
  ],
  session: { strategy: "jwt" },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.sub = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (typeof token.id === "string") {
        session.user.id = token.id;
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET || "fallback-secret-for-dev",
})
