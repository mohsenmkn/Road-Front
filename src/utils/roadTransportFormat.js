const jalaliDateTime = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function formatRoadDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : jalaliDateTime.format(date)
}

export function formatRials(value) {
  return new Intl.NumberFormat('fa-IR').format(Number(value || 0))
}
