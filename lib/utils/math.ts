// Logarithmic scaling helper for mapping large value ranges to a visual span and offset.
// Usage: const scale = makeLogScale(min, max); scale(value, span, offset)
export const makeLogScale = (domainMin: number, domainMax: number) =>
  (value: number, span = 1, offset = 0) => {
    const logMin = Math.log10(domainMin)
    const logMax = Math.log10(domainMax)
    const logVal = Math.log10(value)
    return offset + ((logVal - logMin) / (logMax - logMin)) * span
  }
