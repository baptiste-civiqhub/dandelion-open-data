export function focusHeading(id: string) {
  const heading = document.getElementById(id)
  if (!heading) return
  heading.setAttribute('tabindex', '-1')
  heading.scrollIntoView({ block: 'start' })
  heading.focus({ preventScroll: true })
}
