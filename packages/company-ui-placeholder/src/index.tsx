import type { ButtonHTMLAttributes } from 'react'

/**
 * PLACEHOLDER. Stands in for the button from the internal company component
 * library. Replace it via apps/<app>/src/ui/company.ts; do not build on it.
 */
export function CompanyButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" data-placeholder="company-ui" {...props} />
}
