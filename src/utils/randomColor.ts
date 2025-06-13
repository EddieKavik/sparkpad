// A utility function to generate random colors from a predefined palette
// This is used for visualizations like charts where we need consistent colors

const colorPalette = [
  '#1976d2', // blue
  '#2196f3', // light blue
  '#03a9f4', // lighter blue
  '#00bcd4', // cyan
  '#009688', // teal
  '#4caf50', // green
  '#8bc34a', // light green
  '#cddc39', // lime
  '#ffeb3b', // yellow
  '#ffc107', // amber
  '#ff9800', // orange
  '#ff5722', // deep orange
  '#f44336', // red
  '#e91e63', // pink
  '#9c27b0', // purple
  '#673ab7', // deep purple
  '#3f51b5', // indigo
];

/**
 * Returns a random color from the predefined palette
 * @param seed Optional seed value to get consistent colors for the same input
 * @returns A hex color string
 */
export function randomColor(seed?: string | number): string {
  if (seed !== undefined) {
    // Simple hash function for strings
    if (typeof seed === 'string') {
      let hash = 0;
      for (let i = 0; i < seed.length; i++) {
        hash = ((hash << 5) - hash) + seed.charCodeAt(i);
        hash = hash & hash; // Convert to 32bit integer
      }
      seed = Math.abs(hash);
    }
    return colorPalette[seed % colorPalette.length];
  }
  
  // No seed, return truly random color
  return colorPalette[Math.floor(Math.random() * colorPalette.length)];
} 