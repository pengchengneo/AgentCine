'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

type Props = {
  children: ReactNode
  slotId?: string
}

export function NavbarCenterPortal({ children, slotId = 'navbar-center-slot' }: Props) {
  const [container, setContainer] = useState<HTMLElement | null>(null)

  useEffect(() => {
    const el = document.getElementById(slotId)
    setContainer(el)
  }, [slotId])

  if (!container) return null
  return createPortal(children, container)
}
