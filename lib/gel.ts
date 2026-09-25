// Tints the page with a photo's stage-light color. --gel switches instantly for the small UI accents;
// the room light and waves (components/Atmosphere.tsx) hear the event and fade to it on their own,
// which is far cheaper than transitioning a variable on <html> (that restyles the whole page per frame).
export const setGel = (color: string) => {
  const root = document.documentElement
  if (root.style.getPropertyValue('--gel') === color) return
  root.style.setProperty('--gel', color)
  window.dispatchEvent(new CustomEvent('gel', { detail: color }))
}
