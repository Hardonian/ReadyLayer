import { redirect } from 'next/navigation'

export default function PoliciesRedirectPage(): void {
  redirect('/docs')
}
