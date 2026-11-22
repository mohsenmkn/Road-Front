<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { driverTripService } from '@/services/driverTripService'
import { ArrowLeft, Camera, Check, Clock3, FileText, MapPin, Receipt, ShieldCheck, Truck, Wallet } from 'lucide-vue-next'

const steps = ['بارنامه', 'شروع سفر', 'هزینه‌ها']
const billNumber = ref('')
const otp = ref('')
const phase = ref('bill')
const token = ref(sessionStorage.getItem('road_driver_token') || '')
const trip = ref(null)
const categories = ref([])
const expenses = ref([])
const expensesLoading = ref(false)
const categoryId = ref('')
const amount = ref('')
const odometerPhoto = ref(null)
const error = ref('')
const message = ref('')
const loading = ref(false)
const errorEl = ref(null)

const currentStep = computed(() => ({ bill: 0, otp: 0, start: 1, active: 2 }[phase.value] ?? 0))
const deadline = computed(() => trip.value?.ends_at ? new Date(trip.value.ends_at).toLocaleString('fa-IR') : '')
const tripExpired = computed(() => !!trip.value?.ends_at && new Date(trip.value.ends_at) < new Date())
const amountDisplay = computed({
  get: () => amount.value ? new Intl.NumberFormat('fa-IR').format(Number(amount.value)) : '',
  set: (value) => {
    const normalized = String(value)
        .replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
        .replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
        .replace(/[^0-9]/g, '')
    amount.value = normalized
  },
})
const totalExpenses = computed(() => expenses.value.reduce((sum, item) => sum + Number(item.amount_rials || 0), 0))

// هر بار که خطای جدیدی نمایش داده شود، آن را به دید کاربر می‌آوریم
watch(error, (value) => {
  if (value) nextTick(() => errorEl.value?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
})

function money(value) {
  return new Intl.NumberFormat('fa-IR').format(Number(value || 0))
}

function showError(e) {
  const response = e?.response
  const data = response?.data || {}
  const validationMessage = Object.values(data.errors || {})
      .flat(Infinity)
      .find((value) => typeof value === 'string' && value.trim())
  const serverMessage = [validationMessage, data.message, data.detail]
      .find((value) => typeof value === 'string' && value.trim())

  message.value = ''
  if (serverMessage && !['Too Many Attempts.', 'The given data was invalid.'].includes(serverMessage)) {
    error.value = serverMessage
    return
  }

  if (response?.status === 429 || serverMessage === 'Too Many Attempts.') {
    error.value = 'درخواست‌های زیادی ارسال شده است؛ کمی صبر کنید و دوباره تلاش کنید.'
  } else if (response?.status === 422) {
    error.value = 'اطلاعات واردشده قابل تأیید نیست. شماره بارنامه یا اطلاعات را بررسی کنید.'
  } else if (!response) {
    error.value = 'ارتباط با سامانه برقرار نشد. اتصال اینترنت را بررسی و دوباره تلاش کنید.'
  } else {
    error.value = 'در انجام درخواست مشکلی پیش آمد. کمی بعد دوباره تلاش کنید.'
  }
}

async function requestOtp() {
  loading.value = true; error.value = ''; message.value = ''
  try { await driverTripService.requestOtp(billNumber.value); phase.value = 'otp'; message.value = 'کد تأیید به موبایل ثبت‌شده در بارنامه ارسال شد.' }
  catch (e) { showError(e) } finally { loading.value = false }
}

async function verifyOtp() {
  loading.value = true; error.value = ''
  try {
    const { data } = await driverTripService.verifyOtp(billNumber.value, otp.value)
    token.value = data.token; sessionStorage.setItem('road_driver_token', data.token)
    await loadTrip()
  } catch (e) { showError(e) } finally { loading.value = false }
}

async function loadTrip() {
  try {
    const [tripResponse, categoryResponse] = await Promise.all([driverTripService.current(token.value), driverTripService.categories(token.value)])
    trip.value = tripResponse.data.data
    categories.value = categoryResponse.data
    phase.value = trip.value ? 'active' : 'start'
    if (trip.value) await loadExpenses()
  } catch (e) { token.value = ''; sessionStorage.removeItem('road_driver_token'); phase.value = 'bill'; showError(e) }
}

async function loadExpenses() {
  if (!token.value) return
  expensesLoading.value = true
  try {
    const { data } = await driverTripService.expenses(token.value)
    expenses.value = data.data ?? data
  } catch (e) { showError(e) }
  finally { expensesLoading.value = false }
}

async function startTrip() {
  if (!odometerPhoto.value) { error.value = 'عکس کیلومترشمار را انتخاب کنید.'; return }
  loading.value = true; error.value = ''
  try { const { data } = await driverTripService.start(token.value, odometerPhoto.value); trip.value = data.data; phase.value = 'active'; message.value = data.message; await loadExpenses() }
  catch (e) { showError(e) } finally { loading.value = false }
}

async function submitExpense() {
  loading.value = true; error.value = ''; message.value = ''
  try {
    const { data } = await driverTripService.expense(token.value, { category_id: categoryId.value, amount_rials: Number(amount.value) })
    message.value = data.message; categoryId.value = ''; amount.value = ''
    await loadExpenses()
  } catch (e) { showError(e) } finally { loading.value = false }
}

function backToBill() {
  phase.value = 'bill'; otp.value = ''; error.value = ''; message.value = ''
}

function logout() {
  sessionStorage.removeItem('road_driver_token'); token.value = ''; trip.value = null; expenses.value = []; phase.value = 'bill'; otp.value = ''
  error.value = ''; message.value = ''
}

function formatExpenseAmount(value) {
  return new Intl.NumberFormat('fa-IR').format(value)
}

function formatExpenseDate(value) {
  return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

onMounted(() => { if (token.value) loadTrip() })
</script>

<template>
  <main dir="rtl" class="dt">
    <div class="dt-wrap">
      <!-- سربرگ و مراحل کار -->
      <header class="dt-head">
        <div class="dt-head-row">
          <div class="dt-brand">
            <span class="dt-brand-icon"><Truck :size="24" /></span>
            <div>
              <p class="dt-brand-sub">سامانه حمل‌ونقل جاده‌ای</p>
              <h1 class="dt-title">پنل سفر راننده</h1>
            </div>
          </div>
          <span class="dt-chip"><ShieldCheck :size="15" />امن و سریع</span>
        </div>
        <p class="dt-lead">ثبت سفر و هزینه‌های مسیر، ساده و در چند مرحله.</p>

        <ol class="dt-steps" aria-label="مراحل کار">
          <li v-for="(step, index) in steps" :key="step" class="dt-step" :class="{ 'is-done': index < currentStep, 'is-current': index === currentStep }" :aria-current="index === currentStep ? 'step' : undefined">
            <span class="dt-step-bar" />
            <span class="dt-step-label">{{ step }}</span>
          </li>
        </ol>
      </header>

      <!-- مرحلهٔ ۱: شماره بارنامه -->
      <form v-if="phase === 'bill'" class="dt-card" @submit.prevent="requestOtp">
        <div class="dt-card-head">
          <span class="dt-icon"><FileText :size="21" /></span>
          <div>
            <h2 class="dt-h2">ورود به سفر</h2>
            <p class="dt-sub">شماره بارنامه را وارد کنید تا کد تأیید برای راننده پیامک شود.</p>
          </div>
        </div>

        <label class="dt-label" for="bill-number">شماره بارنامه</label>
        <input id="bill-number" v-model.trim="billNumber" required inputmode="numeric" autocomplete="off" class="dt-input" :class="{ 'is-invalid': error }" :aria-invalid="error ? 'true' : undefined" placeholder="مثلاً ۱۲۳۴۵۶" @input="error = ''" />

        <div v-if="error" ref="errorEl" role="alert" class="dt-alert is-error"><span class="dt-alert-icon">!</span><p>{{ error }}</p></div>
        <div v-if="message" class="dt-alert is-success"><span class="dt-alert-icon"><Check :size="15" /></span><p>{{ message }}</p></div>

        <button class="dt-btn" :disabled="loading">{{ loading ? 'در حال بررسی…' : 'دریافت کد تأیید' }}<ArrowLeft v-if="!loading" :size="18" /></button>
      </form>

      <!-- مرحلهٔ ۱: کد تأیید -->
      <form v-else-if="phase === 'otp'" class="dt-card" @submit.prevent="verifyOtp">
        <div class="dt-card-head">
          <span class="dt-icon"><ShieldCheck :size="21" /></span>
          <div>
            <h2 class="dt-h2">تأیید شماره راننده</h2>
            <p class="dt-sub">کد پیامک‌شده به شماره راننده ثبت‌شده روی بارنامه را وارد کنید.</p>
          </div>
        </div>

        <label class="dt-label" for="driver-otp">کد پیامک</label>
        <input id="driver-otp" v-model.trim="otp" required inputmode="numeric" maxlength="5" autocomplete="one-time-code" dir="ltr" class="dt-input dt-otp" :class="{ 'is-invalid': error }" :aria-invalid="error ? 'true' : undefined" placeholder="•••••" @input="error = ''" />

        <div v-if="error" ref="errorEl" role="alert" class="dt-alert is-error"><span class="dt-alert-icon">!</span><p>{{ error }}</p></div>
        <div v-if="message" class="dt-alert is-success"><span class="dt-alert-icon"><Check :size="15" /></span><p>{{ message }}</p></div>

        <button class="dt-btn" :disabled="loading">{{ loading ? 'در حال تأیید…' : 'تأیید و ادامه' }}<ArrowLeft v-if="!loading" :size="18" /></button>
        <button type="button" class="dt-text-btn" @click="backToBill">تغییر شماره بارنامه</button>
      </form>

      <!-- مرحلهٔ ۲: شروع سفر -->
      <form v-else-if="phase === 'start'" class="dt-card" @submit.prevent="startTrip">
        <div class="dt-card-head">
          <span class="dt-icon is-saffron"><Camera :size="21" /></span>
          <div>
            <h2 class="dt-h2">شروع سفر</h2>
            <p class="dt-sub">پیش از حرکت، عکس واضحی از کیلومترشمار بگیرید و بارگذاری کنید.</p>
          </div>
        </div>

        <label for="odometer-photo" class="dt-drop" :class="{ 'is-filled': odometerPhoto, 'is-invalid': error }">
          <span class="dt-drop-icon"><Check v-if="odometerPhoto" :size="25" /><Camera v-else :size="25" /></span>
          <span class="dt-drop-title">{{ odometerPhoto?.name || 'انتخاب عکس کیلومترشمار' }}</span>
          <span class="dt-drop-hint">{{ odometerPhoto ? 'برای تغییر عکس دوباره لمس کنید' : 'برای باز شدن دوربین لمس کنید' }}</span>
          <input id="odometer-photo" required type="file" accept="image/*" capture="environment" class="dt-sr" @change="odometerPhoto = $event.target.files?.[0] || null; error = ''" />
        </label>

        <div v-if="error" ref="errorEl" role="alert" class="dt-alert is-error"><span class="dt-alert-icon">!</span><p>{{ error }}</p></div>

        <button class="dt-btn" :disabled="loading">{{ loading ? 'در حال ثبت…' : 'ثبت شروع سفر' }}<ArrowLeft v-if="!loading" :size="18" /></button>
      </form>

      <!-- مرحلهٔ ۳: سفر فعال و هزینه‌ها -->
      <section v-else-if="phase === 'active'" class="dt-stack">
        <article class="dt-trip" :class="tripExpired ? 'is-expired' : 'is-active'">
          <div class="dt-trip-body">
            <div class="dt-trip-top">
              <span class="dt-badge">{{ tripExpired ? 'مهلت پایان‌یافته' : 'سفر فعال' }}</span>
              <Truck :size="24" class="dt-trip-truck" />
            </div>

            <div>
              <p class="dt-meta-label">شماره بارنامه</p>
              <p class="dt-bill">{{ trip?.bill_number }}</p>
            </div>

            <div v-if="trip?.vehicle_plate || trip?.vehicle_code" class="dt-tags">
              <span v-if="trip?.vehicle_plate" class="dt-plate">
                <span class="dt-plate-text">{{ trip.vehicle_plate }}</span>
                <span class="dt-plate-strip">ایران</span>
              </span>
              <span v-if="trip?.vehicle_code" class="dt-code">کد کشنده {{ trip.vehicle_code }}</span>
            </div>

            <div class="dt-route">
              <span class="dt-route-dot" />
              <span class="dt-route-name">{{ trip?.origin }}</span>
              <span class="dt-route-line" aria-hidden="true" />
              <span class="dt-route-name">{{ trip?.destination }}</span>
              <MapPin :size="16" class="dt-route-pin" />
            </div>
          </div>

          <div class="dt-trip-foot">
            <span class="dt-deadline-label"><Clock3 :size="16" />مهلت ثبت هزینه</span>
            <span class="dt-deadline">{{ deadline || '—' }}</span>
          </div>
        </article>

        <div v-if="tripExpired" class="dt-alert is-warn"><span class="dt-alert-icon"><Clock3 :size="15" /></span><p>مهلت مجاز این سفر پایان یافته و امکان ثبت هزینه جدید وجود ندارد.</p></div>
        <form v-else class="dt-card" @submit.prevent="submitExpense">
          <div class="dt-card-head">
            <span class="dt-icon"><Wallet :size="21" /></span>
            <div>
              <h2 class="dt-h2">ثبت هزینه سفر</h2>
              <p class="dt-sub">نوع هزینه و مبلغ پرداخت‌شده را وارد کنید.</p>
            </div>
          </div>

          <label for="expense-category" class="dt-label">نوع هزینه</label>
          <select id="expense-category" v-model="categoryId" required class="dt-input" :class="{ 'is-invalid': error }" @change="error = ''">
            <option value="" disabled>یک مورد انتخاب کنید</option>
            <option v-for="item in categories" :key="item.id" :value="item.id">{{ item.name }} — سقف {{ money(item.max_amount_rials) }} ریال</option>
          </select>

          <label for="expense-amount" class="dt-label dt-gap">مبلغ پرداخت‌شده</label>
          <div class="dt-amount" :class="{ 'is-invalid': error }">
            <input id="expense-amount" v-model="amountDisplay" required inputmode="numeric" autocomplete="off" placeholder="مثلاً ۱٬۲۵۰٬۰۰۰" @input="error = ''" />
            <span>ریال</span>
          </div>
          <p class="dt-hint">مبلغ را به ریال وارد کنید.</p>

          <div v-if="error" ref="errorEl" role="alert" class="dt-alert is-error"><span class="dt-alert-icon">!</span><p>{{ error }}</p></div>
          <div v-if="message" class="dt-alert is-success"><span class="dt-alert-icon"><Check :size="15" /></span><p>{{ message }}</p></div>

          <button class="dt-btn" :disabled="loading">{{ loading ? 'در حال ثبت هزینه…' : 'ثبت هزینه' }}<Check v-if="!loading" :size="18" /></button>
        </form>

        <section class="dt-card" aria-live="polite">
          <!-- اگر مهلت تمام شده و فرم ثبت نیست، خطای بارگذاری فهرست اینجا دیده می‌شود -->
          <div v-if="error && tripExpired" ref="errorEl" role="alert" class="dt-alert is-error dt-alert-top"><span class="dt-alert-icon">!</span><p>{{ error }}</p></div>

          <div class="dt-list-head">
            <div class="dt-list-title">
              <span class="dt-icon is-small"><Receipt :size="19" /></span>
              <div>
                <h2 class="dt-h2 is-small">هزینه‌های ثبت‌شده</h2>
                <p class="dt-sub">{{ money(expenses.length) }} مورد برای این سفر</p>
              </div>
            </div>
            <div v-if="expenses.length" class="dt-sum">
              <p class="dt-meta-label">جمع هزینه‌ها</p>
              <p class="dt-sum-value">{{ money(totalExpenses) }} <small>ریال</small></p>
            </div>
          </div>

          <div v-if="expensesLoading" class="dt-skeletons"><div v-for="n in 2" :key="n" class="dt-skeleton" /></div>
          <div v-else-if="expenses.length === 0" class="dt-empty">
            <span class="dt-empty-icon"><Receipt :size="22" /></span>
            <p class="dt-empty-title">هنوز هزینه‌ای ثبت نشده</p>
            <p class="dt-empty-text">هزینه‌های این سفر پس از ثبت در اینجا نمایش داده می‌شوند.</p>
          </div>
          <ul v-else class="dt-expenses">
            <li v-for="item in expenses" :key="item.id" class="dt-expense">
              <span class="dt-icon is-small"><Receipt :size="18" /></span>
              <div class="dt-expense-main">
                <div class="dt-expense-row">
                  <span class="dt-expense-name">{{ item.category }}</span>
                  <span class="dt-expense-amount">{{ formatExpenseAmount(item.amount_rials) }} <small>ریال</small></span>
                </div>
                <p class="dt-expense-date">{{ formatExpenseDate(item.spent_at) }}</p>
                <p v-if="item.description" class="dt-expense-desc">{{ item.description }}</p>
              </div>
            </li>
          </ul>
        </section>

        <div class="dt-logout"><button type="button" class="dt-text-btn" @click="logout">خروج از صفحه راننده</button></div>
      </section>

      <footer class="dt-foot"><Truck :size="14" />پنل ثبت هزینه‌های سفر</footer>
    </div>
  </main>
</template>

<style scoped>
/*
  همهٔ استایل‌ها در همین فایل نوشته شده و به کلاس‌های Tailwind وابسته نیست.
  پالت: سبز تابلوی بزرگراه، زعفرانی خط‌کشی جاده، مه‌رنگ برای سطوح نرم.
*/
.dt {
  --dt-ink: #14312c;
  --dt-green: #0e7a57;
  --dt-green-deep: #0a6247;
  --dt-saffron: #f4b63f;
  --dt-mist: #f3f7f5;
  --dt-line: #d9e3df;
  --dt-muted: #5e726d;
  --dt-text: #1b2b28;
  --dt-danger: #c63d36;

  min-height: 100vh;
  min-height: 100dvh;
  background: #eef3f1;
  padding: 1rem;
  color: var(--dt-text);
}
@media (min-width: 640px) {
  .dt { padding: 2.5rem 1.5rem; }
}
.dt-wrap { max-width: 40rem; margin-inline: auto; }
.dt button { font: inherit; cursor: pointer; }
.dt button:disabled { cursor: wait; }
.dt :where(p, h1, h2, ol, ul) { margin: 0; padding: 0; }
.dt :where(ol, ul) { list-style: none; }

.dt-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

/* ───── سربرگ ───── */
.dt-head {
  position: relative;
  overflow: hidden;
  border-radius: 1.5rem;
  background: var(--dt-ink);
  padding: 1.5rem 1.5rem 1.75rem;
  color: #fff;
}
@media (min-width: 640px) {
  .dt-head { padding: 2rem 2.25rem 2.25rem; }
}
/* خط‌کشی وسط جاده در لبهٔ پایین سربرگ */
.dt-head::after {
  content: '';
  position: absolute;
  inset-inline: 0;
  bottom: 0;
  height: 4px;
  background: repeating-linear-gradient(to left, var(--dt-saffron) 0 16px, transparent 16px 32px);
  opacity: 0.75;
}
.dt-head-row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
.dt-brand { display: flex; align-items: center; gap: 0.75rem; }
.dt-brand-icon {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 3rem;
  height: 3rem;
  border-radius: 0.875rem;
  background: rgb(255 255 255 / 0.1);
  color: #9fd6c0;
}
.dt-brand-sub { font-size: 0.75rem; color: #a9c4bc; }
.dt-title { margin-top: 0.25rem; font-size: 1.25rem; font-weight: 900; line-height: 1.3; }
@media (min-width: 640px) {
  .dt-title { font-size: 1.5rem; }
}
.dt-chip {
  display: none;
  align-items: center;
  gap: 0.375rem;
  border-radius: 9999px;
  background: rgb(159 214 192 / 0.14);
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #b9e5d3;
}
@media (min-width: 640px) {
  .dt-chip { display: inline-flex; }
}
.dt-lead { margin-top: 1.25rem; max-width: 32rem; font-size: 0.875rem; line-height: 1.9; color: #c4d6d0; }

.dt-steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; margin-top: 1.5rem; }
.dt-step { display: flex; flex-direction: column; gap: 0.5rem; }
.dt-step-bar { height: 6px; border-radius: 9999px; background: rgb(255 255 255 / 0.15); }
.dt-step-label { font-size: 0.75rem; color: #8fa9a1; }
.dt-step.is-done .dt-step-bar { background: #4cc79a; }
.dt-step.is-done .dt-step-label { color: #b9e5d3; }
.dt-step.is-current .dt-step-bar { background: var(--dt-saffron); }
.dt-step.is-current .dt-step-label { color: #fff; font-weight: 700; }

/* ───── کارت‌ها ───── */
.dt-stack { display: flex; flex-direction: column; gap: 1.25rem; margin-top: 1.25rem; }
.dt-card {
  margin-top: 1.25rem;
  border: 1px solid var(--dt-line);
  border-radius: 1.25rem;
  background: #fff;
  padding: 1.25rem;
}
.dt-stack .dt-card { margin-top: 0; }
@media (min-width: 640px) {
  .dt-card { padding: 1.75rem; }
}
.dt-card-head { display: flex; align-items: flex-start; gap: 0.75rem; margin-bottom: 1.5rem; }
.dt-icon {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 0.75rem;
  background: #e3f4ec;
  color: var(--dt-green);
}
.dt-icon.is-saffron { background: #fdf0d9; color: #8a4a07; }
.dt-icon.is-small { width: 2.5rem; height: 2.5rem; }
.dt-h2 { font-size: 1.125rem; font-weight: 900; }
.dt-h2.is-small { font-size: 1rem; }
.dt-sub { margin-top: 0.25rem; font-size: 0.8125rem; line-height: 1.8; color: var(--dt-muted); }

.dt-label { display: block; margin-bottom: 0.5rem; font-size: 0.875rem; font-weight: 600; }
.dt-label.dt-gap { margin-top: 1rem; }
.dt-hint { margin-top: 0.5rem; font-size: 0.75rem; color: var(--dt-muted); }

.dt-input {
  box-sizing: border-box;
  display: block;
  width: 100%;
  min-height: 3.25rem;
  border: 1px solid var(--dt-line);
  border-radius: 0.875rem;
  background: var(--dt-mist);
  padding: 0.75rem 1rem;
  font: inherit;
  font-size: 1rem;
  color: var(--dt-text);
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
}
.dt-input:focus { border-color: var(--dt-green); background: #fff; box-shadow: 0 0 0 4px rgb(14 122 87 / 0.15); }
.dt-otp { text-align: center; font-size: 1.5rem; font-weight: 800; letter-spacing: 0.5em; padding-inline-start: calc(1rem + 0.5em); }

/* حالت خطا برای فیلدها */
.dt-input.is-invalid,
.dt-amount.is-invalid,
.dt-drop.is-invalid { border-color: var(--dt-danger); }
.dt-input.is-invalid:focus { border-color: var(--dt-danger); box-shadow: 0 0 0 4px rgb(198 61 54 / 0.15); }

.dt-amount {
  display: flex;
  align-items: stretch;
  border: 1px solid var(--dt-line);
  border-radius: 0.875rem;
  background: var(--dt-mist);
  transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
}
.dt-amount:focus-within { border-color: var(--dt-green); background: #fff; box-shadow: 0 0 0 4px rgb(14 122 87 / 0.15); }
.dt-amount.is-invalid:focus-within { border-color: var(--dt-danger); box-shadow: 0 0 0 4px rgb(198 61 54 / 0.15); }
.dt-amount input {
  flex: 1;
  min-width: 0;
  min-height: 3.25rem;
  border: 0;
  background: transparent;
  padding: 0.75rem 1rem;
  font: inherit;
  font-size: 1.125rem;
  font-weight: 800;
  color: var(--dt-text);
  outline: none;
}
.dt-amount span {
  display: grid;
  place-items: center;
  padding: 0 1rem;
  border-inline-start: 1px solid var(--dt-line);
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--dt-muted);
}

/* انتخاب عکس */
.dt-drop {
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 2px dashed #b8c9c3;
  border-radius: 1rem;
  background: var(--dt-mist);
  padding: 2rem 1.25rem;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.dt-drop:hover { border-color: var(--dt-green); background: #e9f4ef; }
.dt-drop:focus-within { outline: 2px solid var(--dt-green); outline-offset: 2px; }
.dt-drop.is-filled { border-style: solid; border-color: var(--dt-green); background: #e9f4ef; }
.dt-drop-icon {
  display: grid;
  place-items: center;
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 0.875rem;
  background: #fff;
  color: var(--dt-green);
}
.dt-drop-title { margin-top: 0.75rem; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 700; }
.dt-drop-hint { margin-top: 0.25rem; font-size: 0.75rem; color: var(--dt-muted); }

/* ───── پیام‌ها: خطا و موفقیت درست بالای دکمهٔ اقدام ───── */
.dt-alert {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin-top: 1rem;
  border: 1px solid var(--tone-line);
  border-inline-start: 4px solid var(--tone);
  border-radius: 0.875rem;
  background: var(--tone-soft);
  padding: 0.875rem 1rem;
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.8;
  color: var(--tone-ink);
  animation: dt-pop 0.25s ease-out;
}
.dt-alert.is-error { --tone: var(--dt-danger); --tone-soft: #fdecea; --tone-line: #f2c4bf; --tone-ink: #8c1d18; }
.dt-alert.is-success { --tone: var(--dt-green); --tone-soft: #e3f4ec; --tone-line: #b6e0cd; --tone-ink: var(--dt-green-deep); }
.dt-alert.is-warn { --tone: #e0922b; --tone-soft: #fdf0d9; --tone-line: #f1d49b; --tone-ink: #7a4206; margin-top: 0; font-weight: 500; }
.dt-alert-top { margin-top: 0; margin-bottom: 1.25rem; }
.dt-alert-icon {
  display: grid;
  place-items: center;
  flex-shrink: 0;
  width: 1.5rem;
  height: 1.5rem;
  margin-top: 0.125rem;
  border-radius: 9999px;
  background: var(--tone);
  font-size: 0.8125rem;
  font-weight: 900;
  line-height: 1;
  color: #fff;
}
@keyframes dt-pop {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: none; }
}

/* ───── دکمه‌ها ───── */
.dt-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  min-height: 3.25rem;
  margin-top: 1.25rem;
  border: 0;
  border-radius: 0.875rem;
  background: var(--dt-green);
  padding: 0.75rem 1.25rem;
  font-size: 1rem;
  font-weight: 800;
  color: #fff;
  transition: background 0.15s;
}
.dt-btn:hover:not(:disabled) { background: var(--dt-green-deep); }
.dt-btn:disabled { opacity: 0.6; }
.dt-btn:focus-visible,
.dt-text-btn:focus-visible { outline: 2px solid var(--dt-green); outline-offset: 2px; }
.dt-text-btn {
  display: block;
  margin: 0.75rem auto 0;
  border: 0;
  border-radius: 0.625rem;
  background: none;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--dt-muted);
  transition: background 0.15s, color 0.15s;
}
.dt-text-btn:hover { background: #fff; color: var(--dt-text); }
.dt-logout { padding-bottom: 0.5rem; }
.dt-logout .dt-text-btn { margin-top: 0; }

/* ───── کارت سفر فعال ───── */
.dt-trip {
  --tone: #0e7a57;
  --tone-ink: #0a6247;
  --tone-soft: #e3f4ec;
  position: relative;
  overflow: hidden;
  border: 1px solid var(--dt-line);
  border-radius: 1.25rem;
  background: #fff;
}
.dt-trip.is-expired { --tone: #e0922b; --tone-ink: #8a4a07; --tone-soft: #fdf0d9; }
.dt-trip::before {
  content: '';
  position: absolute;
  inset-block: 0;
  inset-inline-start: 0;
  width: 5px;
  background: var(--tone);
}
.dt-trip-body {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  padding-block: 1.25rem;
  padding-inline-start: 1.5rem;
  padding-inline-end: 1.25rem;
}
.dt-trip-top { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; }
.dt-trip-truck { color: var(--dt-muted); }
.dt-badge {
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
.dt-badge::before { content: ''; width: 0.4rem; height: 0.4rem; border-radius: 9999px; background: var(--tone); }
.dt-meta-label { font-size: 0.75rem; color: var(--dt-muted); }
.dt-bill { margin-top: 0.125rem; font-size: 1.5rem; font-weight: 900; letter-spacing: 0.03em; }

.dt-tags { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; }
.dt-plate { display: inline-flex; align-items: stretch; overflow: hidden; border: 2px solid var(--dt-ink); border-radius: 8px; background: #fff; }
.dt-plate-text { padding: 0.2rem 0.75rem; font-size: 1.05rem; font-weight: 800; letter-spacing: 0.06em; color: var(--dt-ink); }
.dt-plate-strip { display: grid; place-items: center; padding: 0 0.45rem; background: #1d4f9c; color: #fff; font-size: 0.6rem; font-weight: 700; }
.dt-code { border-radius: 0.5rem; background: var(--dt-mist); padding: 0.3rem 0.75rem; font-size: 0.8125rem; font-weight: 700; color: var(--dt-ink); }

.dt-route { display: flex; align-items: center; gap: 0.5rem; font-size: 0.9375rem; font-weight: 700; }
.dt-route-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dt-route-dot { flex-shrink: 0; width: 0.6rem; height: 0.6rem; border: 2px solid var(--dt-green); border-radius: 9999px; }
.dt-route-line { flex: 1; min-width: 1.25rem; border-top: 2px dashed #b8c9c3; }
.dt-route-pin { flex-shrink: 0; color: var(--dt-green); }

.dt-trip-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem 0.75rem;
  border-top: 1px solid var(--dt-line);
  background: var(--dt-mist);
  padding-block: 0.875rem;
  padding-inline-start: 1.5rem;
  padding-inline-end: 1.25rem;
  font-size: 0.875rem;
}
.dt-deadline-label { display: inline-flex; align-items: center; gap: 0.5rem; color: var(--dt-muted); }
.dt-deadline { font-weight: 800; }

/* ───── فهرست هزینه‌ها ───── */
.dt-list-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.75rem; margin-bottom: 1.25rem; }
.dt-list-title { display: flex; align-items: center; gap: 0.75rem; }
.dt-list-title .dt-sub { margin-top: 0.125rem; font-size: 0.75rem; }
.dt-sum { text-align: start; }
.dt-sum-value { margin-top: 0.125rem; font-size: 1rem; font-weight: 900; }
.dt-sum-value small { font-size: 0.75rem; font-weight: 500; color: var(--dt-muted); }

.dt-skeletons { display: flex; flex-direction: column; gap: 0.75rem; }
.dt-skeleton { height: 4rem; border-radius: 0.875rem; background: #e3ebe8; animation: dt-pulse 1.6s ease-in-out infinite; }
@keyframes dt-pulse { 50% { opacity: 0.55; } }

.dt-empty { border: 1px dashed #b8c9c3; border-radius: 1rem; background: var(--dt-mist); padding: 2rem 1rem; text-align: center; }
.dt-empty-icon { display: grid; place-items: center; width: 3rem; height: 3rem; margin: 0 auto; border-radius: 0.75rem; background: #fff; color: var(--dt-muted); }
.dt-empty-title { margin-top: 0.75rem; font-size: 0.875rem; font-weight: 700; }
.dt-empty-text { margin-top: 0.25rem; font-size: 0.75rem; color: var(--dt-muted); }

.dt-expenses { display: flex; flex-direction: column; }
.dt-expense { display: flex; align-items: flex-start; gap: 0.75rem; border-top: 1px solid #e6eeea; padding-block: 1rem; }
.dt-expense:first-child { border-top: 0; padding-top: 0; }
.dt-expense:last-child { padding-bottom: 0; }
.dt-expense-main { min-width: 0; flex: 1; }
.dt-expense-row { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.25rem 0.75rem; }
.dt-expense-name { font-weight: 700; }
.dt-expense-amount { font-weight: 900; font-variant-numeric: tabular-nums; }
.dt-expense-amount small { font-size: 0.75rem; font-weight: 500; color: var(--dt-muted); }
.dt-expense-date { margin-top: 0.25rem; font-size: 0.75rem; color: var(--dt-muted); }
.dt-expense-desc { margin-top: 0.5rem; font-size: 0.875rem; line-height: 1.8; color: #3d4f4a; }

.dt-foot { display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin-top: 2rem; padding-bottom: 1rem; font-size: 0.75rem; color: var(--dt-muted); }

@media (prefers-reduced-motion: reduce) {
  .dt-alert, .dt-skeleton { animation: none; }
}
</style>