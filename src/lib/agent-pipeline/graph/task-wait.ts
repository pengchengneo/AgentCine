// src/lib/agent-pipeline/graph/task-wait.ts

import { prisma } from '@/lib/prisma'
import { TASK_STATUS } from '@/lib/task/types'

const POLL_INTERVAL_MS = 2000
const MAX_WAIT_MS = 15 * 60 * 1000 // 15 minutes

export async function waitForTaskCompletion(
  taskId: string,
  projectId: string,
): Promise<void> {
  const startTime = Date.now()

  while (Date.now() - startTime < MAX_WAIT_MS) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { status: true, errorCode: true, errorMessage: true },
    })

    if (!task) {
      throw new Error(`Task ${taskId} not found`)
    }

    if (task.status === TASK_STATUS.COMPLETED) {
      return
    }

    if (task.status === TASK_STATUS.FAILED || task.status === TASK_STATUS.DISMISSED) {
      throw new Error(
        `Task ${taskId} failed: ${task.errorCode || 'UNKNOWN'} - ${task.errorMessage || 'no details'}`,
      )
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
  }

  throw new Error(`Task ${taskId} timed out after ${MAX_WAIT_MS / 1000}s`)
}

export async function waitForMultipleTasksCompletion(
  taskIds: string[],
  projectId: string,
): Promise<void> {
  await Promise.all(taskIds.map((id) => waitForTaskCompletion(id, projectId)))
}
