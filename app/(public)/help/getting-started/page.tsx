import { redirect } from 'next/navigation'

export default function GettingStartedRedirectPage(): void {
  redirect('/docs')
}
