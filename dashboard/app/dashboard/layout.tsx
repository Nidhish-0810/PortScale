import { Nav } from '@/components/Nav'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies()
  const token = cookieStore.get('portscale_token')

  if (!token) {
    redirect('/')
  }

  return (
    <div>
      <Nav />
      <main>{children}</main>
    </div>
  )
}
