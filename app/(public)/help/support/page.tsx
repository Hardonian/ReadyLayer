import { redirect } from 'next/navigation'

export default function HelpSupportRedirectPage(): void {
  redirect('/docs')
}
