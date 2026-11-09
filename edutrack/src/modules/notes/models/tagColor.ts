const DARK_TEXT = '#021024'
const LIGHT_TEXT = '#c1e8ff'

const channelLuminance = (channel: number): number => {
  const normalized = channel / 255
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4
}

const luminance = (hex: string): number => {
  const value = hex.replace('#', '')
  const red = Number.parseInt(value.slice(0, 2), 16)
  const green = Number.parseInt(value.slice(2, 4), 16)
  const blue = Number.parseInt(value.slice(4, 6), 16)
  return 0.2126 * channelLuminance(red)
    + 0.7152 * channelLuminance(green)
    + 0.0722 * channelLuminance(blue)
}

const contrastRatio = (first: number, second: number): number =>
  (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)

export const getTagTextColor = (backgroundColor: string): string => {
  const backgroundLuminance = luminance(backgroundColor)
  return contrastRatio(backgroundLuminance, luminance(LIGHT_TEXT))
    > contrastRatio(backgroundLuminance, luminance(DARK_TEXT))
    ? LIGHT_TEXT
    : DARK_TEXT
}
