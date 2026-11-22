<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  AlertCircle, ArrowDown, ArrowLeft, ArrowUp, ArrowUpDown, CalendarDays, ChevronLeft, ChevronRight,
  Eye, FileText, LayoutDashboard, PenLine, RefreshCw, Search, TrendingUp, Truck, Wallet, X,
} from 'lucide-vue-next'
import { roadExpensesService } from '@/services/roadExpensesService'
import { useAuthStore } from '@/stores/auth'
import { formatRoadDateTime, formatRials } from '@/utils/roadTransportFormat'

const vehicles = ref([])
const auth = useAuthStore()
const route = useRoute()
const section = computed(() => route.path.endsWith('/income') ? 'income' : route.path.endsWith('/costs') ? 'costs' : route.path.endsWith('/entry') ? 'entry' : route.path.endsWith('/indirect-costs') ? 'indirect' : 'dashboard')
const manualForm = ref({ company_name: '', from_at: '', to_at: '', working_hours: '', revenue_rials: '' })
const savingManual = ref(false)
const manualMessage = ref('')
const manualFailed = ref(false)
const report = ref(null)
const bitaSyncStatus = ref(null)
const loadingBitaSync = ref(false)
const bitaSyncError = ref('')
const selectedDetailVehicle = ref(null)
const detailReport = ref(null)
const loadingVehicleDetail = ref(false)
const detailError = ref('')
const indirectExpenses = ref([])
const indirectLoading = ref(false)
const indirectSaving = ref(false)
const indirectMessage = ref('')
const indirectFailed = ref(false)
const indirectForm = ref({ title: '', factor: 1.6, notes: '' })
const editingIndirectId = ref(null)
const fleetSort = ref({ key: 'vehicle_code', direction: 'asc' })
const fleetQuery = ref('')
const nowJalali = new Intl.DateTimeFormat('en-US-u-ca-persian', { year: 'numeric', month: 'numeric' }).formatToParts(new Date())
const currentYear = Number(nowJalali.find((part) => part.type === 'year')?.value || 1405)
const currentMonth = Number(nowJalali.find((part) => part.type === 'month')?.value || 1)
const form = ref({ vehicle_code: '', year: currentYear, month: currentMonth })
const loadingVehicles = ref(false)
const loadingReport = ref(false)
const error = ref('')
const months = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند']
const years = computed(() => Array.from({ length: 8 }, (_, index) => currentYear - 5 + index))

// ---- ظاهر: کلاس‌های مشترک ----
const ui = {
  card: 'overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm',
  cardHead: 'flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6',
  table: 'w-full text-right text-sm text-slate-700',
  th: 'whitespace-nowrap border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500',
  td: 'px-4 py-3.5',
  num: 'text-left tabular-nums',
  field: 'mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20',
  ghostBtn: 'inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:opacity-50',
}

// ---- قالب‌بندی ----
const faNumber = (value) => Number(value || 0).toLocaleString('fa-IR')
const faYear = (value) => Number(value).toLocaleString('fa-IR', { useGrouping: false })
const money = (value) => (value == null ? '—' : formatRials(value))
const periodLabel = computed(() => `${months[Number(form.value.month) - 1]} ${faYear(form.value.year)}`)
const pageTitle = computed(() => ({ income: 'درآمد کامیون‌ها', costs: 'هزینه‌های کامیون‌ها', entry: 'ورود اطلاعات درآمد', indirect: 'مدیریت ضرایب هزینه' }[section.value] || 'داشبورد درآمد و هزینه'))

const tabs = computed(() => [
  { key: 'dashboard', label: 'داشبورد', to: '/road-transport/bill-financials', icon: LayoutDashboard },
  { key: 'income', label: 'درآمدها', to: '/road-transport/bill-financials/income', icon: TrendingUp },
  { key: 'costs', label: 'هزینه‌ها', to: '/road-transport/bill-financials/costs', icon: Wallet },
  ...(auth.can('road_manual_income.create') ? [{ key: 'entry', label: 'ورود اطلاعات', to: '/road-transport/bill-financials/entry', icon: PenLine }] : []),
  ...(auth.can('road_indirect_cost.manage') ? [{ key: 'indirect', label: 'ضرایب هزینه', to: '/road-transport/bill-financials/indirect-costs', icon: Wallet }] : []),
])

const selectedVehicle = computed(() => vehicles.value.find((vehicle) => Number(vehicle.vehicle_code) === Number(form.value.vehicle_code)))
const fleetNetRials = computed(() => {
  const totals = report.value?.totals
  if (totals?.revenue_rials == null || totals?.expense_rials == null) return null
  return Number(totals.revenue_rials) - Number(totals.expense_rials)
})
const netRials = computed(() => {
  if (section.value === 'dashboard') return fleetNetRials.value
  const net = report.value?.totals?.net_rials
  return net != null ? Number(net) : fleetNetRials.value
})
const equipmentStatusMessage = computed(() => {
  const status = report.value?.equipment_status
  if (status === 'source_unavailable') return 'اتصال به دیتابیس مالی برقرار نشد؛ هزینه‌های تجهیز همگام نشد.'
  if (status === 'equipment_type_not_found') return 'نوع تجهیز «کامیون» در دیتابیس مالی پیدا نشد.'
  if (status === 'equipment_not_found') return `برای پلاک ${selectedVehicle.value?.plate} در نوع تجهیز کامیون موردی پیدا نشد.`
  return 'برای این پلاک بیش از یک تجهیز در دیتابیس مالی پیدا شد و نگاشت کد تجهیز نیاز به بررسی دارد.'
})
const manualRevenuePreview = computed(() => {
  const value = Number(manualForm.value.revenue_rials)
  return value > 0 ? formatRials(value) : ''
})

// ---- جدول ناوگان ----
const fleetColumns = [
  { key: 'vehicle_code', label: 'کد کامیون', type: 'number' },
  { key: 'plate', label: 'پلاک', type: 'text' },
  { key: 'driver', label: 'راننده', type: 'text' },
  { key: 'revenue_rials', label: 'درآمد کل', type: 'number' },
  { key: 'salary_rials', label: 'هزینه کامل حقوق', type: 'number' },
  { key: 'equipment_costs_rials', label: 'هزینه تجهیز', type: 'number' },
  { key: 'expense_rials', label: 'کل هزینه', type: 'number' },
  { key: 'net_rials', label: 'مانده', type: 'number' },
  { key: 'bill_count', label: 'بارنامه', type: 'number' },
]
const sortedFleetVehicles = computed(() => {
  const { key, direction } = fleetSort.value
  const column = fleetColumns.find((item) => item.key === key)
  const multiplier = direction === 'asc' ? 1 : -1
  return [...(report.value?.vehicles || [])].sort((left, right) => {
    const leftValue = left[key] ?? (key === 'driver' ? '' : null)
    const rightValue = right[key] ?? (key === 'driver' ? '' : null)
    if (leftValue == null || rightValue == null) {
      if (leftValue == null && rightValue == null) return 0
      return leftValue == null ? 1 : -1
    }
    const comparison = column?.type === 'number'
        ? Number(leftValue) - Number(rightValue)
        : String(leftValue).localeCompare(String(rightValue), 'fa', { numeric: true, sensitivity: 'base' })
    return comparison * multiplier
  })
})

// ارقام فارسی/عربی و «ي»/«ك» را یکسان می‌کند تا جستجو با هر کیبورد کار کند
const normalizeText = (value) => String(value ?? '')
    .replace(/[۰-۹]/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(digit))
    .replace(/[٠-٩]/g, (digit) => '٠١٢٣٤٥٦٧٨٩'.indexOf(digit))
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .toLowerCase()
const visibleFleetVehicles = computed(() => {
  const query = normalizeText(fleetQuery.value).trim()
  if (!query) return sortedFleetVehicles.value
  return sortedFleetVehicles.value.filter((vehicle) => normalizeText(`${vehicle.vehicle_code} ${vehicle.plate} ${vehicle.driver ?? ''} ${vehicle.personnel_code ?? ''}`).includes(query))
})

function toggleFleetSort(key) {
  if (fleetSort.value.key === key) {
    fleetSort.value = { key, direction: fleetSort.value.direction === 'asc' ? 'desc' : 'asc' }
  } else {
    fleetSort.value = { key, direction: 'asc' }
  }
}
function sortIcon(key) {
  if (fleetSort.value.key !== key) return ArrowUpDown
  return fleetSort.value.direction === 'asc' ? ArrowUp : ArrowDown
}

// ---- دوره زمانی ----
const canGoPrev = computed(() => !(Number(form.value.year) <= years.value[0] && Number(form.value.month) <= 1))
const canGoNext = computed(() => !(Number(form.value.year) >= years.value[years.value.length - 1] && Number(form.value.month) >= 12))
function shiftMonth(delta) {
  let month = Number(form.value.month) + delta
  let year = Number(form.value.year)
  if (month < 1) { month = 12; year -= 1 }
  if (month > 12) { month = 1; year += 1 }
  if (year < years.value[0] || year > years.value[years.value.length - 1]) return
  form.value = { ...form.value, year, month }
  selectAndLoad()
}

// ---- دریافت داده ----
async function loadVehicles() {
  loadingVehicles.value = true
  error.value = ''
  try {
    const { data } = await roadExpensesService.billFinancialVehicles()
    vehicles.value = Array.isArray(data) ? data : data.data || []
    if (!form.value.vehicle_code && vehicles.value.length) form.value.vehicle_code = vehicles.value[0].vehicle_code
    await loadReport()
    if (section.value === 'indirect') await loadIndirectData()
  } catch (e) {
    error.value = e.response?.data?.message || 'دریافت فهرست کشنده‌ها انجام نشد.'
  } finally {
    loadingVehicles.value = false
  }
}

async function loadReport() {
  if (section.value === 'indirect') return
  if (section.value !== 'dashboard' && !form.value.vehicle_code) return
  loadingReport.value = true
  error.value = ''
  try {
    const params = {
      year: Number(form.value.year),
      month: Number(form.value.month),
    }
    if (section.value !== 'dashboard') params.vehicle_code = Number(form.value.vehicle_code)
    const { data } = await roadExpensesService.monthlyBillFinancials(params)
    report.value = data.data || data
  } catch (e) {
    report.value = null
    error.value = e.response?.data?.message || 'دریافت گزارش درآمد بارنامه‌ها انجام نشد.'
  } finally {
    loadingReport.value = false
  }
}

async function loadBitaSyncStatus() {
  try {
    const response = await roadExpensesService.latestBitaSync()
    bitaSyncStatus.value = response.data.data || null
    bitaSyncError.value = ''
  } catch (e) {
    bitaSyncError.value = e.response?.data?.message || 'وضعیت آخرین واکشی دریافت نشد.'
  }
}

async function syncBillsFromBita() {
  if (loadingBitaSync.value) return
  loadingBitaSync.value = true
  bitaSyncError.value = ''
  try {
    const response = await roadExpensesService.syncBitaBills()
    bitaSyncStatus.value = response.data.data || null
    if (bitaSyncStatus.value?.status === 'success') await loadReport()
  } catch (e) {
    bitaSyncError.value = e.response?.data?.message || 'درخواست واکشی بارنامه‌ها انجام نشد.'
    await loadBitaSyncStatus()
  } finally {
    loadingBitaSync.value = false
  }
}

function selectAndLoad() {
  report.value = null
  if (section.value === 'indirect') loadIndirectData()
  else loadReport()
}

async function loadIndirectData() {
  if (!auth.can('road_indirect_cost.manage')) return
  indirectLoading.value = true
  indirectFailed.value = false
  try {
    const response = await roadExpensesService.indirectExpenses()
    indirectExpenses.value = response.data.data || []
  } catch (e) {
    indirectFailed.value = true
    indirectMessage.value = e.response?.data?.message || 'دریافت ضرایب هزینه انجام نشد.'
  } finally {
    indirectLoading.value = false
  }
}

async function saveIndirectExpense() {
  indirectSaving.value = true
  indirectFailed.value = false
  indirectMessage.value = ''
  try {
    const payload = { ...indirectForm.value, factor: Number(indirectForm.value.factor) }
    if (editingIndirectId.value) {
      await roadExpensesService.updateIndirectExpense(editingIndirectId.value, payload)
      indirectMessage.value = 'ضریب هزینه ویرایش شد و در گزارش همهٔ ماه‌ها اعمال می‌شود.'
    } else {
      await roadExpensesService.createIndirectExpense(payload)
      indirectMessage.value = 'ضریب هزینه ثبت شد و در گزارش همهٔ ماه‌ها اعمال می‌شود.'
    }
    editingIndirectId.value = null
    indirectForm.value = { title: '', factor: 1.6, notes: '' }
    await loadIndirectData()
  } catch (e) {
    indirectFailed.value = true
    indirectMessage.value = Object.values(e.response?.data?.errors || {})[0]?.[0] || e.response?.data?.message || 'ثبت ضریب هزینه انجام نشد.'
  } finally {
    indirectSaving.value = false
  }
}

function editIndirectExpense(expense) {
  editingIndirectId.value = expense.id
  indirectForm.value = { title: expense.title, factor: Number(expense.factor), notes: expense.notes || '' }
  indirectMessage.value = ''
}

function cancelIndirectEdit() {
  editingIndirectId.value = null
  indirectForm.value = { title: '', factor: 1.6, notes: '' }
}

async function removeIndirectExpense(expense) {
  if (!window.confirm(`ضریب «${expense.title}» حذف شود؟ گزارش همهٔ ماه‌ها دوباره محاسبه می‌شود.`)) return
  try {
    await roadExpensesService.deleteIndirectExpense(expense.id)
    editingIndirectId.value = null
    indirectMessage.value = 'ضریب هزینه حذف شد.'
    indirectFailed.value = false
    await loadIndirectData()
  } catch (e) {
    indirectFailed.value = true
    indirectMessage.value = e.response?.data?.message || 'حذف ضریب هزینه انجام نشد.'
  }
}

async function openVehicleDetails(vehicle) {
  selectedDetailVehicle.value = vehicle
  detailReport.value = null
  detailError.value = ''
  loadingVehicleDetail.value = true
  try {
    const { data } = await roadExpensesService.monthlyBillFinancials({
      vehicle_code: Number(vehicle.vehicle_code),
      year: Number(form.value.year),
      month: Number(form.value.month),
    })
    detailReport.value = data.data || data
  } catch (e) {
    detailError.value = e.response?.data?.message || 'دریافت جزئیات کامیون انجام نشد.'
  } finally {
    loadingVehicleDetail.value = false
  }
}

function closeVehicleDetails() {
  selectedDetailVehicle.value = null
  detailReport.value = null
  detailError.value = ''
}

function onKeydown(event) {
  if (event.key === 'Escape' && selectedDetailVehicle.value) closeVehicleDetails()
}

watch(section, () => {
  report.value = null
  if (section.value === 'indirect') loadIndirectData()
  else if (vehicles.value.length) loadReport()
})

async function saveManualIncome() {
  if (!form.value.vehicle_code) return
  savingManual.value = true
  manualMessage.value = ''
  manualFailed.value = false
  try {
    await roadExpensesService.createManualBillIncome({ ...manualForm.value, vehicle_code: Number(form.value.vehicle_code), working_hours: Number(manualForm.value.working_hours), revenue_rials: Number(manualForm.value.revenue_rials) })
    manualForm.value = { company_name: '', from_at: '', to_at: '', working_hours: '', revenue_rials: '' }
    manualMessage.value = 'درآمد دستی ثبت شد.'
    await loadReport()
  } catch (e) {
    manualFailed.value = true
    manualMessage.value = e.response?.data?.message || 'ثبت درآمد دستی انجام نشد.'
  } finally {
    savingManual.value = false
  }
}

onMounted(() => {
  if (section.value === 'indirect') loadIndirectData()
  else {
    loadVehicles()
    if (auth.can('road_expenses.read')) loadBitaSyncStatus()
  }
  window.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <main class="mx-auto max-w-7xl space-y-5 pb-10" dir="rtl">
    <!-- سربرگ: عنوان، انتخاب کشنده و دوره، تب‌ها -->
    <header :class="ui.card">
      <div class="flex flex-col gap-5 px-5 py-5 sm:px-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 class="text-xl font-extrabold text-slate-900 sm:text-2xl">{{ pageTitle }}</h1>
          <p class="mt-1.5 text-sm text-slate-500">گزارش مالی کامیون‌های پیلسان بر اساس کامیون و ماه</p>
        </div>

        <div class="flex flex-wrap items-end gap-3">
          <label v-if="section !== 'dashboard' && section !== 'indirect'" class="block text-xs font-semibold text-slate-600">
            کشنده
            <select v-model="form.vehicle_code" class="mt-1.5 block min-w-44 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20" @change="selectAndLoad">
              <option value="" disabled>انتخاب کشنده</option>
              <option v-for="vehicle in vehicles" :key="vehicle.vehicle_code" :value="vehicle.vehicle_code">{{ vehicle.vehicle_code }} · {{ vehicle.plate }}</option>
            </select>
          </label>

          <div v-if="section !== 'indirect'">
            <span id="period-label" class="block text-xs font-semibold text-slate-600">دوره</span>
            <div class="mt-1.5 flex items-center gap-1 rounded-xl border border-slate-300 bg-slate-50 p-1" role="group" aria-labelledby="period-label">
              <button type="button" class="grid h-9 w-9 place-items-center rounded-lg text-slate-600 transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:opacity-30" aria-label="ماه قبل" :disabled="!canGoPrev || loadingReport" @click="shiftMonth(-1)"><ChevronRight :size="18" /></button>
              <select v-model.number="form.month" aria-label="ماه" class="rounded-lg bg-transparent px-2 py-2 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-600/30" @change="selectAndLoad">
                <option v-for="(month, index) in months" :key="month" :value="index + 1">{{ month }}</option>
              </select>
              <select v-model.number="form.year" aria-label="سال شمسی" class="rounded-lg bg-transparent px-2 py-2 text-sm font-bold text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-emerald-600/30" @change="selectAndLoad">
                <option v-for="year in years" :key="year" :value="year">{{ faYear(year) }}</option>
              </select>
              <button type="button" class="grid h-9 w-9 place-items-center rounded-lg text-slate-600 transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:opacity-30" aria-label="ماه بعد" :disabled="!canGoNext || loadingReport" @click="shiftMonth(1)"><ChevronLeft :size="18" /></button>
            </div>
          </div>
        </div>
      </div>

      <nav class="flex gap-1 overflow-x-auto border-t border-slate-100 px-3" aria-label="بخش‌های درآمد و هزینه بارنامه">
        <RouterLink
            v-for="tab in tabs"
            :key="tab.key"
            :to="tab.to"
            :aria-current="section === tab.key ? 'page' : undefined"
            class="inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-bold transition focus:outline-none focus-visible:bg-slate-50"
            :class="section === tab.key ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'"
        >
          <component :is="tab.icon" :size="16" />{{ tab.label }}
        </RouterLink>
      </nav>
    </header>

    <div v-if="error" role="alert" class="flex flex-wrap items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      <AlertCircle :size="18" class="shrink-0" />
      <span class="min-w-0 flex-1">{{ error }}</span>
      <button type="button" class="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-bold hover:bg-red-100" @click="vehicles.length ? loadReport() : loadVehicles()"><RefreshCw :size="14" />تلاش دوباره</button>
    </div>

    <div v-if="loadingVehicles" class="h-40 animate-pulse rounded-2xl bg-slate-200" />

    <template v-else-if="section === 'dashboard' || section === 'indirect' || selectedVehicle">
      <!-- خلاصه مالی: درآمد − هزینه = خالص -->
      <section v-if="section !== 'entry' && section !== 'indirect'" :class="ui.card" aria-label="خلاصه مالی ماه">
        <div class="grid divide-y divide-slate-100 md:grid-cols-[1fr_auto_1fr_auto_1.1fr] md:divide-y-0">
          <div class="p-5 sm:p-6">
            <p class="flex items-center gap-2 text-sm font-semibold text-emerald-800"><span class="h-2.5 w-2.5 rounded-full bg-emerald-600" />درآمد ماه</p>
            <span v-if="loadingReport" class="mt-3 block h-9 w-44 animate-pulse rounded-lg bg-slate-100" />
            <p v-else class="mt-3 text-2xl font-black tabular-nums text-slate-900 sm:text-3xl">{{ formatRials(report?.totals?.revenue_rials) }} <small class="text-xs font-semibold text-slate-500">ریال</small></p>
            <p class="mt-1.5 text-xs text-slate-500">از کرایه بارنامه‌ها</p>
          </div>

          <div class="hidden items-center px-1 text-3xl font-light text-slate-300 md:flex" aria-hidden="true">−</div>

          <div class="p-5 sm:p-6">
            <p class="flex items-center gap-2 text-sm font-semibold text-amber-800"><span class="h-2.5 w-2.5 rounded-full bg-amber-500" />هزینه‌های ماه</p>
            <span v-if="loadingReport" class="mt-3 block h-9 w-44 animate-pulse rounded-lg bg-slate-100" />
            <p v-else class="mt-3 text-2xl font-black tabular-nums text-slate-900 sm:text-3xl">{{ money(report?.totals?.expense_rials) }} <small class="text-xs font-semibold text-slate-500">ریال</small></p>
            <p class="mt-1.5 text-xs text-slate-500">حقوق و هزینه‌های محاسبه‌شده با ضرایب + هزینه‌های تجهیز</p>
          </div>

          <div class="hidden items-center px-1 text-3xl font-light text-slate-300 md:flex" aria-hidden="true">=</div>

          <div class="bg-slate-900 p-5 text-white sm:p-6">
            <p class="text-sm font-semibold text-slate-300">{{ section === 'dashboard' ? 'خالص ناوگان در این ماه' : 'خالص این کشنده در این ماه' }}</p>
            <span v-if="loadingReport" class="mt-3 block h-9 w-44 animate-pulse rounded-lg bg-white/10" />
            <p v-else dir="ltr" class="mt-3 text-right text-2xl font-black tabular-nums sm:text-3xl" :class="netRials != null && netRials < 0 ? 'text-rose-300' : 'text-white'">{{ netRials == null ? '—' : formatRials(netRials) }} <small class="text-xs font-semibold text-slate-400">ریال</small></p>
            <p class="mt-1.5 text-xs text-slate-400">{{ netRials == null && !loadingReport ? 'پس از دریافت هزینه‌ها محاسبه می‌شود' : 'درآمد منهای هزینه' }}</p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-x-6 gap-y-1.5 border-t border-slate-100 bg-slate-50 px-5 py-3 text-xs text-slate-600 sm:px-6">
          <span class="inline-flex items-center gap-1.5 font-semibold text-slate-700"><FileText :size="14" />{{ loadingReport ? '…' : faNumber(report?.totals?.bill_count) }} بارنامه صادرشده در {{ periodLabel }}</span>
          <span v-if="section === 'dashboard' && report?.totals?.expense_complete === false" class="inline-flex items-center gap-1.5 text-amber-800"><AlertCircle :size="14" />خالص با هزینه‌های دریافت‌شده محاسبه شده؛ هزینهٔ بعضی کامیون‌ها ناقص است.</span>
        </div>
      </section>

      <!-- داشبورد: جدول ناوگان -->
      <section v-if="section === 'dashboard'" :class="ui.card" aria-label="واکشی بارنامه از بیتا">
        <div :class="ui.cardHead">
          <div>
            <h2 class="text-base font-extrabold text-slate-900">واکشی بارنامه‌ها از بیتا</h2>
            <p class="mt-1 text-xs text-slate-500">بارنامه‌های ناوگان پیلسان از ابتدای ماه جاری تا امروز دریافت و در سامانه به‌روزرسانی می‌شوند.</p>
          </div>
          <button v-if="auth.can('road_bills.sync')" type="button" :disabled="loadingBitaSync || bitaSyncStatus?.status === 'running'" class="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-800 disabled:opacity-50" @click="syncBillsFromBita">
            <RefreshCw :size="16" :class="(loadingBitaSync || bitaSyncStatus?.status === 'running') && 'animate-spin'" />
            {{ loadingBitaSync || bitaSyncStatus?.status === 'running' ? 'در حال واکشی…' : 'واکشی از بیتا' }}
          </button>
        </div>
        <div class="space-y-3 p-5 sm:px-6">
          <div v-if="bitaSyncStatus" class="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <span class="rounded-full px-3 py-1 text-xs font-bold" :class="bitaSyncStatus.status === 'success' ? 'bg-emerald-100 text-emerald-800' : bitaSyncStatus.status === 'running' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'">
              {{ bitaSyncStatus.status === 'success' ? 'آخرین واکشی موفق' : bitaSyncStatus.status === 'running' ? 'واکشی در حال اجرا' : 'آخرین واکشی ناموفق' }}
            </span>
            <span class="text-slate-600">شروع: {{ formatRoadDateTime(bitaSyncStatus.started_at) }}</span>
            <span v-if="bitaSyncStatus.finished_at" class="text-slate-600">پایان: {{ formatRoadDateTime(bitaSyncStatus.finished_at) }}</span>
          </div>
          <p v-else-if="!bitaSyncError" class="text-sm text-slate-500">هنوز واکشی‌ای از این صفحه انجام نشده است.</p>
          <pre v-if="bitaSyncStatus?.output" class="max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs leading-6 text-slate-700" dir="auto">{{ bitaSyncStatus.output }}</pre>
          <p v-if="bitaSyncStatus?.error" class="rounded-lg bg-red-50 px-3 py-2 text-sm leading-6 text-red-800" dir="auto">{{ bitaSyncStatus.error }}</p>
          <p v-if="bitaSyncError" role="alert" class="text-sm text-red-700">{{ bitaSyncError }}</p>
        </div>
      </section>

      <section v-if="section === 'dashboard'" :class="ui.card">
        <div :class="ui.cardHead">
          <div>
            <h2 class="text-base font-extrabold text-slate-900">عملکرد همهٔ کامیون‌های کشنده جاده‌ای</h2>
            <p class="mt-1 text-xs text-slate-500">{{ faNumber(report?.vehicle_count) }} کامیون · {{ periodLabel }} · مبالغ به ریال</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <label class="relative block">
              <span class="sr-only">جستجوی کامیون</span>
              <Search :size="15" class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input v-model="fleetQuery" type="search" placeholder="جستجوی کد، پلاک یا راننده" class="w-60 rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-9 text-sm text-slate-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20" />
            </label>
            <button type="button" :class="ui.ghostBtn" :disabled="loadingReport" @click="loadReport"><RefreshCw :size="15" :class="loadingReport && 'animate-spin'" />به‌روزرسانی</button>
          </div>
        </div>

        <div v-if="loadingReport" class="space-y-3 p-5"><div v-for="i in 5" :key="i" class="h-12 animate-pulse rounded-xl bg-slate-100" /></div>
        <template v-else-if="report?.vehicles?.length">
          <p v-if="report?.totals?.incomplete_cost_vehicles" class="flex items-start gap-2 border-b border-amber-100 bg-amber-50 px-5 py-3 text-xs leading-6 text-amber-900"><AlertCircle :size="15" class="mt-1 shrink-0" />هزینهٔ نهایی {{ faNumber(report.totals.incomplete_cost_vehicles) }} کامیون کامل نیست و تا دریافت حقوق و هزینهٔ تجهیز، ماندهٔ ناوگان محاسبه نمی‌شود.</p>
          <div class="overflow-x-auto">
            <table :class="[ui.table, 'min-w-[1200px]']">
              <thead>
              <tr class="text-xs font-bold">
                <th colspan="4" class="bg-white" />
                <th colspan="4" class="border-b-2 border-amber-500 bg-white px-4 pb-1.5 pt-3 text-center text-amber-800">هزینه‌ها</th>
                <th colspan="3" class="bg-white" />
              </tr>
              <tr>
                <th
                    v-for="column in fleetColumns"
                    :key="column.key"
                    scope="col"
                    :aria-sort="fleetSort.key === column.key ? (fleetSort.direction === 'asc' ? 'ascending' : 'descending') : 'none'"
                    :class="[ui.th, column.type === 'number' && 'text-left', column.key === 'vehicle_code' && 'sticky right-0 z-10']"
                >
                  <button type="button" class="inline-flex items-center gap-1 rounded font-semibold transition hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600" :class="fleetSort.key === column.key && 'text-slate-900'" :aria-label="`مرتب‌سازی بر اساس ${column.label}`" @click="toggleFleetSort(column.key)">
                    {{ column.label }}<component :is="sortIcon(column.key)" :size="13" :class="fleetSort.key === column.key ? 'text-emerald-700' : 'text-slate-300'" aria-hidden="true" />
                  </button>
                </th>
                <th :class="ui.th">جزئیات</th>
              </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
              <tr v-for="vehicle in visibleFleetVehicles" :key="vehicle.vehicle_code" class="group cursor-pointer transition hover:bg-slate-50" @click="openVehicleDetails(vehicle)">
                <td :class="[ui.td, 'sticky right-0 bg-white font-extrabold tabular-nums text-slate-900 group-hover:bg-slate-50']">{{ vehicle.vehicle_code }}</td>
                <td :class="ui.td"><span v-if="vehicle.plate" class="plate">{{ vehicle.plate }}</span><span v-else class="text-slate-400">—</span></td>
                <td :class="ui.td">{{ vehicle.driver || '—' }}<span v-if="vehicle.personnel_code" class="mr-1.5 text-xs text-slate-400">({{ vehicle.personnel_code }})</span></td>
                <td :class="[ui.td, ui.num, 'font-bold text-emerald-800']">{{ formatRials(vehicle.revenue_rials) }}</td>
                <td :class="[ui.td, ui.num]">{{ money(vehicle.salary_rials) }}</td>
                <td :class="[ui.td, ui.num]">{{ money(vehicle.equipment_costs_rials) }}</td>
                <td :class="[ui.td, ui.num]">
                  <span v-if="vehicle.expense_rials == null" class="rounded-md bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-800" title="هزینه این کامیون هنوز کامل دریافت نشده است">ناقص</span>
                  <span v-else class="font-semibold text-amber-900">{{ formatRials(vehicle.expense_rials) }}</span>
                </td>
                <td :class="[ui.td, ui.num]">
                  <span v-if="vehicle.net_rials == null" class="text-slate-400">—</span>
                  <span v-else dir="ltr" class="inline-block rounded-md px-2 py-1 text-xs font-extrabold" :class="Number(vehicle.net_rials) >= 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-700'">{{ formatRials(vehicle.net_rials) }}</span>
                </td>
                <td :class="[ui.td, ui.num]">{{ faNumber(vehicle.bill_count) }}</td>
                <td :class="ui.td">
                  <button type="button" class="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600" :aria-label="`نمایش جزئیات کامیون ${vehicle.vehicle_code}`" @click.stop="openVehicleDetails(vehicle)"><Eye :size="15" />جزئیات</button>
                </td>
              </tr>
              </tbody>
            </table>
          </div>
          <div v-if="!visibleFleetVehicles.length" class="px-5 py-12 text-center">
            <p class="font-bold text-slate-700">کامیونی با این مشخصات پیدا نشد</p>
            <button type="button" class="mt-3 text-sm font-bold text-emerald-700 hover:underline" @click="fleetQuery = ''">پاک کردن جستجو</button>
          </div>
        </template>
        <div v-else class="px-5 py-12 text-center text-sm text-slate-500">اطلاعاتی برای کامیون‌ها در این بازه پیدا نشد.</div>
      </section>

      <!-- هزینه‌ها: فیش حقوق -->
      <section v-if="section === 'costs' && report?.salary" :class="[ui.card, 'p-5 sm:p-6']">
        <h2 class="text-base font-extrabold text-slate-900">خلاصه فیش حقوق راننده</h2>
        <dl class="mt-4 grid gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-4">
          <div class="bg-white p-4"><dt class="text-xs text-slate-500">روزکارکرد مؤثر</dt><dd class="mt-1.5 text-lg font-bold tabular-nums text-slate-900">{{ faNumber(report.salary.effective_days) }}</dd></div>
          <div class="bg-white p-4"><dt class="text-xs text-slate-500">جمع مزایا</dt><dd class="mt-1.5 text-lg font-bold tabular-nums text-slate-900">{{ formatRials(report.salary.total_benefits) }} <small class="text-xs font-medium text-slate-500">ریال</small></dd></div>
          <div class="bg-white p-4"><dt class="text-xs text-slate-500">جمع کسورات</dt><dd class="mt-1.5 text-lg font-bold tabular-nums text-slate-900">{{ formatRials(report.salary.total_deductions) }} <small class="text-xs font-medium text-slate-500">ریال</small></dd></div>
          <div class="bg-amber-50 p-4"><dt class="text-xs font-semibold text-amber-800">هزینهٔ کامل حقوق</dt><dd class="mt-1.5 text-lg font-black tabular-nums text-amber-950">{{ formatRials(report.salary.salary_cost_rials) }} <small class="text-xs font-medium text-amber-800">ریال</small></dd><p class="mt-1 text-[11px] text-amber-800">خالص دریافتی × ضریب {{ report.totals.cost_coefficients?.map(item => item.title + ' × ' + item.factor).join('، ') || 'بدون ضریب' }}</p></div>
        </dl>
      </section>

      <!-- هزینه‌ها: تجهیز -->
      <section v-if="section === 'costs' && report?.equipment" :class="ui.card">
        <div :class="ui.cardHead">
          <div>
            <h2 class="text-base font-extrabold text-slate-900">هزینه‌های ثبت‌شده برای تجهیز</h2>
            <p class="mt-1 text-xs text-slate-500">{{ report.equipment.title }} · کد {{ report.equipment.code }} · {{ report.equipment.type_title }} ({{ report.equipment.type_id }})</p>
          </div>
          <dl class="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <div class="flex items-center gap-2"><dt class="text-slate-500">هزینه بدهکار:</dt><dd class="font-extrabold tabular-nums text-amber-900">{{ formatRials(report.totals.equipment_costs_rials) }} ریال</dd></div>
            <div class="flex items-center gap-2"><dt class="text-slate-500">درآمد بستانکار:</dt><dd class="font-extrabold tabular-nums text-emerald-800">{{ formatRials(report.totals.equipment_income_rials) }} ریال</dd></div>
          </dl>
        </div>
        <div v-if="report.equipment_costs?.length" class="overflow-x-auto">
          <table :class="[ui.table, 'min-w-[1000px]']">
            <thead><tr>
              <th :class="ui.th">تاریخ سند</th><th :class="ui.th">شماره سند</th><th :class="ui.th">ردیف</th><th :class="ui.th">حساب</th><th :class="ui.th">شرح سند</th>
              <th :class="[ui.th, 'text-left']">هزینه بدهکار (ریال)</th><th :class="[ui.th, 'text-left']">درآمد بستانکار (ریال)</th>
            </tr></thead>
            <tbody class="divide-y divide-slate-100">
            <tr v-for="cost in report.equipment_costs" :key="cost.id" class="hover:bg-slate-50">
              <td :class="ui.td">{{ formatRoadDateTime(cost.voucher_date) }}</td>
              <td :class="[ui.td, 'font-semibold']">{{ cost.voucher_number || cost.voucher_id }}</td>
              <td :class="ui.td">{{ cost.row_number }}</td>
              <td :class="ui.td">{{ cost.account_title || '—' }}<span v-if="cost.account_code" class="mr-1 text-xs text-slate-400">({{ cost.account_code }})</span></td>
              <td :class="[ui.td, 'max-w-xs truncate']" :title="cost.voucher_description">{{ cost.voucher_description || '—' }}</td>
              <td :class="[ui.td, ui.num, 'font-bold text-amber-900']">{{ formatRials(cost.debit) }}</td>
              <td :class="[ui.td, ui.num, 'font-bold text-emerald-800']">{{ formatRials(cost.credit) }}</td>
            </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="px-5 py-10 text-center text-sm text-slate-500">برای این تجهیز در بازهٔ انتخاب‌شده سند هزینه‌ای ثبت نشده است.</p>
      </section>
      <div v-else-if="section === 'costs' && report?.equipment_status && report.equipment_status !== 'available'" role="status" class="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-900">
        <AlertCircle :size="18" class="mt-1 shrink-0" />
        <p>
          {{ equipmentStatusMessage }}
          <span v-if="report.equipment_type"> نوع: {{ report.equipment_type.title }} ({{ report.equipment_type.id }})</span>
          <span v-if="report.equipment_types?.length">{{ report.equipment_types.map((type) => `${type.title} (${type.id})`).join('، ') }}</span>
        </p>
      </div>

      <section v-if="section === 'costs' && report?.indirect_expenses?.length" :class="ui.card">
        <div :class="ui.cardHead"><div><h2 class="text-base font-extrabold text-slate-900">هزینه‌های محاسبه‌شده با ضرایب</h2><p class="mt-1 text-xs text-slate-500">خالص دریافتی فیش × ضریب هر ردیف</p></div><strong class="text-sm tabular-nums text-amber-900">{{ formatRials(report.totals.salary_rials) }} ریال</strong></div>
        <div class="overflow-x-auto"><table :class="ui.table"><thead><tr><th :class="ui.th">عنوان</th><th :class="ui.th">راننده</th><th :class="[ui.th, 'text-left']">روزکارکرد</th><th :class="[ui.th, 'text-left']">مبلغ سهم (ریال)</th></tr></thead><tbody class="divide-y divide-slate-100"><tr v-for="cost in report.indirect_expenses" :key="cost.id"><td :class="ui.td">{{ cost.title }}<p v-if="cost.notes" class="mt-1 text-xs text-slate-500">{{ cost.notes }}</p></td><td :class="ui.td">{{ cost.employee_name }} <span class="text-xs text-slate-400">({{ cost.personnel_code }})</span></td><td :class="[ui.td, ui.num]">{{ cost.effective_days == null ? '—' : faNumber(cost.effective_days) }}</td><td :class="[ui.td, ui.num, 'font-bold text-amber-900']">{{ formatRials(cost.amount_rials) }}</td></tr></tbody></table></div>
      </section>

      <!-- ورود اطلاعات -->
      <section v-if="section === 'indirect' && auth.can('road_indirect_cost.manage')" :class="ui.card">
        <div :class="ui.cardHead">
          <div><h2 class="text-base font-extrabold text-slate-900">ضرایب هزینهٔ غیرمستقیم</h2><p class="mt-1 text-xs leading-6 text-slate-500">برای هر نوع هزینه مثل بیمه یا مالیات، عنوان و ضریب جداگانه تعریف کنید. هر ضریب روی خالص دریافتی فیش در تمام ماه‌های دارای فیش اعمال می‌شود.</p></div>
          <span class="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-800">اعمال برای محاسبه از خالص فیش</span>
        </div>
        <form  class="grid gap-4 p-5 sm:grid-cols-2 sm:p-6" @submit.prevent="saveIndirectExpense">
          <label class="text-xs font-semibold text-slate-700">عنوان کارت
            <input v-model.trim="indirectForm.title" required maxlength="150" :class="ui.field" />
          </label>
          <label class="text-xs font-semibold text-slate-700">ضریب
            <input v-model.number="indirectForm.factor" required type="number" min="0.0001" max="100" step="0.0001" inputmode="decimal" :class="ui.field" />
          </label>
          <label class="text-xs font-semibold text-slate-700 sm:col-span-2">یادداشت (اختیاری)
            <input v-model.trim="indirectForm.notes" maxlength="2000" placeholder="توضیح" :class="ui.field" />
          </label>
          <div class="flex flex-wrap items-center gap-3 sm:col-span-2">
            <button type="submit" :disabled="indirectSaving || indirectLoading" class="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:opacity-50">{{ indirectSaving ? 'در حال ذخیره…' : editingIndirectId ? 'ذخیرهٔ تغییرات' : 'افزودن ضریب' }}</button>
            <button v-if="editingIndirectId" type="button" :class="ui.ghostBtn" @click="cancelIndirectEdit">انصراف</button>
            <span v-if="indirectMessage" role="status" class="rounded-lg px-3 py-2 text-xs font-bold" :class="indirectFailed ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-800'">{{ indirectMessage }}</span>
          </div>
        </form>
        <div v-if="indirectLoading" class="space-y-3 p-5"><div v-for="i in 2" :key="i" class="h-28 animate-pulse rounded-xl bg-slate-100" /></div>
        <div v-else-if="indirectExpenses.length" class="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
          <article v-for="expense in indirectExpenses" :key="expense.id" class="rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
            <div class="flex items-start justify-between gap-3">
              <div><h3 class="font-extrabold text-slate-900">{{ expense.title }}</h3><p class="mt-2 text-3xl font-black tabular-nums text-amber-950">× {{ Number(expense.factor).toLocaleString('fa-IR') }}</p><p v-if="expense.notes" class="mt-2 text-sm text-slate-600">{{ expense.notes }}</p></div>
              <span class="rounded-full bg-white px-3 py-1 text-xs font-bold text-emerald-800">همهٔ ماه‌ها</span>
            </div>
            <p class="mt-4 text-xs leading-6 text-slate-600">مبلغ این هزینه در هر ماهی که فیش حقوقی موجود باشد، از خالص فیش × ضریب محاسبه می‌شود.</p>
            <div class="mt-4 flex flex-wrap gap-2">
              <button type="button" :class="ui.ghostBtn" @click="editIndirectExpense(expense)"><PenLine :size="15" />ویرایش</button>
              <button type="button" class="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-50" @click="removeIndirectExpense(expense)"><X :size="15" />حذف</button>
            </div>
          </article>
        </div>
        <p v-else-if="!indirectLoading" class="px-5 py-10 text-center text-sm text-slate-500">هنوز ضریبی تعریف نشده است.</p>
        <div v-if="indirectMessage && !editingIndirectId" class="px-5 pb-5 text-sm font-semibold" :class="indirectFailed ? 'text-red-700' : 'text-emerald-700'" role="status">{{ indirectMessage }}</div>
      </section>

      <!-- ورود اطلاعات -->
      <section v-if="section === 'entry' && auth.can('road_manual_income.create')" :class="ui.card">
        <div class="border-b border-slate-100 px-5 py-4 sm:px-6">
          <h2 class="text-base font-extrabold text-slate-900">ثبت درآمد بدون بارنامه</h2>
          <p class="mt-1 text-xs text-slate-500">این درآمد برای کامیون {{ selectedVehicle.vehicle_code }} <span v-if="selectedVehicle.plate" class="plate mr-1">{{ selectedVehicle.plate }}</span> ثبت می‌شود.</p>
        </div>
        <form class="grid gap-x-4 gap-y-5 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-3" @submit.prevent="saveManualIncome">
          <label class="text-xs font-semibold text-slate-700 sm:col-span-2 lg:col-span-1">نام شرکت<input v-model.trim="manualForm.company_name" required maxlength="150" :class="ui.field" /></label>
          <label class="text-xs font-semibold text-slate-700">از تاریخ و ساعت<input v-model="manualForm.from_at" required type="datetime-local" :class="ui.field" /></label>
          <label class="text-xs font-semibold text-slate-700">تا تاریخ و ساعت<input v-model="manualForm.to_at" required type="datetime-local" :class="ui.field" /></label>
          <label class="text-xs font-semibold text-slate-700">مدت کار (ساعت)<input v-model="manualForm.working_hours" required type="number" min="0.01" step="0.01" :class="ui.field" /></label>
          <label class="text-xs font-semibold text-slate-700">
            درآمد (ریال)
            <input v-model="manualForm.revenue_rials" required type="number" min="0" step="1" inputmode="numeric" :class="ui.field" />
            <span class="mt-1.5 block h-4 text-xs font-bold tabular-nums text-emerald-800">{{ manualRevenuePreview && `${manualRevenuePreview} ریال` }}</span>
          </label>
          <div class="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-3">
            <button :disabled="savingManual" class="rounded-lg bg-emerald-700 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:opacity-50">{{ savingManual ? 'در حال ثبت…' : 'ثبت درآمد' }}</button>
            <span v-if="manualMessage" role="status" class="rounded-lg px-3 py-2 text-xs font-bold" :class="manualFailed ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-800'">{{ manualMessage }}</span>
          </div>
        </form>
      </section>

      <!-- درآمدها -->
      <section v-if="section === 'income'" :class="ui.card">
        <div :class="ui.cardHead">
          <div>
            <h2 class="text-base font-extrabold text-slate-900">جزئیات درآمد بارنامه‌ها</h2>
            <p class="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">کشنده {{ selectedVehicle.vehicle_code }}<span v-if="selectedVehicle.plate" class="plate">{{ selectedVehicle.plate }}</span>· {{ periodLabel }} · مبالغ به ریال</p>
          </div>
          <button type="button" :class="ui.ghostBtn" :disabled="loadingReport" @click="loadReport"><RefreshCw :size="15" :class="loadingReport && 'animate-spin'" />به‌روزرسانی</button>
        </div>

        <div v-if="loadingReport" class="space-y-3 p-5"><div v-for="i in 4" :key="i" class="h-14 animate-pulse rounded-xl bg-slate-100" /></div>
        <div v-else-if="!report?.bills?.length && !report?.manual_incomes?.length" class="px-5 py-14 text-center">
          <span class="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400"><CalendarDays :size="22" /></span>
          <p class="mt-3 font-bold text-slate-700">برای این ماه بارنامه‌ای پیدا نشد</p>
          <p class="mt-1 text-sm text-slate-500">پس از همگام‌سازی بارنامه‌های بی‌تا، درآمد این ماه نمایش داده می‌شود.</p>
        </div>
        <template v-else>
          <div class="overflow-x-auto">
            <table :class="[ui.table, 'min-w-[900px]']">
              <thead><tr>
                <th :class="ui.th">تاریخ صدور</th><th :class="ui.th">شماره بارنامه</th><th :class="ui.th">پلاک</th><th :class="ui.th">راننده</th><th :class="ui.th">مسیر</th>
                <th :class="[ui.th, 'text-left']">درآمد بارنامه (ریال)</th>
              </tr></thead>
              <tbody class="divide-y divide-slate-100">
              <tr v-for="bill in report.bills" :key="bill.id" class="hover:bg-slate-50">
                <td :class="[ui.td, 'text-slate-600']">{{ formatRoadDateTime(bill.bill_issued_at) }}</td>
                <td :class="[ui.td, 'font-bold text-slate-900']">{{ bill.bill_number }}</td>
                <td :class="ui.td"><span v-if="bill.vehicle_plate" class="plate">{{ bill.vehicle_plate }}</span></td>
                <td :class="[ui.td, 'font-semibold']">{{ bill.driver_name || '—' }}</td>
                <td :class="ui.td"><span class="inline-flex items-center gap-2">{{ bill.origin || '—' }}<ArrowLeft :size="14" class="text-slate-400" aria-label="به" />{{ bill.destination || '—' }}</span></td>
                <td :class="[ui.td, ui.num, 'font-extrabold text-emerald-800']">{{ formatRials(bill.revenue_rials) }}</td>
              </tr>
              </tbody>
              <tfoot>
              <tr class="border-t-2 border-slate-200 bg-slate-50">
                <th colspan="5" class="px-4 py-4 text-right text-sm font-extrabold text-slate-800">جمع ماه</th>
                <td :class="[ui.td, ui.num, 'py-4 font-black text-emerald-800']">{{ formatRials(report.totals.revenue_rials) }}</td>
              </tr>
              </tfoot>
            </table>
          </div>
          <div v-if="report?.manual_incomes?.length" class="border-t border-slate-200 p-5 sm:p-6">
            <h3 class="mb-3 font-extrabold text-slate-900">درآمدهای ثبت‌شده بدون بارنامه</h3>
            <div class="overflow-x-auto rounded-xl border border-slate-200">
              <table :class="[ui.table, 'min-w-[700px]']">
                <thead><tr>
                  <th :class="ui.th">شرکت</th><th :class="ui.th">از</th><th :class="ui.th">تا</th><th :class="ui.th">مدت کار</th><th :class="[ui.th, 'text-left']">درآمد (ریال)</th>
                </tr></thead>
                <tbody class="divide-y divide-slate-100">
                <tr v-for="income in report.manual_incomes" :key="income.id">
                  <td :class="[ui.td, 'font-semibold']"><span class="ml-2 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-800">دستی</span>{{ income.company_name }}</td>
                  <td :class="ui.td">{{ formatRoadDateTime(income.from_at) }}</td>
                  <td :class="ui.td">{{ formatRoadDateTime(income.to_at) }}</td>
                  <td :class="ui.td">{{ Number(income.working_hours).toLocaleString('fa-IR') }} ساعت</td>
                  <td :class="[ui.td, ui.num, 'font-bold text-emerald-800']">{{ formatRials(income.revenue_rials) }}</td>
                </tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>
      </section>
    </template>

    <section v-else-if="!loadingVehicles" class="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center">
      <Truck :size="28" class="mx-auto text-slate-400" />
      <p class="mt-3 font-bold text-slate-700">{{ vehicles.length ? 'یک کشنده را انتخاب کنید' : 'فهرست کشنده‌ها در دسترس نیست' }}</p>
      <button v-if="!vehicles.length" type="button" class="mt-3 text-sm font-bold text-emerald-700 hover:underline" @click="loadVehicles">دریافت دوباره فهرست</button>
    </section>

    <!-- جزئیات کامل یک کامیون -->
    <div v-if="selectedDetailVehicle" class="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 sm:items-center sm:p-6" @click.self="closeVehicleDetails">
      <section role="dialog" aria-modal="true" aria-labelledby="truck-detail-title" class="flex max-h-[94dvh] w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <header class="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-7">
          <div>
            <h2 id="truck-detail-title" class="text-lg font-black text-slate-900">جزئیات کامیون {{ selectedDetailVehicle.vehicle_code }}</h2>
            <p class="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-slate-500"><span v-if="selectedDetailVehicle.plate" class="plate">{{ selectedDetailVehicle.plate }}</span>{{ periodLabel }}</p>
          </div>
          <button type="button" class="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600" aria-label="بستن جزئیات" @click="closeVehicleDetails"><X :size="20" /></button>
        </header>

        <div class="overflow-y-auto">
          <div v-if="loadingVehicleDetail" class="space-y-3 p-6"><div v-for="i in 4" :key="i" class="h-16 animate-pulse rounded-xl bg-slate-100" /></div>
          <div v-else-if="detailError" role="alert" class="m-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{{ detailError }}</div>
          <div v-else-if="detailReport" class="space-y-6 p-5 sm:p-7">
            <dl class="grid gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-4">
              <div class="bg-white p-4"><dt class="flex items-center gap-2 text-xs font-semibold text-emerald-800"><span class="h-2 w-2 rounded-full bg-emerald-600" />درآمد کل</dt><dd class="mt-1.5 text-lg font-black tabular-nums text-slate-900">{{ formatRials(detailReport.totals?.revenue_rials) }} <small class="text-xs font-medium text-slate-500">ریال</small></dd></div>
              <div class="bg-white p-4"><dt class="flex items-center gap-2 text-xs font-semibold text-amber-800"><span class="h-2 w-2 rounded-full bg-amber-500" />هزینه کل</dt><dd class="mt-1.5 text-lg font-black tabular-nums text-slate-900">{{ money(detailReport.totals?.expense_rials) }} <small v-if="detailReport.totals?.expense_rials != null" class="text-xs font-medium text-slate-500">ریال</small></dd></div>
              <div class="bg-slate-900 p-4 text-white"><dt class="text-xs font-semibold text-slate-300">مانده</dt><dd dir="ltr" class="mt-1.5 text-right text-lg font-black tabular-nums" :class="Number(detailReport.totals?.net_rials) < 0 ? 'text-rose-300' : 'text-white'">{{ money(detailReport.totals?.net_rials) }} <small v-if="detailReport.totals?.net_rials != null" class="text-xs font-medium text-slate-400">ریال</small></dd></div>
              <div class="bg-white p-4"><dt class="text-xs font-semibold text-slate-600">تعداد بارنامه</dt><dd class="mt-1.5 text-lg font-black tabular-nums text-slate-900">{{ faNumber(detailReport.totals?.bill_count) }}</dd></div>
            </dl>

            <section class="rounded-xl border border-slate-200 p-4 sm:p-5">
              <h3 class="font-extrabold text-slate-900">راننده و حقوق</h3>
              <p class="mt-2 text-sm text-slate-700">{{ selectedDetailVehicle.driver || detailReport.salary?.employee_name || 'راننده ثبت نشده' }}<span v-if="selectedDetailVehicle.personnel_code || detailReport.salary?.personnel_code" class="mr-2 text-xs text-slate-400">کد پرسنلی: {{ selectedDetailVehicle.personnel_code || detailReport.salary.personnel_code }}</span></p>
              <dl class="mt-4 grid gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 sm:grid-cols-3">
                <div class="bg-amber-50 p-3"><dt class="text-xs text-amber-800">جمع مزایای فیش</dt><dd class="mt-1 font-bold tabular-nums text-amber-950">{{ detailReport.salary?.gross_salary == null ? '—' : `${formatRials(detailReport.salary.gross_salary)} ریال` }}</dd></div>
                <div class="bg-white p-3"><dt class="text-xs text-slate-500">روزکارکرد مؤثر</dt><dd class="mt-1 font-bold tabular-nums">{{ detailReport.salary?.effective_days == null ? '—' : faNumber(detailReport.salary.effective_days) }}</dd></div>
                <div class="bg-white p-3"><dt class="text-xs text-slate-500">جمع مزایا</dt><dd class="mt-1 font-bold tabular-nums">{{ detailReport.salary?.total_benefits == null ? '—' : `${formatRials(detailReport.salary.total_benefits)} ریال` }}</dd></div>
              </dl>
            </section>

            <section class="overflow-hidden rounded-xl border border-slate-200">
              <div class="border-b border-slate-100 px-4 py-3">
                <h3 class="font-extrabold text-slate-900">ریز هزینه‌های تجهیز</h3>
                <p v-if="detailReport.equipment" class="mt-1 text-xs text-slate-500">{{ detailReport.equipment.title }} · کد {{ detailReport.equipment.code }} · {{ detailReport.equipment.type_title }} ({{ detailReport.equipment.type_id }})</p>
                <p v-else-if="detailReport.equipment_status" class="mt-1 text-xs text-amber-700">وضعیت دریافت: {{ detailReport.equipment_status }}</p>
              </div>
              <div v-if="detailReport.equipment_costs?.length" class="overflow-x-auto">
                <table :class="[ui.table, 'min-w-[800px]']">
                  <thead><tr>
                    <th :class="ui.th">تاریخ</th><th :class="ui.th">شماره سند</th><th :class="ui.th">حساب</th><th :class="ui.th">شرح</th>
                    <th :class="[ui.th, 'text-left']">بدهکار (ریال)</th><th :class="[ui.th, 'text-left']">بستانکار (ریال)</th>
                  </tr></thead>
                  <tbody class="divide-y divide-slate-100">
                  <tr v-for="cost in detailReport.equipment_costs" :key="cost.id || `${cost.voucher_id}-${cost.row_number}`" class="hover:bg-slate-50">
                    <td :class="ui.td">{{ formatRoadDateTime(cost.voucher_date) }}</td>
                    <td :class="ui.td">{{ cost.voucher_number || cost.voucher_id }}</td>
                    <td :class="ui.td">{{ cost.account_title || '—' }}<span v-if="cost.account_code" class="mr-1 text-xs text-slate-400">({{ cost.account_code }})</span></td>
                    <td :class="ui.td">{{ cost.voucher_description || '—' }}</td>
                    <td :class="[ui.td, ui.num, 'font-bold text-amber-800']">{{ formatRials(cost.debit) }}</td>
                    <td :class="[ui.td, ui.num, 'font-bold text-emerald-800']">{{ formatRials(cost.credit) }}</td>
                  </tr>
                  </tbody>
                </table>
              </div>
              <p v-else class="px-4 py-8 text-center text-sm text-slate-500">ریز هزینه‌ای برای این دوره ثبت نشده است.</p>
            </section>

            <section v-if="detailReport.indirect_expenses?.length" class="overflow-hidden rounded-xl border border-slate-200">
              <div class="border-b border-slate-100 px-4 py-3"><h3 class="font-extrabold text-slate-900">هزینه‌های غیرمستقیم این کامیون</h3></div>
              <div class="overflow-x-auto"><table :class="ui.table"><thead><tr><th :class="ui.th">عنوان هزینه</th><th :class="ui.th">راننده</th><th :class="[ui.th, 'text-left']">روزکارکرد</th><th :class="[ui.th, 'text-left']">مبلغ (ریال)</th></tr></thead><tbody class="divide-y divide-slate-100"><tr v-for="cost in detailReport.indirect_expenses" :key="cost.id"><td :class="ui.td">{{ cost.title }}<p v-if="cost.notes" class="mt-1 text-xs text-slate-500">{{ cost.notes }}</p></td><td :class="ui.td">{{ cost.employee_name }} ({{ cost.personnel_code }})</td><td :class="[ui.td, ui.num]">{{ cost.effective_days == null ? '—' : faNumber(cost.effective_days) }}</td><td :class="[ui.td, ui.num, 'font-bold text-amber-900']">{{ formatRials(cost.amount_rials) }}</td></tr></tbody></table></div>
            </section>

            <section class="overflow-hidden rounded-xl border border-slate-200">
              <div class="border-b border-slate-100 px-4 py-3"><h3 class="font-extrabold text-slate-900">بارنامه‌ها</h3></div>
              <div v-if="detailReport.bills?.length" class="overflow-x-auto">
                <table :class="[ui.table, 'min-w-[800px]']">
                  <thead><tr>
                    <th :class="ui.th">تاریخ</th><th :class="ui.th">شماره بارنامه</th><th :class="ui.th">راننده</th><th :class="ui.th">مسیر</th>
                    <th :class="[ui.th, 'text-left']">درآمد (ریال)</th>
                  </tr></thead>
                  <tbody class="divide-y divide-slate-100">
                  <tr v-for="bill in detailReport.bills" :key="bill.id" class="hover:bg-slate-50">
                    <td :class="ui.td">{{ formatRoadDateTime(bill.bill_issued_at) }}</td>
                    <td :class="[ui.td, 'font-semibold text-slate-900']">{{ bill.bill_number }}</td>
                    <td :class="ui.td">{{ bill.driver_name || '—' }}</td>
                    <td :class="ui.td"><span class="inline-flex items-center gap-2">{{ bill.origin || '—' }}<ArrowLeft :size="14" class="text-slate-400" aria-label="به" />{{ bill.destination || '—' }}</span></td>
                    <td :class="[ui.td, ui.num, 'font-bold text-emerald-800']">{{ formatRials(bill.revenue_rials) }}</td>
                  </tr>
                  </tbody>
                </table>
              </div>
              <p v-else class="px-4 py-8 text-center text-sm text-slate-500">بارنامه‌ای برای این دوره ثبت نشده است.</p>
            </section>

            <section v-if="detailReport.manual_incomes?.length" class="overflow-hidden rounded-xl border border-slate-200">
              <div class="border-b border-slate-100 px-4 py-3"><h3 class="font-extrabold text-slate-900">درآمدهای ثبت‌شده بدون بارنامه</h3></div>
              <div class="overflow-x-auto">
                <table :class="[ui.table, 'min-w-[650px]']">
                  <thead><tr>
                    <th :class="ui.th">شرکت</th><th :class="ui.th">از</th><th :class="ui.th">تا</th><th :class="ui.th">مدت کار</th><th :class="[ui.th, 'text-left']">درآمد (ریال)</th>
                  </tr></thead>
                  <tbody class="divide-y divide-slate-100">
                  <tr v-for="income in detailReport.manual_incomes" :key="income.id">
                    <td :class="ui.td">{{ income.company_name }}</td>
                    <td :class="ui.td">{{ formatRoadDateTime(income.from_at) }}</td>
                    <td :class="ui.td">{{ formatRoadDateTime(income.to_at) }}</td>
                    <td :class="ui.td">{{ Number(income.working_hours).toLocaleString('fa-IR') }} ساعت</td>
                    <td :class="[ui.td, ui.num, 'font-bold text-emerald-800']">{{ formatRials(income.revenue_rials) }}</td>
                  </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
/* پلاک: قاب با نوار آبی کنار، شبیه پلاک خودرو */
.plate {
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
  border: 1.5px solid #334155;
  border-left: 7px solid #1d4ed8;
  border-radius: 6px;
  background: #fff;
  padding: 1px 8px;
  font-size: 0.8125rem;
  font-weight: 700;
  color: #0f172a;
}
</style>
