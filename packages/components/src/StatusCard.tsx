import type { ReactNode } from 'react'
import styles from './StatusCard.module.css'

export type StatusCardTone = 'info' | 'success' | 'warning'

export interface StatusCardProps {
  /** Heading shown at the top of the card. */
  title: string
  /** Colour of the accent bar. Defaults to `info`. */
  tone?: StatusCardTone
  children?: ReactNode
}

/**
 * Sample shared component. Styled with a CSS module (no Tailwind / Lightning
 * CSS), so it builds with the WASM-only toolchain.
 */
export function StatusCard({ title, tone = 'info', children }: StatusCardProps) {
  return (
    <section className={`${styles.card} ${styles[tone]}`} role="status" aria-label={title}>
      <h2 className={styles.title}>{title}</h2>
      {children !== undefined && <div className={styles.body}>{children}</div>}
    </section>
  )
}
