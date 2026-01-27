import { redirect } from 'next/navigation'

export default function WelcomeRedirectPage(): void {
  redirect('/docs')
}
