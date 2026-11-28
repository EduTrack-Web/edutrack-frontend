const DEFAULT_EVENT_COLOR = '#2563EB'
const MAX_LUMINANCE_FOR_WHITE = 1.05 / 4.5 - 0.05
const MEDIUM_COLOR_SHADE = 0.84

const toLinearChannel = (channel: number): number => {
  const value = channel / 255
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
}

const getLuminance = (red: number, green: number, blue: number): number =>
  0.2126 * toLinearChannel(red) + 0.7152 * toLinearChannel(green) + 0.0722 * toLinearChannel(blue)

const getShadedChannel = (channel: number): number => Math.floor(channel * MEDIUM_COLOR_SHADE)

export function getCalendarEventCardColors(eventColor?: string) {
  let backgroundColor = eventColor || DEFAULT_EVENT_COLOR
  if (/^#[\da-f]{3}$/i.test(backgroundColor)) {
    backgroundColor = `#${[...backgroundColor.slice(1)].map((digit) => digit.repeat(2)).join('')}`
  } else if (!/^#[\da-f]{6}$/i.test(backgroundColor)) {
    backgroundColor = DEFAULT_EVENT_COLOR
  }

  const hex = Number.parseInt(backgroundColor.slice(1), 16)
  const red = hex >> 16
  const green = (hex >> 8) & 255
  const blue = hex & 255
  if (getLuminance(red, green, blue) <= MAX_LUMINANCE_FOR_WHITE) {
    return { backgroundColor, color: '#fff' }
  }

  // Prefer white text on medium colors when a small display-only shade provides sufficient contrast.
  const shadedRed = getShadedChannel(red)
  const shadedGreen = getShadedChannel(green)
  const shadedBlue = getShadedChannel(blue)
  if (getLuminance(shadedRed, shadedGreen, shadedBlue) <= MAX_LUMINANCE_FOR_WHITE) {
    return {
      backgroundColor: `rgb(${shadedRed} ${shadedGreen} ${shadedBlue})`,
      color: '#fff',
    }
  }

  return { backgroundColor, color: '#000' }
}
