<script setup>
import { computed, onMounted, ref } from 'vue'
import { AlertTriangle, CheckCircle2, Clock3, Database, RefreshCw, RotateCw } from 'lucide-vue-next'
import { roadExpensesService } from '@/services/roadExpensesService'
import { formatRoadDateTime } from '@/utils/roadTransportFormat'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const todayParts = new Intl.DateTimeFormat('en-US-u-ca-persian', { year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
const datePart = (type) => todayParts.find((item) => item.type === type)?.value || '01'
const today = `${datePart('year')}/${datePart('month')}/${datePart('day')}`
const form = ref({ from: `${datePart('year')}/01/01`, to: today })
const status = ref(null)
const loading = ref(false)
const loadingStatus = ref(true)
const error = ref('')
const message = ref('')
const canSync = computed(() => auth.can('road_bills.sync'))
const isBusy = computed(() => loading.value || status.value?.status === 'running')
const rangeValid = computed(() => /^\d{4}\/\d{2}\/\d{2}$/.test(form.value.from) && /^\d{4}\/\d{2}\/\d{2}$/.test(form.value.to) && form.value.from <= form.value.to && form.value.to <= today)

async function loadStatus() {
  loadingStatus.value = true
  try {
    const { data } = await roadExpensesService.latestBitaSync()
    status.value = data.data || null
  } catch (e) {
    error.value = e.response?.data?.message || 'وضعیت همگام‌سازی دریافت نشد.'
  } finally { loadingStatus.value = false }
}
async function startSync() {
  if (!rangeValid.value || isBusy.value || !canSync.value) return
  loading.value = true; error.value = ''; message.value = ''
  try {
    const { data } = await roadExpensesService.syncBitaBills({ from: form.value.from, to: form.value.to })
    status.value = data.data || null
    if (status.value?.status === 'success') message.value = 'همگام‌سازی بازه انتخاب‌شده با موفقیت انجام شد.'
  } catch (e) {
    error.value = Object.values(e.response?.data?.errors || {})[0]?.[0] || e.response?.data?.message || 'شروع همگام‌سازی ناموفق بود.'
    await loadStatus()
  } finally { loading.value = false }
}
const statusLabel = computed(() => ({ success: 'موفق', failed: 'ناموفق', running: 'در حال اجرا' }[status.value?.status] || 'هنوز اجرا نشده'))
const statusTone = computed(() => ({ success: 'text-emerald-700 bg-emerald-50', failed: 'text-rose-700 bg-rose-50', running: 'text-amber-700 bg-amber-50' }[status.value?.status] || 'text-slate-600 bg-slate-100'))
onMounted(loadStatus)
</script>

<template>
  <main dir="rtl" class="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
    <header class="flex flex-wrap items-start justify-between gap-4"><div><p class="text-sm font-bold text-emerald-700">حمل‌ونقل جاده‌ای / اتصال بیتا</p><h1 class="mt-2 text-2xl font-black text-slate-900">مدیریت همگام‌سازی بارنامه‌ها</h1><p class="mt-2 max-w-2xl text-sm leading-7 text-slate-600">داده‌های بازه انتخابی از بیتا دریافت و در جداول محلی ثبت یا به‌روزرسانی می‌شوند. واکشی در بازه‌های هفت‌روزه انجام می‌شود.</p></div><button type="button" class="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50" :disabled="loadingStatus" @click="loadStatus"><RotateCw :size="16" :class="loadingStatus && 'animate-spin'" />تازه‌سازی وضعیت</button></header>
    <div v-if="error" role="alert" class="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{{ error }}</div><div v-if="message" role="status" class="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{{ message }}</div>
    <section class="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
      <form class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" @submit.prevent="startSync"><div class="mb-5 flex items-center gap-3"><span class="rounded-xl bg-emerald-50 p-2.5 text-emerald-700"><Database :size="21" /></span><div><h2 class="font-extrabold text-slate-900">بازه واکشی</h2><p class="mt-1 text-xs text-slate-500">تاریخ‌ها را به تقویم شمسی وارد کنید.</p></div></div>
        <div class="grid gap-4 sm:grid-cols-2"><label class="text-sm font-bold text-slate-700">از تاریخ<input v-model.trim="form.from" dir="ltr" inputmode="numeric" placeholder="1405/01/01" class="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20" /></label><label class="text-sm font-bold text-slate-700">تا تاریخ<input v-model.trim="form.to" dir="ltr" inputmode="numeric" placeholder="1405/09/01" class="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20" /></label></div>
        <div class="mt-4 flex gap-2 rounded-xl bg-blue-50 p-3 text-xs leading-6 text-blue-900"><AlertTriangle class="mt-1 shrink-0" :size="16" /><p>برای اجرای نخست، از ابتدای دوره‌ای که سوابق آن لازم دارید شروع کنید. پیش‌فرض ابتدای سال شمسی جاری است؛ برای سوابق سال‌های قبل، تاریخ شروع را عقب‌تر ببرید. پایان پیش‌فرض امروز ({{ today }}) است.</p></div><p v-if="!rangeValid" class="mt-3 text-xs text-rose-700">تاریخ‌ها باید در قالب YYYY/MM/DD باشند؛ شروع نباید بعد از پایان و پایان نباید بعد از امروز باشد.</p>
        <div class="mt-5 flex flex-wrap items-center gap-3"><button v-if="canSync" type="submit" :disabled="!rangeValid || isBusy" class="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"><RefreshCw :size="16" :class="isBusy && 'animate-spin'" />{{ isBusy ? 'در حال همگام‌سازی…' : 'شروع همگام‌سازی' }}</button><span v-else class="text-sm text-slate-500">مجوز اجرای همگام‌سازی را ندارید.</span></div>
      </form>
      <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div class="mb-5 flex items-center gap-3"><span class="rounded-xl bg-slate-100 p-2.5 text-slate-700"><Clock3 :size="21" /></span><div><h2 class="font-extrabold text-slate-900">آخرین اجرا</h2><p class="mt-1 text-xs text-slate-500">آخرین درخواست ثبت‌شده برای بیتا</p></div></div>
        <div v-if="loadingStatus" class="py-8 text-center text-sm text-slate-500">در حال دریافت وضعیت…</div><div v-else-if="!status" class="rounded-xl bg-slate-50 p-5 text-center text-sm leading-7 text-slate-600">هنوز سابقه‌ای ثبت نشده است. برای بار نخست بازه موردنیاز را انتخاب کنید.</div><dl v-else class="space-y-4 text-sm"><div class="flex items-center justify-between gap-3"><dt class="text-slate-500">وضعیت</dt><dd class="rounded-full px-3 py-1 text-xs font-bold" :class="statusTone">{{ statusLabel }}</dd></div><div class="flex items-center justify-between gap-3"><dt class="text-slate-500">شروع</dt><dd class="font-medium text-slate-800">{{ status.started_at ? formatRoadDateTime(status.started_at) : '—' }}</dd></div><div class="flex items-center justify-between gap-3"><dt class="text-slate-500">پایان</dt><dd class="font-medium text-slate-800">{{ status.finished_at ? formatRoadDateTime(status.finished_at) : 'در حال اجرا' }}</dd></div><div v-if="status.error" class="rounded-lg bg-rose-50 p-3 leading-6 text-rose-800"><dt class="mb-1 font-bold">شرح خطا</dt><dd class="whitespace-pre-wrap">{{ status.error }}</dd></div><div v-if="status.output" class="rounded-lg bg-slate-50 p-3"><dt class="mb-2 font-bold text-slate-600">گزارش اجرا</dt><dd class="max-h-48 overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-6 text-slate-700">{{ status.output }}</dd></div></dl>
      </section>
    </section><div class="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-xs leading-6 text-slate-600"><CheckCircle2 class="mt-1 shrink-0 text-emerald-600" :size="17" /><p>همگام‌سازی فقط بارنامه‌های ناوگان ثبت‌شده شرکت را نگه می‌دارد. اجرای دوباره یک بازه، اطلاعات همان بارنامه‌ها را به‌روزرسانی می‌کند.</p></div>
  </main>
</template>
