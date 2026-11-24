<template>
  <section class="mx-auto max-w-7xl space-y-6 pb-8" dir="rtl">
    <header class="relative isolate overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-7 text-white shadow-xl shadow-slate-900/10 sm:px-9 sm:py-9">
      <div class="pointer-events-none absolute -left-12 -top-24 -z-10 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
      <div class="pointer-events-none absolute -bottom-28 right-1/3 -z-10 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
      <div class="flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
        <div class="max-w-2xl">
          <div class="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-blue-100">
            <LayoutDashboard :size="15" /> داشبورد هزینه سفر رانندگان
          </div>
          <h1 class="text-2xl font-black tracking-tight sm:text-4xl">{{ greeting }}، {{ auth.displayName || 'مدیر سامانه' }}</h1>
          <p class="mt-3 max-w-xl text-sm leading-7 text-slate-300 sm:text-base">نمایی یکپارچه از سفرهای جاده‌ای و هزینه‌های ثبت‌شده؛ برای پیگیری عملیات روزانه از میانبرها استفاده کنید.</p>
          <p class="mt-5 flex items-center gap-2 text-sm text-slate-400"><CalendarDays :size="16" />{{ todayLabel }}</p>
        </div>
        <div class="flex flex-wrap gap-3">
          <RouterLink v-if="auth.can('road_expenses.read')" to="/road-transport/expenses" class="inline-flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-400">
            <Receipt :size="17" /> مدیریت هزینه سفر <ArrowLeft :size="16" />
          </RouterLink>
          <RouterLink v-if="auth.can('road_expenses.manage_categories')" to="/road-transport/routes" class="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10">
            <Network :size="17" /> تنظیم مسیرها
          </RouterLink>
        </div>
      </div>
    </header>

    <div v-if="auth.can('road_expenses.read')" class="space-y-6">
      <div v-if="error" role="alert" class="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <AlertCircle :size="18" class="shrink-0" />{{ error }}
        <button class="mr-auto rounded-lg p-1 text-amber-800 hover:bg-amber-100" aria-label="تلاش دوباره" @click="loadDashboard"><RefreshCw :size="16" /></button>
      </div>

      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article class="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div class="flex items-start justify-between"><span class="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-blue-700"><Truck :size="21" /></span><span class="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">حداکثر ۲۰۰ سفر اخیر</span></div>
          <p class="mt-5 text-sm font-medium text-slate-500">سفرهای بارگذاری‌شده</p><p class="mt-1 text-3xl font-black tabular-nums text-slate-900">{{ loading ? '…' : number(trips.length) }}</p>
        </article>
        <article class="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div class="flex items-start justify-between"><span class="grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Activity :size="21" /></span><span class="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">در حال انجام</span></div>
          <p class="mt-5 text-sm font-medium text-slate-500">سفرهای فعال</p><p class="mt-1 text-3xl font-black tabular-nums text-slate-900">{{ loading ? '…' : number(activeTrips.length) }}</p>
        </article>
        <article class="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div class="flex items-start justify-between"><span class="grid h-11 w-11 place-items-center rounded-xl bg-violet-50 text-violet-700"><Wallet :size="21" /></span><span class="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700">در سوابق اخیر</span></div>
          <p class="mt-5 text-sm font-medium text-slate-500">جمع هزینه سفرها</p><p class="mt-1 text-2xl font-black tabular-nums text-slate-900">{{ loading ? '…' : money(recentCost) }} <span class="text-xs font-semibold text-slate-500">ریال</span></p>
        </article>
        <article class="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div class="flex items-start justify-between"><span class="grid h-11 w-11 place-items-center rounded-xl bg-amber-50 text-amber-700"><Receipt :size="21" /></span><span class="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">فعال</span></div>
          <p class="mt-5 text-sm font-medium text-slate-500">دسته‌های هزینه</p><p class="mt-1 text-3xl font-black tabular-nums text-slate-900">{{ loading ? '…' : number(categories.length) }}</p>
        </article>
      </div>

      <div class="grid gap-6 xl:grid-cols-[1.5fr_0.8fr]">
        <section class="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
            <div><h2 class="font-extrabold text-slate-900">سفرهای اخیر</h2><p class="mt-1 text-xs text-slate-500">وضعیت و اطلاعات بارنامه‌های همگام‌شده</p></div>
            <button class="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-100" :disabled="loading" @click="loadDashboard"><RefreshCw :size="15" :class="loading && 'animate-spin'" />به‌روزرسانی</button>
          </div>
          <div v-if="loading && !trips.length" class="space-y-3 p-5"><div v-for="i in 4" :key="i" class="h-16 animate-pulse rounded-xl bg-slate-100" /></div>
          <div v-else-if="!recentTrips.length" class="px-5 py-14 text-center"><span class="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400"><Truck :size="22" /></span><p class="mt-3 font-bold text-slate-700">هنوز سفری ثبت نشده است</p><p class="mt-1 text-sm text-slate-500">پس از همگام‌سازی بارنامه‌ها، سفرهای اخیر اینجا نمایش داده می‌شوند.</p></div>
          <div v-else class="divide-y divide-slate-100">
            <RouterLink v-for="trip in recentTrips" :key="trip.id" :to="{ name: 'road-transport.expenses.detail', params: { tripId: trip.id } }" class="flex flex-col gap-3 px-5 py-4 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div class="min-w-0"><div class="flex flex-wrap items-center gap-2"><span class="font-bold text-slate-900">{{ trip.vehicle_plate || 'بدون پلاک' }}</span><span v-if="trip.vehicle_code" class="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700">کد {{ trip.vehicle_code }}</span><span class="text-xs text-slate-400">بارنامه {{ trip.bill_number }}</span></div><p class="mt-1 truncate text-xs text-slate-500">{{ trip.origin || 'مبدأ نامشخص' }} ← {{ trip.destination || 'مقصد نامشخص' }}<span v-if="trip.driver_name"> · {{ trip.driver_name }}</span></p></div>
              <div class="flex shrink-0 items-center justify-between gap-4 sm:justify-end"><span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold" :class="tripIsActive(trip) ? 'bg-emerald-50 text-emerald-700' : trip.status === 'finished' ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-700'"><span class="h-1.5 w-1.5 rounded-full" :class="tripIsActive(trip) ? 'bg-emerald-500' : trip.status === 'finished' ? 'bg-slate-400' : 'bg-amber-500'" />{{ tripStatus(trip) }}</span><span class="text-xs font-bold tabular-nums text-slate-600">{{ money(trip.expenses_sum_amount_rials) }} ریال</span><ArrowLeft :size="15" class="text-slate-400" /></div>
            </RouterLink>
          </div>
          <div v-if="recentTrips.length && auth.can('road_expenses.read')" class="border-t border-slate-100 p-4 text-center"><RouterLink to="/road-transport/expenses" class="text-sm font-bold text-blue-700 hover:text-blue-900">مشاهده همه سفرها <ArrowLeft :size="14" class="inline" /></RouterLink></div>
        </section>

        <section class="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
          <div class="mb-4"><h2 class="font-extrabold text-slate-900">دسترسی سریع</h2><p class="mt-1 text-xs text-slate-500">بخش‌های مدیریتی در دسترس شما</p></div>
          <div class="space-y-3">
            <RouterLink v-if="auth.can('road_expenses.read')" to="/road-transport/expenses" class="group flex items-center gap-3 rounded-xl border border-slate-200 p-3.5 transition hover:border-blue-200 hover:bg-blue-50/60"><span class="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-700 group-hover:bg-white"><Receipt :size="19" /></span><span class="min-w-0 flex-1"><strong class="block text-sm text-slate-800">مدیریت هزینه سفر</strong><small class="mt-1 block text-xs text-slate-500">سوابق سفر، هزینه‌ها و کیلومترشمار</small></span><ArrowLeft :size="16" class="text-slate-400" /></RouterLink>
            <RouterLink v-if="auth.can('road_expenses.manage_categories')" to="/road-transport/routes" class="group flex items-center gap-3 rounded-xl border border-slate-200 p-3.5 transition hover:border-indigo-200 hover:bg-indigo-50/60"><span class="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-700 group-hover:bg-white"><MapPin :size="19" /></span><span class="min-w-0 flex-1"><strong class="block text-sm text-slate-800">تنظیم مسیرهای جاده‌ای</strong><small class="mt-1 block text-xs text-slate-500">مدت مجاز سفر برای هر مسیر</small></span><ArrowLeft :size="16" class="text-slate-400" /></RouterLink>
            <RouterLink v-if="auth.can('road_expenses.manage_categories')" to="/road-transport/expense-categories" class="group flex items-center gap-3 rounded-xl border border-slate-200 p-3.5 transition hover:border-emerald-200 hover:bg-emerald-50/60"><span class="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700 group-hover:bg-white"><Wallet :size="19" /></span><span class="min-w-0 flex-1"><strong class="block text-sm text-slate-800">سقف هزینه‌ها</strong><small class="mt-1 block text-xs text-slate-500">مدیریت دسته‌بندی و سقف مجاز</small></span><ArrowLeft :size="16" class="text-slate-400" /></RouterLink>
            <RouterLink v-if="auth.can('users.read')" to="/users" class="group flex items-center gap-3 rounded-xl border border-slate-200 p-3.5 transition hover:border-violet-200 hover:bg-violet-50/60"><span class="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-700 group-hover:bg-white"><Users :size="19" /></span><span class="min-w-0 flex-1"><strong class="block text-sm text-slate-800">کاربران سامانه</strong><small class="mt-1 block text-xs text-slate-500">مدیریت کاربران و دسترسی‌ها</small></span><ArrowLeft :size="16" class="text-slate-400" /></RouterLink>
            <div v-if="!hasQuickLinks" class="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-500">برای نمایش میانبرها، دسترسی‌های مدیریتی لازم است.</div>
          </div>
          <div class="mt-5 flex items-start gap-3 rounded-xl bg-slate-50 p-3.5 text-xs leading-6 text-slate-600"><ShieldCheck :size="17" class="mt-0.5 shrink-0 text-slate-500" /><p>اطلاعات عملیاتی بر اساس سطح دسترسی حساب شما نمایش داده می‌شود.</p></div>
        </section>
      </div>
    </div>
    <section v-else class="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm"><ShieldCheck :size="28" class="mx-auto text-slate-400" /><h2 class="mt-3 font-bold text-slate-800">داشبورد مدیریتی</h2><p class="mt-2 text-sm text-slate-500">برای مشاهده آمار حمل‌ونقل، دسترسی مشاهده هزینه سفر لازم است.</p></section>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { Activity, AlertCircle, ArrowLeft, CalendarDays, LayoutDashboard, MapPin, Network, Receipt, RefreshCw, ShieldCheck, Truck, Users, Wallet } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { roadExpensesService } from '@/services/roadExpensesService'
import { formatRials } from '@/utils/roadTransportFormat'

const auth = useAuthStore()
const trips = ref([])
const categories = ref([])
const loading = ref(false)
const error = ref('')
const todayLabel = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { dateStyle: 'full' }).format(new Date())
const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 11) return 'صبح بخیر'
  if (hour < 17) return 'روز بخیر'
  return 'عصر بخیر'
})
const activeTrips = computed(() => trips.value.filter(tripIsActive))
const recentTrips = computed(() => trips.value.slice(0, 6))
const recentCost = computed(() => trips.value.reduce((sum, trip) => sum + Number(trip.expenses_sum_amount_rials || 0), 0))
const hasQuickLinks = computed(() => auth.canAny(['road_expenses.read', 'road_expenses.manage_categories', 'users.read']))

function number(value) {
  return new Intl.NumberFormat('fa-IR').format(Number(value || 0))
}
function money(value) {
  return formatRials(value)
}
function tripIsActive(trip) {
  return trip.status === 'started' && (!trip.ends_at || new Date(trip.ends_at) >= new Date())
}
function tripStatus(trip) {
  if (tripIsActive(trip)) return 'در جریان'
  if (trip.status === 'finished') return 'پایان‌یافته'
  if (trip.status === 'started') return 'مهلت تمام‌شده'
  return 'در انتظار شروع'
}
async function loadDashboard() {
  if (!auth.can('road_expenses.read')) return
  loading.value = true
  error.value = ''
  try {
    const [tripResponse, categoryResponse] = await Promise.all([
      roadExpensesService.trips(),
      roadExpensesService.categories(),
    ])
    trips.value = Array.isArray(tripResponse.data) ? tripResponse.data : tripResponse.data?.data || []
    categories.value = Array.isArray(categoryResponse.data) ? categoryResponse.data : categoryResponse.data?.data || []
  } catch (e) {
    error.value = e.response?.data?.message || 'دریافت اطلاعات داشبورد انجام نشد؛ دوباره تلاش کنید.'
  } finally {
    loading.value = false
  }
}
onMounted(loadDashboard)
</script>
