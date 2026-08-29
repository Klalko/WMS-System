import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    await requireRole('WORKER')
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'client' or 'partner'

    const contacts = await prisma.contact.findMany({
      where: type ? { type } : undefined,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { products: true }
        }
      }
    })

    return NextResponse.json({ data: contacts })
  } catch (e) {
    if (e instanceof Response) return e
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    // Only admins or managers should probably add contacts, but let's stick to 'user' for now or 'admin' depending on requirement. The user requested a new contact form, let's allow basic users for now unless requested.
    await requireRole('WORKER')
    const json = await request.json()
    const { type, name, phone, location, email } = json

    if (!type || !name) {
      return NextResponse.json({ error: 'Type and name are required' }, { status: 400 })
    }

    const contact = await prisma.contact.create({
      data: { type, name, phone, location, email },
    })

    return NextResponse.json({ data: contact })
  } catch (e) {
    if (e instanceof Response) return e
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
