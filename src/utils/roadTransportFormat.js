const jalaliDateTime = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Tehran',
})
const jalaliDate = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  dateStyle: 'short',
  timeZone: 'Asia/Tehran',
})

export function formatRoadDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : jalaliDate.format(date)
}

export function formatRoadDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : jalaliDateTime.format(date)
}

export function formatRials(value) {
  return new Intl.NumberFormat('fa-IR').format(Number(value || 0))
}
