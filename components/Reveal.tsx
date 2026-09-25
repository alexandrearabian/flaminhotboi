'use client'
import { useEffect, useRef, useState } from 'react'

// An <article> that gets `is-in` once, the first time a third of it is on screen. CSS does the
// motion; being one-shot (not tied to scroll position) it never rewinds or lags behind the scroll.
export function Reveal({ className, children, ...rest }: React.ComponentProps<'article'>) {
  const ref = useRef<HTMLElement>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      setInView(true)
      io.disconnect()
    }, { threshold: 0.3 })
    io.observe(ref.current!)
    return () => io.disconnect()
  }, [])
  return (
    <article ref={ref} className={`${className ?? ''}${inView ? ' is-in' : ''}`} {...rest}>
      {children}
    </article>
  )
}
