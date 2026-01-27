import { redirect } from 'next/navigation'

export default function HelpRedirectPage(): void {
  redirect('/docs')
}
