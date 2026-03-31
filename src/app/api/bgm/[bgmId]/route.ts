import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'
import { apiHandler } from '@/lib/api-errors'

type Params = { params: Promise<{ bgmId: string }> }

/**
 * GET /api/bgm/[bgmId] — 获取单个 BGM 详情
 */
export const GET = apiHandler(async (
    _request: NextRequest,
    { params }: Params
) => {
    await requireAuth()
    const { bgmId } = await params

    const bgmAsset = await prisma.bgmAsset.findUnique({
        where: { id: bgmId },
    })

    if (!bgmAsset) {
        return NextResponse.json({ error: 'BGM not found' }, { status: 404 })
    }

    return NextResponse.json({ bgmAsset })
})

/**
 * DELETE /api/bgm/[bgmId] — 删除自定义 BGM
 */
export const DELETE = apiHandler(async (
    _request: NextRequest,
    { params }: Params
) => {
    const session = await requireAuth()
    const userId = session.user.id
    const { bgmId } = await params

    const bgmAsset = await prisma.bgmAsset.findUnique({
        where: { id: bgmId },
    })

    if (!bgmAsset) {
        return NextResponse.json({ error: 'BGM not found' }, { status: 404 })
    }

    if (bgmAsset.isBuiltIn) {
        return NextResponse.json({ error: 'Cannot delete built-in BGM' }, { status: 403 })
    }

    if (bgmAsset.userId !== userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.bgmAsset.delete({ where: { id: bgmId } })

    return NextResponse.json({ success: true })
})
