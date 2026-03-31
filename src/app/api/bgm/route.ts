import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-auth'
import { apiHandler } from '@/lib/api-errors'
import { BGM_CATEGORY_KEYS } from '@/lib/bgm/categories'

/**
 * GET /api/bgm — 获取 BGM 列表（支持分类筛选）
 */
export const GET = apiHandler(async (request: NextRequest) => {
    const session = await requireAuth()
    const userId = session.user.id

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const mood = searchParams.get('mood')

    const where: Record<string, unknown> = {
        OR: [
            { isBuiltIn: true },
            { userId },
        ],
    }
    if (category && BGM_CATEGORY_KEYS.includes(category)) {
        where.category = category
    }
    if (mood) {
        where.mood = mood
    }

    const bgmAssets = await prisma.bgmAsset.findMany({
        where,
        orderBy: [{ isBuiltIn: 'desc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json({ bgmAssets })
})

/**
 * POST /api/bgm — 上传/创建自定义 BGM
 */
export const POST = apiHandler(async (request: NextRequest) => {
    const session = await requireAuth()
    const userId = session.user.id

    const body = await request.json()
    const { name, category, mood, duration, audioUrl, mediaId } = body

    if (!name || !category || !mood || !duration || !audioUrl) {
        return NextResponse.json(
            { error: 'Missing required fields: name, category, mood, duration, audioUrl' },
            { status: 400 }
        )
    }

    const bgmAsset = await prisma.bgmAsset.create({
        data: {
            name,
            category,
            mood,
            duration: Math.round(duration),
            audioUrl,
            mediaId: mediaId || null,
            isBuiltIn: false,
            userId,
        },
    })

    return NextResponse.json({ bgmAsset }, { status: 201 })
})
