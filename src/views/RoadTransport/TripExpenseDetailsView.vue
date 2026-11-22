<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowRight, CalendarClock, CarFront, ChevronLeft, ChevronRight, Clock3, FileText, MapPin, Receipt, Truck, UserRound, Wallet } from 'lucide-vue-next'
import { roadExpensesService } from '@/services/roadExpensesService'
import { formatRoadDateTime, formatRials } from '@/utils/roadTransportFormat'

const route = useRoute()
const trip = ref(null)
const expenses = ref([])
const loading = ref(true)
const error = ref('')
const page = ref(1)
const lastPage = ref(1)
const expenseCount = ref(0)
const odometerPhotoUrl = ref('')

const tripTotal = computed(() => Number(trip.value?.expenses_sum_amount_rials || 0))

async function load() {
  loading.value = true
  error.value = ''
  trip.value = null
  expenses.value = []
  page.value = 1
  if (odometerPhotoUrl.value) URL.revokeObjectURL(odometerPhotoUrl.value)
  odometerPhotoUrl.value = ''
  try {
    const [tripsResponse, expenseResponse] = await Promise.all([
      roadExpensesService.trips(),
      roadExpensesService.list({ trip_id: route.params.tripId, per_page: 50, page: page.value }),
    ])
    const trips = tripsResponse.data.data ?? tripsResponse.data
    trip.value = trips.find((item) => String(item.id) === String(route.params.tripId)) || expenseResponse.data.data?.[0]?.trip || null
    expenses.value = expenseResponse.data.data ?? []
    expenseCount.value = expenseResponse.data.total ?? expenses.value.length
    lastPage.value = expenseResponse.data.last_page ?? 1
    if (!trip.value) error.value = 'اطلاعات این سفر پیدا نشد.'
  } catch (e) {
    error.value = e.response?.data?.message || 'دریافت جزئیات سفر انجام نشد.'
  } finally { loading.value = false }
}

async function changePage(nextPage) {
  if (nextPage < 1 || nextPage > lastPage.value || loading.value) return
  loading.value = true
  try {
    const { data } = await roadExpensesService.list({ trip_id: route.params.tripId, per_page: 50, page: nextPage })
    expenses.value = data.data ?? []
    expenseCount.value = data.total ?? expenseCount.value
    lastPage.value = data.last_page ?? lastPage.value
    page.value = data.current_page ?? nextPage
  } catch (e) { error.value = e.response?.data?.message || 'دریافت هزینه‌ها انجام نشد.' }
  finally { loading.value = false }
}

async function showOdometerPhoto() {
  if (!trip.value?.id || odometerPhotoUrl.value) return
  try {
    const { data } = await roadExpensesService.odometerPhoto(trip.value.id)
    odometerPhotoUrl.value = URL.createObjectURL(data)
  } catch (e) { error.value = e.response?.data?.message || 'عکس کیلومترشمار دریافت نشد.' }
}

onMounted(load)
watch(() => route.params.tripId, load)
</script>

<template>
  <main dir="rtl" class="mx-auto max-w-6xl space-y-6 p-4 text-slate-800 sm:p-6 lg:p-8">
    <RouterLink :to="{ name: 'road-transport.expenses' }" class="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-500 transition hover:bg-white hover:text-blue-700"><ArrowRight :size="17" />بازگشت به مدیریت هزینه سفر</RouterLink>

    <div v-if="error" class="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-800">{{ error }}</div>
    <div v-if="loading && !trip" class="h-56 animate-pulse rounded-[2rem] bg-slate-200" />

    <template v-if="trip">
      <header class="relative isolate overflow-hidden rounded-[2rem] bg-gradient-to-l from-slate-950 via-slate-900 to-blue-950 p-6 text-white shadow-xl shadow-slate-300/40 sm:p-8">
        <div class="absolute -left-12 -top-20 -z-10 h-56 w-56 rounded-full bg-blue-500/20 blur-3xl" />
        <div class="flex flex-wrap items-start justify-between gap-5"><div class="flex items-center gap-4"><span class="grid h-14 w-14 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/15"><CarFront :size="27" /></span><div><p class="text-sm text-blue-200">جزئیات سفر جاده‌ای</p><h1 class="mt-1 text-2xl font-black sm:text-3xl">{{ trip.vehicle_plate || 'بدون پلاک' }}</h1><div class="mt-2 flex flex-wrap items-center gap-2"><span v-if="trip.vehicle_code" class="rounded-full bg-blue-300/15 px-2.5 py-1 text-xs font-bold text-blue-100 ring-1 ring-blue-200/20">کد کشنده {{ trip.vehicle_code }}</span><span class="text-sm text-slate-300">بارنامه {{ trip.bill_number }}</span></div></div></div><span class="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold ring-1 ring-white/15">{{ trip.status === 'started' ? 'سفر شروع‌شده' : trip.status === 'finished' ? 'سفر پایان‌یافته' : 'در انتظار شروع' }}</span></div>
        <div class="mt-7 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-white/5 px-4 py-3 text-sm ring-1 ring-white/10"><span class="inline-flex items-center gap-2"><MapPin :size="16" class="text-blue-300" />{{ trip.origin || '—' }}</span><ArrowRight :size="15" class="text-slate-500" /><span>{{ trip.destination || '—' }}</span></div>
      </header>

      <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article class="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm"><p class="text-xs text-slate-400">پلاک و کد کشنده</p><p class="mt-2 flex items-center gap-2 font-bold"><Truck :size="17" class="text-blue-600" />{{ trip.vehicle_plate || 'ثبت نشده' }}</p><p v-if="trip.vehicle_code" class="mt-2 text-sm font-bold text-blue-700">کد {{ trip.vehicle_code }}</p></article>
        <article class="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm"><p class="text-xs text-slate-400">راننده</p><p class="mt-2 flex items-center gap-2 font-bold"><UserRound :size="17" class="text-violet-600" />{{ trip.driver_name || '—' }}</p><p class="mt-1 text-xs text-slate-500" dir="ltr">{{ trip.driver_mobile || '' }}</p></article>
        <article class="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm"><p class="text-xs text-slate-400">زمان شروع</p><p class="mt-2 flex items-center gap-2 text-sm font-bold"><CalendarClock :size="17" class="text-amber-600" />{{ formatRoadDateTime(trip.started_at) }}</p><p class="mt-1 text-xs text-slate-500">مهلت پایان: {{ formatRoadDateTime(trip.ends_at) }}</p></article>
        <article class="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 shadow-sm"><p class="text-xs text-emerald-700">جمع کل هزینه‌ها</p><p class="mt-2 flex items-center gap-2 text-lg font-black text-emerald-900"><Wallet :size="18" />{{ formatRials(tripTotal) }} <small class="text-xs font-medium">ریال</small></p><p class="mt-1 text-xs text-emerald-700">{{ formatRials(expenseCount) }} مورد ثبت‌شده</p></article>
      </section>

      <section class="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <article class="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5 sm:px-6"><div class="flex items-center gap-3"><span class="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-700"><Receipt :size="20" /></span><div><h2 class="font-bold">ریز هزینه‌های بارنامه</h2><p class="mt-1 text-xs text-slate-500">تاریخ‌ها به تقویم شمسی نمایش داده می‌شوند.</p></div></div><span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{{ formatRials(expenseCount) }} هزینه</span></div>
          <div v-if="loading" class="space-y-3 p-5"><div v-for="n in 4" :key="n" class="h-20 animate-pulse rounded-2xl bg-slate-100" /></div>
          <div v-else-if="expenses.length" class="divide-y divide-slate-100">
            <article v-for="item in expenses" :key="item.id" class="flex gap-3 p-5 sm:px-6"><span class="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><Receipt :size="20" /></span><div class="min-w-0 flex-1"><div class="flex flex-wrap items-start justify-between gap-2"><div><h3 class="font-bold">{{ item.category?.name || 'هزینه سفر' }}</h3><p class="mt-1 inline-flex items-center gap-1.5 text-xs text-slate-400"><Clock3 :size="13" />{{ formatRoadDateTime(item.spent_at) }}</p></div><p class="text-left font-black text-slate-900">{{ formatRials(item.amount_rials) }} <small class="text-xs font-medium text-slate-500">ریال</small></p></div><p v-if="item.description" class="mt-3 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">{{ item.description }}</p></div></article>
          </div>
          <div v-else class="px-5 py-12 text-center"><span class="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400"><FileText :size="22" /></span><p class="mt-3 font-semibold">برای این سفر هزینه‌ای ثبت نشده است.</p></div>
          <div v-if="lastPage > 1" class="flex items-center justify-between border-t border-slate-100 p-4"><button :disabled="page <= 1 || loading" class="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:opacity-40" @click="changePage(page - 1)"><ChevronRight :size="16" />قبلی</button><span class="text-xs text-slate-500">صفحه {{ formatRials(page) }} از {{ formatRials(lastPage) }}</span><button :disabled="page >= lastPage || loading" class="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:opacity-40" @click="changePage(page + 1)">بعدی<ChevronLeft :size="16" /></button></div>
        </article>

        <aside class="space-y-4">
          <article class="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm"><div class="flex items-center gap-3"><span class="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-700"><CalendarClock :size="19" /></span><h2 class="font-bold">زمان‌بندی سفر</h2></div><dl class="mt-5 space-y-4 text-sm"><div><dt class="text-xs text-slate-400">صدور بارنامه</dt><dd class="mt-1 font-semibold">{{ formatRoadDateTime(trip.bill_issued_at) }}</dd></div><div><dt class="text-xs text-slate-400">شروع سفر</dt><dd class="mt-1 font-semibold">{{ formatRoadDateTime(trip.started_at) }}</dd></div><div><dt class="text-xs text-slate-400">پایان مهلت ثبت</dt><dd class="mt-1 font-semibold">{{ formatRoadDateTime(trip.ends_at) }}</dd></div><div v-if="trip.finished_at"><dt class="text-xs text-slate-400">پایان سفر</dt><dd class="mt-1 font-semibold">{{ formatRoadDateTime(trip.finished_at) }}</dd></div></dl></article>
          <article v-if="trip.odometer_photo_path" class="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm"><div class="flex items-center gap-3"><span class="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-700"><CarFront :size="19" /></span><div><h2 class="font-bold">کیلومتر شروع</h2><p class="mt-1 text-xs text-slate-500">عکس ارسالی راننده</p></div></div><button v-if="!odometerPhotoUrl" class="mt-4 w-full rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold transition hover:bg-slate-200" @click="showOdometerPhoto">نمایش عکس</button><img v-else :src="odometerPhotoUrl" alt="عکس کیلومترشمار ابتدای سفر" class="mt-4 max-h-72 w-full rounded-2xl bg-slate-50 object-contain" /></article>
          <article class="rounded-3xl border border-blue-100 bg-blue-50/70 p-5"><div class="flex items-center gap-3 text-blue-800"><MapPin :size="19" /><h2 class="font-bold">مسیر ثبت‌شده</h2></div><p class="mt-3 text-sm leading-7 text-blue-900">{{ trip.origin || 'مبدا نامشخص' }} <ArrowRight :size="14" class="inline" /> {{ trip.destination || 'مقصد نامشخص' }}</p><p class="mt-2 text-xs text-blue-700">هزینه‌های این صفحه فقط مربوط به همین بارنامه و پلاک است.</p></article>
        </aside>
      </section>
    </template>
  </main>
</template>
