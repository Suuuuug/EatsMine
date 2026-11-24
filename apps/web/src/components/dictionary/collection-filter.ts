export function initialCollectionFilter(value: string | null): 'all' | 'collected' {
  return value === 'collected' ? 'collected' : 'all';
}
