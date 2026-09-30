import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to ReadyLayer',
}

export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return children
}
