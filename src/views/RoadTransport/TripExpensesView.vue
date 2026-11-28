<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, CalendarClock, Check, Clock3, FilePlus2, Gauge, MapPin, Receipt, RefreshCw, Search, Truck, Wallet } from 'lucide-vue-next'
import { roadExpensesService } from '@/services/roadExpensesService'
import { formatRoadDateTime, formatRials } from '@/utils/roadTransportFormat'

const router = useRouter()
const categories = ref([])
const trips = ref([])
const photoUrls = ref({})
const expensesCount = ref(0)
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const search = ref('')
const form = ref({ trip_id: '', category_id: '', amount_rials: '', spent_at: '', description: '' })

function isActive(trip) {
  return trip.status === 'started' && (!trip.ends_at || new Date(trip.ends_at) >= new Date())
}

const activeTrips = computed(() => trips.value.filter(isActive))
const filteredTrips = computed(() => {
  const term = search.value.trim().toLocaleLowerCase('fa')
  if (!term) return trips.value
  return trips.value.filter((trip) => [trip.vehicle_plate, trip.vehicle_code, trip.bill_number, trip.driver_name, trip.origin, trip.destination].some((value) => String(value || '').toLocaleLowerCase('fa').includes(term)))
})
const totalRecorded = computed(() => trips.value.reduce((sum, trip) => sum + Number(trip.expenses_sum_amount_rials || 0), 0))

const amountDisplay = computed({
  get: () => form.value.amount_rials ? formatRials(form.value.amount_rials) : '',
  set: (value) => {
    const normalized = String(value)
        .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
        .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
        .replace(/[^0-9]/g, '')
    form.value.amount_rials = normalized
  },
})

function tripStatus(trip) {
  if (isActive(trip)) return 'فعال'
  if (trip.status === 'finished') return 'پایان‌یافته'
  if (trip.status === 'started') return 'مهلت پایان‌یافته'
  return 'در انتظار شروع'
}

// کلاس رنگی کارت بر اساس وضعیت سفر (نوار کناری و نشان وضعیت)
function tripTone(trip) {
  if (isActive(trip)) return 'is-active'
  if (trip.status === 'finished') return 'is-finished'
  if (trip.status === 'started') return 'is-expired'
  return 'is-pending'
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [categoryResponse, tripResponse, expenseResponse] = await Promise.all([
      roadExpensesService.categories(), roadExpensesService.trips(), roadExpensesService.list({ per_page: 1 }),
    ])
    categories.value = categoryResponse.data.data ?? categoryResponse.data
    trips.value = tripResponse.data.data ?? tripResponse.data
    expensesCount.value = expenseResponse.data.total ?? expenseResponse.data.data?.length ?? 0
  } catch (e) {
    error.value = e.response?.data?.message || 'دریافت اطلاعات هزینه‌ها انجام نشد.'
  } finally { loading.value = false }
}

async function submit() {
  error.value = ''
  saving.value = true
  try {
    await roadExpensesService.create({ ...form.value, amount_rials: Number(form.value.amount_rials) })
    form.value = { trip_id: '', category_id: '', amount_rials: '', spent_at: '', description: '' }
    await load()
  } catch (e) {
    error.value = e.response?.data?.errors?.amount_rials?.[0] || e.response?.data?.errors?.spent_at?.[0] || e.response?.data?.message || 'ثبت هزینه انجام نشد.'
  } finally { saving.value = false }
}

function openTrip(trip) {
  router.push({ name: 'road-transport.expenses.detail', params: { tripId: trip.id } })
}

async function showOdometerPhoto(tripId) {
  if (photoUrls.value[tripId]) return
  try {
    const { data } = await roadExpensesService.odometerPhoto(tripId)
    photoUrls.value[tripId] = URL.createObjectURL(data)
  } catch (e) { error.value = e.response?.data?.message || 'عکس کیلومترشمار دریافت نشد.' }
}

onMounted(load)
</script>

<template>
  <main dir="rtl" class="te">
    <!-- سربرگ و خلاصه آمار -->
    <header class="te-head">
      <div class="te-head-row">
        <div>
          <h1 class="te-title">مدیریت هزینه سفر</h1>
          <p class="te-lead">هزینه‌ها را ثبت کنید و سوابق هر سفر را با جزئیات پلاک، بارنامه و راننده ببینید.</p>
        </div>
        <button type="button" class="te-refresh" :disabled="loading" @click="load">
          <RefreshCw :size="17" :class="{ 'te-spin': loading }" />
          {{ loading ? 'در حال بروزرسانی…' : 'بروزرسانی' }}
        </button>
      </div>

      <dl class="te-stats">
        <div class="te-stat">
          <span class="te-stat-icon"><Truck :size="21" /></span>
          <div>
            <dt class="te-stat-label">سفرهای دریافت‌شده</dt>
            <dd class="te-stat-value">{{ formatRials(trips.length) }}</dd>
          </div>
        </div>
        <div class="te-stat">
          <span class="te-stat-icon"><Receipt :size="21" /></span>
          <div>
            <dt class="te-stat-label">تعداد ثبت هزینه</dt>
            <dd class="te-stat-value">{{ formatRials(expensesCount) }}</dd>
          </div>
        </div>
        <div class="te-stat">
          <span class="te-stat-icon"><Wallet :size="21" /></span>
          <div>
            <dt class="te-stat-label">جمع هزینه سفرهای فهرست</dt>
            <dd class="te-stat-value is-total">{{ formatRials(totalRecorded) }} <small>ریال</small></dd>
          </div>
        </div>
      </dl>
    </header>

    <div v-if="error" role="alert" class="te-error">{{ error }}</div>

    <section class="te-main">
      <!-- فهرست سفرها -->
      <div class="te-list">
        <div class="te-list-head">
          <div>
            <h2 class="te-h2">سفرها و سوابق هزینه</h2>
            <p class="te-sub">برای دیدن هزینه‌های یک پلاک و بارنامه، کارت سفر را باز کنید.</p>
          </div>
          <label class="te-search">
            <span class="te-sr">جستجوی سفر</span>
            <Search :size="17" class="te-search-icon" />
            <input v-model="search" type="search" class="te-input te-search-input" placeholder="جستجو پلاک، بارنامه یا راننده" />
          </label>
        </div>

        <div v-if="loading && trips.length === 0" class="te-grid">
          <div v-for="n in 4" :key="n" class="te-skeleton" />
        </div>

        <div v-else-if="filteredTrips.length" class="te-grid">
          <article v-for="trip in filteredTrips" :key="trip.id" class="te-card" :class="tripTone(trip)">
            <button type="button" class="te-card-btn" @click="openTrip(trip)">
              <div class="te-card-body">
                <div class="te-card-top">
                  <div class="te-vehicle-heading">
                    <span v-if="trip.vehicle_plate" class="te-plate">
                      <span class="te-plate-text">{{ trip.vehicle_plate }}</span>
                      <span class="te-plate-strip">ایران</span>
                    </span>
                    <span v-else class="te-noplate">پلاک ثبت نشده</span>
                    <span v-if="trip.vehicle_code" class="te-code-chip">کد کشنده {{ trip.vehicle_code }}</span>
                  </div>
                  <span class="te-badge">{{ tripStatus(trip) }}</span>
                </div>

                <div class="te-route">
                  <span class="te-route-dot" />
                  <span class="te-route-name">{{ trip.origin || '—' }}</span>
                  <span class="te-route-line" aria-hidden="true" />
                  <span class="te-route-name">{{ trip.destination || '—' }}</span>
                  <MapPin :size="16" class="te-route-pin" />
                </div>

                <div class="te-meta">
                  <div>
                    <p class="te-meta-label">بارنامه</p>
                    <p class="te-meta-value">{{ trip.bill_number }}</p>
                  </div>
                  <div>
                    <p class="te-meta-label">راننده</p>
                    <p class="te-meta-value">{{ trip.driver_name || '—' }}</p>
                  </div>
                </div>

                <p class="te-date"><CalendarClock :size="14" />شروع: {{ formatRoadDateTime(trip.started_at) }}</p>
              </div>

              <div class="te-card-foot">
                <div>
                  <p class="te-total-label">جمع هزینه</p>
                  <p class="te-total">{{ formatRials(trip.expenses_sum_amount_rials) }} <small>ریال</small></p>
                </div>
                <div class="te-card-count">
                  {{ formatRials(trip.expenses_count) }} هزینه
                  <ArrowLeft :size="18" class="te-card-arrow" />
                </div>
              </div>
            </button>

            <div v-if="trip.odometer_photo_path" class="te-photo">
              <button type="button" class="te-link" @click="showOdometerPhoto(trip.id)"><Gauge :size="15" />نمایش عکس کیلومتر شروع</button>
              <img v-if="photoUrls[trip.id]" :src="photoUrls[trip.id]" alt="عکس کیلومترشمار" />
            </div>
          </article>
        </div>

        <div v-else class="te-empty">
          <span class="te-empty-icon"><Truck :size="26" /></span>
          <p class="te-empty-title">سفری پیدا نشد</p>
          <p class="te-empty-text">{{ search ? 'عبارت جستجو را تغییر دهید.' : 'سفرهای ثبت‌شده در این بخش نمایش داده می‌شوند.' }}</p>
          <button v-if="search" type="button" class="te-link is-block" @click="search = ''">پاک کردن جستجو</button>
        </div>
      </div>

      <!-- فرم ثبت هزینه -->
      <form class="te-form" @submit.prevent="submit">
        <div class="te-form-head">
          <span class="te-form-icon"><FilePlus2 :size="21" /></span>
          <div>
            <h2 class="te-form-title">ثبت هزینه</h2>
            <p class="te-form-sub">هزینه در بازه سفر ثبت می‌شود.</p>
          </div>
        </div>

        <div class="te-form-body">
          <p v-if="!activeTrips.length" class="te-notice"><Clock3 :size="15" />سفر فعالی برای ثبت هزینه وجود ندارد.</p>

          <fieldset class="te-fields" :disabled="!activeTrips.length || saving">
            <div>
              <label for="expense-trip" class="te-label">سفر فعال</label>
              <select id="expense-trip" v-model="form.trip_id" required class="te-input">
                <option value="" disabled>انتخاب بارنامه و پلاک</option>
                <option v-for="trip in activeTrips" :key="trip.id" :value="trip.id">{{ trip.vehicle_plate || 'بدون پلاک' }}{{ trip.vehicle_code ? ` (کد ${trip.vehicle_code})` : '' }} · {{ trip.bill_number }} — {{ trip.driver_name }}</option>
              </select>
            </div>

            <div>
              <label for="expense-category" class="te-label">نوع هزینه</label>
              <select id="expense-category" v-model="form.category_id" required class="te-input">
                <option value="" disabled>انتخاب نوع هزینه</option>
                <option v-for="category in categories" :key="category.id" :value="category.id">{{ category.name }} — سقف {{ formatRials(category.max_amount_rials) }} ریال</option>
              </select>
            </div>

            <div>
              <label for="expense-amount" class="te-label">مبلغ (ریال)</label>
              <div class="te-amount">
                <input id="expense-amount" v-model="amountDisplay" required inputmode="numeric" placeholder="مثلاً ۱٬۰۰۰٬۰۰۰" />
                <span>ریال</span>
              </div>
            </div>

            <div>
              <label class="te-label">تاریخ و ساعت هزینه (شمسی)</label>
              <DatePicker v-model="form.spent_at" class="te-date-picker" type="datetime" format="YYYY-MM-DD HH:mm:ss" display-format="jYYYY/jMM/jDD HH:mm" locale="fa" :auto-submit="true" :wrapper-submit="true" :convert-numbers="true" placeholder="انتخاب تاریخ و ساعت" input-class="te-date-input" color="#0e7a57" />
              <p class="te-hint"><Clock3 :size="14" />تاریخ هزینه باید در بازه مجاز همین سفر باشد.</p>
            </div>

            <div>
              <label for="expense-description" class="te-label">توضیحات <small>(اختیاری)</small></label>
              <textarea id="expense-description" v-model.trim="form.description" rows="3" class="te-input te-textarea" placeholder="توضیح کوتاه درباره هزینه" />
            </div>
          </fieldset>

          <button type="submit" class="te-submit" :disabled="saving || !activeTrips.length">
            <Check :size="17" />{{ saving ? 'در حال ثبت…' : 'ثبت هزینه سفر' }}
          </button>
        </div>
      </form>
    </section>
  </main>
</template>

<style scoped>
/*
  همهٔ استایل‌ها در همین فایل نوشته شده و به کلاس‌های Tailwind وابسته نیست.
  پالت: سبز تابلوی بزرگراه، زعفرانی خط‌کشی جاده، مه‌رنگ برای سطوح نرم.
*/
.te {
  --te-ink: #14312c;
  --te-green: #0e7a57;
  --te-green-deep: #0a6247;
  --te-saffron: #f4b63f;
  --te-mist: #f3f7f5;
  --te-line: #d9e3df;
  --te-muted: #5e726d;
  --te-text: #1b2b28;

  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 80rem;
  margin-inline: auto;
  padding: 1rem;
  color: var(--te-text);
}
@media (min-width: 640px) {
  .te { padding: 1.5rem; }
}
@media (min-width: 1024px) {
  .te { padding: 2rem; }
}
.te button { font: inherit; cursor: pointer; }
.te button:disabled { cursor: not-allowed; }
.te p, .te h1, .te h2, .te dl, .te dd, .te dt { margin: 0; }

.te-sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

/* ───── سربرگ ───── */
.te-head { display: flex; flex-direction: column; gap: 1.25rem; }
.te-head-row { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 1rem; }
.te-title { font-size: 1.5rem; font-weight: 900; line-height: 1.4; }
@media (min-width: 640px) {
  .te-title { font-size: 1.875rem; }
}
.te-lead { margin-top: 0.5rem; max-width: 42rem; font-size: 0.875rem; line-height: 1.9; color: var(--te-muted); }

.te-refresh {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  border: 1px solid var(--te-line);
  border-radius: 0.75rem;
  background: #fff;
  padding: 0.625rem 1rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--te-ink);
  transition: border-color 0.15s, color 0.15s;
}
.te-refresh:hover:not(:disabled) { border-color: var(--te-green); color: var(--te-green); }
.te-refresh:disabled { cursor: wait; opacity: 0.7; }
.te-refresh:focus-visible,
.te-submit:focus-visible { outline: 2px solid var(--te-green); outline-offset: 2px; }

.te-spin { animation: te-spin 1s linear infinite; }
@keyframes te-spin { to { transform: rotate(360deg); } }

/* ───── نوار آمار ───── */
.te-stats {
  display: grid;
  grid-template-columns: 1fr;
  overflow: hidden;
  border-radius: 1rem;
  background: var(--te-ink);
  color: #fff;
}
@media (min-width: 640px) {
  .te-stats { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
.te-stat { position: relative; display: flex; align-items: center; gap: 1rem; padding: 1.25rem 1.5rem; }
.te-stat-icon {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 0.75rem;
  background: rgb(255 255 255 / 0.1);
  color: #9fd6c0;
}
.te-stat-label { font-size: 0.75rem; color: #a9c4bc; }
.te-stat-value { margin-top: 0.25rem; font-size: 1.5rem; font-weight: 900; line-height: 1.3; color: #fff; }
.te-stat-value small { font-size: 0.75rem; font-weight: 500; color: #a9c4bc; }
.te-stat-value.is-total { color: var(--te-saffron); }

/* خط‌کشی وسط جاده بین آمارها */
.te-stat + .te-stat::before {
  content: '';
  position: absolute;
  inset-inline: 1.5rem;
  top: 0;
  height: 2px;
  background: repeating-linear-gradient(to left, var(--te-saffron) 0 12px, transparent 12px 24px);
  opacity: 0.6;
}
@media (min-width: 640px) {
  .te-stat + .te-stat::before {
    inset-inline-end: auto;
    inset-inline-start: 0;
    inset-block: 1.25rem;
    width: 2px;
    height: auto;
    background: repeating-linear-gradient(to bottom, var(--te-saffron) 0 12px, transparent 12px 24px);
  }
}

.te-error {
  border: 1px solid #f2c4bf;
  border-radius: 0.75rem;
  background: #fdecea;
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #8c1d18;
}

/* ───── چیدمان اصلی ───── */
.te-main { display: grid; grid-template-columns: minmax(0, 1fr); align-items: start; gap: 1.5rem; }
@media (min-width: 1280px) {
  .te-main { grid-template-columns: minmax(0, 1fr) 23rem; }
}
.te-list { display: flex; flex-direction: column; gap: 1.25rem; min-width: 0; }
.te-list-head { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 0.75rem; }
.te-h2 { font-size: 1.25rem; font-weight: 900; }
.te-sub { margin-top: 0.25rem; font-size: 0.875rem; color: var(--te-muted); }

.te-search { position: relative; display: block; width: 100%; }
@media (min-width: 640px) {
  .te-search { max-width: 20rem; }
}
.te-search-icon {
  position: absolute;
  inset-inline-start: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--te-muted);
  pointer-events: none;
}
.te-search-input { padding-inline-start: 2.5rem; }

.te-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 1rem; }
@media (min-width: 768px) {
  .te-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
.te-skeleton { height: 16rem; border-radius: 1rem; background: #e3ebe8; animation: te-pulse 1.6s ease-in-out infinite; }
@keyframes te-pulse { 50% { opacity: 0.55; } }

/* ───── کارت سفر ───── */
.te-card {
  --tone: #0e7a57;
  --tone-ink: #0a6247;
  --tone-soft: #e3f4ec;
  position: relative;
  overflow: hidden;
  border: 1px solid var(--te-line);
  border-radius: 1rem;
  background: #fff;
  transition: border-color 0.15s;
}
.te-card.is-finished { --tone: #8a9b96; --tone-ink: #4a5b56; --tone-soft: #edf1ef; }
.te-card.is-expired { --tone: #e0922b; --tone-ink: #8a4a07; --tone-soft: #fdf0d9; }
.te-card.is-pending { --tone: #3f78cc; --tone-ink: #24508f; --tone-soft: #e6eefa; }
.te-card:hover { border-color: #7fb9a3; }
.te-card::before {
  content: '';
  position: absolute;
  inset-block: 0;
  inset-inline-start: 0;
  width: 5px;
  background: var(--tone);
}

.te-card-btn {
  display: block;
  width: 100%;
  border: 0;
  background: none;
  padding: 0;
  text-align: start;
  color: inherit;
}
.te-card-btn:focus-visible { outline: 2px solid var(--te-green); outline-offset: -2px; }

.te-card-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-block: 1.25rem;
  padding-inline-start: 1.5rem;
  padding-inline-end: 1.25rem;
}
.te-card-top { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; }
.te-vehicle-heading { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; }
.te-code-chip { display: inline-flex; align-items: center; border: 1px solid #bfdbfe; border-radius: 999px; background: #eff6ff; padding: 0.3rem 0.65rem; color: #1d4ed8; font-size: 0.72rem; font-weight: 800; white-space: nowrap; }
.te-noplate { font-size: 0.875rem; color: var(--te-muted); }

.te-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  border-radius: 9999px;
  background: var(--tone-soft);
  color: var(--tone-ink);
  padding: 0.25rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 700;
}
.te-badge::before { content: ''; width: 0.4rem; height: 0.4rem; border-radius: 9999px; background: var(--tone); }

/* پلاک خودرو */
.te-plate {
  display: inline-flex;
  align-items: stretch;
  overflow: hidden;
  border: 2px solid var(--te-ink);
  border-radius: 8px;
  background: #fff;
}
.te-plate-text { padding: 0.2rem 0.75rem; font-size: 1.05rem; font-weight: 800; letter-spacing: 0.06em; color: var(--te-ink); }
.te-plate-strip {
  display: grid;
  place-items: center;
  padding: 0 0.45rem;
  background: #1d4f9c;
  color: #fff;
  font-size: 0.6rem;
  font-weight: 700;
}

/* مسیر مبدأ به مقصد */
.te-route { display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; font-weight: 600; }
.te-route-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.te-route-dot { flex-shrink: 0; width: 0.6rem; height: 0.6rem; border: 2px solid var(--te-green); border-radius: 9999px; }
.te-route-line { flex: 1; min-width: 1.25rem; border-top: 2px dashed #b8c9c3; }
.te-route-pin { flex-shrink: 0; color: var(--te-green); }

.te-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; font-size: 0.875rem; }
.te-meta > div { min-width: 0; }
.te-meta-label { font-size: 0.75rem; color: var(--te-muted); }
.te-meta-value { margin-top: 0.125rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 700; }
.te-date { display: flex; align-items: center; gap: 0.375rem; font-size: 0.75rem; color: var(--te-muted); }

.te-card-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  border-top: 1px solid var(--te-line);
  background: var(--te-mist);
  padding-block: 0.875rem;
  padding-inline-start: 1.5rem;
  padding-inline-end: 1.25rem;
}
.te-total-label { font-size: 0.75rem; color: var(--te-muted); }
.te-total { margin-top: 0.125rem; font-size: 1.125rem; font-weight: 900; }
.te-total small { font-size: 0.75rem; font-weight: 500; color: var(--te-muted); }
.te-card-count { display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; font-weight: 600; color: var(--te-muted); transition: color 0.15s; }
.te-card-arrow { transition: transform 0.15s; }
.te-card-btn:hover .te-card-count { color: var(--te-green); }
.te-card-btn:hover .te-card-arrow { transform: translateX(-4px); }

.te-photo {
  border-top: 1px solid var(--te-line);
  padding-block: 0.75rem;
  padding-inline-start: 1.5rem;
  padding-inline-end: 1.25rem;
}
.te-photo img { display: block; max-width: 100%; max-height: 18rem; margin-top: 0.75rem; border-radius: 0.75rem; object-fit: contain; }

.te-link {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  border: 0;
  background: none;
  padding: 0;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--te-green);
}
.te-link:hover { color: var(--te-green-deep); }
.te-link.is-block { margin-top: 1rem; font-size: 0.875rem; }

/* ───── حالت خالی ───── */
.te-empty { border: 1px dashed #b8c9c3; border-radius: 1rem; background: #fff; padding: 3rem 1.25rem; text-align: center; }
.te-empty-icon {
  display: grid;
  place-items: center;
  width: 3.5rem;
  height: 3.5rem;
  margin: 0 auto;
  border-radius: 0.75rem;
  background: var(--te-mist);
  color: var(--te-muted);
}
.te-empty-title { margin-top: 1rem; font-weight: 700; }
.te-empty-text { margin-top: 0.25rem; font-size: 0.875rem; color: var(--te-muted); }

/* ───── فرم ───── */
.te-form { border: 1px solid var(--te-line); border-radius: 1rem; background: #fff; }
@media (min-width: 1280px) {
  .te-form { position: sticky; top: 1.5rem; }
}
.te-form-head { display: flex; align-items: center; gap: 0.75rem; border-bottom: 1px solid var(--te-line); padding: 1rem 1.25rem; }
.te-form-icon {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 0.75rem;
  background: #e3f4ec;
  color: var(--te-green);
}
.te-form-title { font-size: 1rem; font-weight: 900; }
.te-form-sub { margin-top: 0.125rem; font-size: 0.75rem; color: var(--te-muted); }
.te-form-body { display: flex; flex-direction: column; gap: 1rem; padding: 1.25rem; }
.te-fields { display: flex; flex-direction: column; gap: 1rem; min-width: 0; margin: 0; padding: 0; border: 0; }
.te-fields:disabled { opacity: 0.6; }

.te-label { display: block; margin-bottom: 0.375rem; font-size: 0.875rem; font-weight: 600; }
.te-label small { font-size: inherit; font-weight: 400; color: var(--te-muted); }
.te-hint { display: flex; align-items: center; gap: 0.375rem; margin-top: 0.375rem; font-size: 0.75rem; line-height: 1.6; color: var(--te-muted); }
.te-notice {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  border-radius: 0.5rem;
  background: #fdf0d9;
  padding: 0.625rem 0.75rem;
  font-size: 0.75rem;
  line-height: 1.6;
  color: #8a4a07;
}

/* ورودی‌ها (برای ورودی DatePicker هم اعمال می‌شود) */
.te-date-picker,
:deep(.te-date-picker) {
  display: block;
  width: 100%;
  margin-top: 0.375rem;
}
:deep(.te-date-picker .vpd-input-group) {
  display: flex;
  width: 100%;
  align-items: stretch;
  overflow: hidden;
  border: 1px solid var(--te-line);
  border-radius: 0.625rem;
  background: #fff;
  transition: border-color 0.15s, box-shadow 0.15s;
}
:deep(.te-date-picker .vpd-input-group:focus-within) {
  border-color: var(--te-green);
  box-shadow: 0 0 0 4px rgb(14 122 87 / 0.15);
}
:deep(.te-date-picker .vpd-input-group input.te-date-input) {
  box-sizing: border-box;
  width: auto;
  min-width: 0;
  flex: 1 1 auto;
  margin: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  padding: 0.7rem 0.875rem;
  font: inherit;
  font-size: 0.875rem;
  line-height: 1.5;
  color: var(--te-text);
  outline: none;
  box-shadow: none;
}
:deep(.te-date-picker .vpd-icon-btn) {
  flex: 0 0 2.75rem;
  padding: 0;
  color: #fff;
}
.te-input,
:deep(.te-input) {
  box-sizing: border-box;
  width: 100%;
  border: 1px solid var(--te-line);
  border-radius: 0.625rem;
  background: #fff;
  padding: 0.7rem 0.875rem;
  font: inherit;
  font-size: 0.875rem;
  color: var(--te-text);
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.te-input:focus,
:deep(.te-input:focus) {
  border-color: var(--te-green);
  box-shadow: 0 0 0 4px rgb(14 122 87 / 0.15);
}
.te-textarea { resize: vertical; }

.te-amount {
  display: flex;
  align-items: stretch;
  border: 1px solid var(--te-line);
  border-radius: 0.625rem;
  background: #fff;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.te-amount:focus-within { border-color: var(--te-green); box-shadow: 0 0 0 4px rgb(14 122 87 / 0.15); }
.te-amount input {
  flex: 1;
  min-width: 0;
  border: 0;
  background: transparent;
  padding: 0.65rem 0.875rem;
  font: inherit;
  font-size: 1.125rem;
  font-weight: 800;
  color: var(--te-text);
  outline: none;
}
.te-amount span {
  display: grid;
  place-items: center;
  padding: 0 0.875rem;
  border-inline-start: 1px solid var(--te-line);
  font-size: 0.75rem;
  color: var(--te-muted);
}

.te-submit {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  border: 0;
  border-radius: 0.75rem;
  background: var(--te-green);
  padding: 0.75rem 1rem;
  font-weight: 700;
  color: #fff;
  transition: background 0.15s;
}
.te-submit:hover:not(:disabled) { background: var(--te-green-deep); }
.te-submit:disabled { opacity: 0.5; }

@media (prefers-reduced-motion: reduce) {
  .te-spin, .te-skeleton { animation: none; }
  .te-card-arrow { transition: none; }
}
</style>
