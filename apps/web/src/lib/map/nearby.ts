export function nearbyMapUrl(latitude: number, longitude: number): string | null {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 85 || Math.abs(longitude) > 179.98) return null;
  const params = new URLSearchParams({ bbox: [longitude - 0.012, latitude - 0.009, longitude + 0.012, latitude + 0.009].join(','), layer: 'mapnik', marker: `${latitude},${longitude}` });
  return `https://www.openstreetmap.org/export/embed.html?${params}`;
}
