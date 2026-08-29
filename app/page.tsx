import { redirect } from 'next/navigation'

// Root "/" redirects to dashboard (auth is handled by middleware)
export default function RootPage() {
  redirect('/dashboard')
}
