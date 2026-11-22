<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { Activity, Check, Pencil, Plus, Receipt, Trash2, Wallet, X } from 'lucide-vue-next'
import { expenseCategoriesService } from '@/services/expenseCategoriesService'

const categories = ref([])
const editingId = ref(null)
const form = ref({ name: '', limit_toman: '', is_active: true })
const error = ref('')
const loading = ref(false)
const saving = ref(false)
const formEl = ref(null)

const toman = (rials) => Math.round(Number(rials || 0) / 10).toLocaleString('fa-IR')
const activeCount = computed(() => categories.value.filter((item) => item.is_active).length)
const highestLimit = computed(() => {
  if (!categories.value.length) return '—'
  return toman(Math.max(...categories.value.map((item) => Number(item.max_amount_rials || 0))))
})

async function load() {
  loading.value = true
  try { const { data } = await expenseCategoriesService.list(); categories.value = data.data ?? data }
  catch (e) { error.value = e.response?.data?.message || 'دریافت سقف هزینه‌ها انجام نشد.' }
  finally { loading.value = false }
}

function resetForm() {
  editingId.value = null
  form.value = { name: '', limit_toman: '', is_active: true }
}

async function save() {
  error.value = ''
  saving.value = true
  try {
    const payload = { name: form.value.name, max_amount_rials: Number(form.value.limit_toman) * 10, is_active: form.value.is_active }
    if (editingId.value) await expenseCategoriesService.update(editingId.value, payload)
    else await expenseCategoriesService.create(payload)
    resetForm(); await load()
  } catch (e) { error.value = Object.values(e.response?.data?.errors || {})[0]?.[0] || e.response?.data?.message || 'ذخیره نوع هزینه انجام نشد.' }
  finally { saving.value = false }
}

function edit(item) {
  editingId.value = item.id
  form.value = { name: item.name, limit_toman: Number(item.max_amount_rials) / 10, is_active: item.is_active }
  // فرم بالای فهرست است؛ آن را به دید کاربر می‌آوریم
  nextTick(() => formEl.value?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
}

async function remove(item) {
  if (!window.confirm(`نوع هزینه «${item.name}» حذف یا غیرفعال شود؟`)) return
  try { await expenseCategoriesService.remove(item.id); await load() }
  catch (e) { error.value = e.response?.data?.message || 'حذف انجام نشد.' }
}

onMounted(load)
</script>

<template>
  <main dir="rtl" class="te">
    <!-- سربرگ و خلاصه آمار -->
    <header class="te-head">
      <div>
        <h1 class="te-title">انواع و سقف هزینه‌ها</h1>
        <p class="te-lead">مبالغ در پایگاه داده به ریال ذخیره می‌شوند؛ هر ۱۰ ریال برابر یک تومان است.</p>
      </div>

      <dl class="te-stats">
        <div class="te-stat">
          <span class="te-stat-icon"><Receipt :size="21" /></span>
          <div>
            <dt class="te-stat-label">انواع هزینه</dt>
            <dd class="te-stat-value">{{ categories.length.toLocaleString('fa-IR') }}</dd>
          </div>
        </div>
        <div class="te-stat">
          <span class="te-stat-icon"><Activity :size="21" /></span>
          <div>
            <dt class="te-stat-label">موارد فعال</dt>
            <dd class="te-stat-value">{{ activeCount.toLocaleString('fa-IR') }}</dd>
          </div>
        </div>
        <div class="te-stat">
          <span class="te-stat-icon"><Wallet :size="21" /></span>
          <div>
            <dt class="te-stat-label">بالاترین سقف</dt>
            <dd class="te-stat-value is-total">{{ highestLimit }} <small v-if="categories.length">تومان</small></dd>
          </div>
        </div>
      </dl>
    </header>

    <div v-if="error" role="alert" class="te-error">{{ error }}</div>

    <!-- فرم افزودن / ویرایش -->
    <form ref="formEl" class="te-form" :class="{ 'is-editing': editingId }" @submit.prevent="save">
      <div class="te-form-head">
        <span class="te-form-icon"><Pencil v-if="editingId" :size="20" /><Plus v-else :size="21" /></span>
        <div>
          <h2 class="te-form-title">{{ editingId ? 'ویرایش نوع هزینه' : 'افزودن نوع هزینه' }}</h2>
          <p class="te-form-sub">{{ editingId ? 'تغییرات را اعمال کنید و ذخیره بزنید.' : 'عنوان و سقف مجاز هر بار ثبت هزینه را مشخص کنید.' }}</p>
        </div>
      </div>

      <div class="te-form-body">
        <div class="te-fields">
          <div class="te-field is-grow">
            <label for="cat-name" class="te-label">عنوان هزینه</label>
            <input id="cat-name" v-model.trim="form.name" required class="te-input" placeholder="مثلاً سوخت" />
          </div>

          <div class="te-field">
            <label for="cat-limit" class="te-label">سقف هر هزینه (تومان)</label>
            <div class="te-amount">
              <input id="cat-limit" v-model.number="form.limit_toman" required type="number" min="1" />
              <span>تومان</span>
            </div>
          </div>

          <label class="te-switch">
            <input v-model="form.is_active" type="checkbox" />
            <span class="te-switch-track" aria-hidden="true" />
            <span class="te-switch-text">{{ form.is_active ? 'فعال' : 'غیرفعال' }}</span>
          </label>
        </div>

        <div class="te-actions">
          <button class="te-submit" type="submit" :disabled="saving">
            <Check v-if="editingId" :size="17" /><Plus v-else :size="17" />
            {{ saving ? 'در حال ذخیره…' : (editingId ? 'ذخیره تغییرات' : 'افزودن هزینه') }}
          </button>
          <button v-if="editingId" class="te-cancel" type="button" @click="resetForm"><X :size="17" />انصراف</button>
        </div>
      </div>
    </form>

    <!-- فهرست انواع هزینه -->
    <section>
      <div v-if="loading && categories.length === 0" class="te-grid">
        <div v-for="n in 6" :key="n" class="te-skeleton" />
      </div>

      <div v-else-if="categories.length" class="te-grid">
        <article v-for="item in categories" :key="item.id" class="te-card" :class="[item.is_active ? 'is-active' : 'is-inactive', { 'is-editing': item.id === editingId }]">
          <div class="te-card-body">
            <div class="te-card-top">
              <h3 class="te-card-name">{{ item.name }}</h3>
              <span class="te-badge">{{ item.is_active ? 'فعال' : 'غیرفعال' }}</span>
            </div>
            <div>
              <p class="te-cap-label">سقف هر هزینه</p>
              <p class="te-cap">{{ toman(item.max_amount_rials) }} <small>تومان</small></p>
            </div>
          </div>

          <div class="te-card-foot">
            <button type="button" class="te-edit" @click="edit(item)"><Pencil :size="15" />ویرایش</button>
            <button type="button" class="te-remove" @click="remove(item)"><Trash2 :size="15" />حذف / غیرفعال</button>
          </div>
        </article>
      </div>

      <div v-else class="te-empty">
        <span class="te-empty-icon"><Receipt :size="26" /></span>
        <p class="te-empty-title">هنوز نوع هزینه‌ای تعریف نشده</p>
        <p class="te-empty-text">از فرم بالا اولین نوع هزینه را با عنوان و سقف مجاز اضافه کنید.</p>
      </div>
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
  max-width: 64rem;
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
.te p, .te h1, .te h2, .te h3, .te dl, .te dd, .te dt { margin: 0; }

/* ───── سربرگ ───── */
.te-head { display: flex; flex-direction: column; gap: 1.25rem; }
.te-title { font-size: 1.5rem; font-weight: 900; line-height: 1.4; }
@media (min-width: 640px) {
  .te-title { font-size: 1.875rem; }
}
.te-lead { margin-top: 0.5rem; max-width: 44rem; font-size: 0.875rem; line-height: 1.9; color: var(--te-muted); }

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

/* ───── فرم ───── */
.te-form { border: 1px solid var(--te-line); border-radius: 1rem; background: #fff; transition: border-color 0.15s, box-shadow 0.15s; }
.te-form.is-editing { border-color: var(--te-green); box-shadow: 0 0 0 4px rgb(14 122 87 / 0.1); }
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
.te-form-body { display: flex; flex-direction: column; gap: 1.25rem; padding: 1.25rem; }
.te-fields { display: flex; flex-direction: column; gap: 1.25rem; }
@media (min-width: 768px) {
  .te-fields { flex-direction: row; align-items: flex-end; }
  .te-field { width: 15rem; }
  .te-field.is-grow { flex: 1; width: auto; }
}
.te-label { display: block; margin-bottom: 0.375rem; font-size: 0.875rem; font-weight: 600; }
.te-input {
  box-sizing: border-box;
  width: 100%;
  border: 1px solid var(--te-line);
  border-radius: 0.625rem;
  background: #fff;
  padding: 0.7rem 0.875rem;
  font: inherit;
  font-size: 0.9375rem;
  color: var(--te-text);
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.te-input:focus { border-color: var(--te-green); box-shadow: 0 0 0 4px rgb(14 122 87 / 0.15); }

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
  font-size: 1.0625rem;
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

/* کلید فعال/غیرفعال */
.te-switch { display: inline-flex; align-items: center; gap: 0.75rem; padding-bottom: 0.55rem; cursor: pointer; }
.te-switch input { position: absolute; opacity: 0; width: 1px; height: 1px; }
.te-switch-track {
  position: relative;
  flex-shrink: 0;
  width: 2.75rem;
  height: 1.5rem;
  border-radius: 9999px;
  background: #b8c9c3;
  transition: background 0.15s;
}
.te-switch-track::after {
  content: '';
  position: absolute;
  top: 3px;
  inset-inline-start: 3px;
  width: 1.125rem;
  height: 1.125rem;
  border-radius: 9999px;
  background: #fff;
  transition: transform 0.15s;
}
.te-switch input:checked + .te-switch-track { background: var(--te-green); }
.te-switch input:checked + .te-switch-track::after { transform: translateX(-1.25rem); }
.te-switch input:focus-visible + .te-switch-track { outline: 2px solid var(--te-green); outline-offset: 2px; }
.te-switch-text { min-width: 3.5rem; font-size: 0.875rem; font-weight: 600; }

.te-actions { display: flex; flex-wrap: wrap; gap: 0.75rem; }
.te-submit,
.te-cancel {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border-radius: 0.75rem;
  padding: 0.7rem 1.25rem;
  font-weight: 700;
  transition: background 0.15s, border-color 0.15s;
}
.te-submit { border: 0; background: var(--te-green); color: #fff; }
.te-submit:hover:not(:disabled) { background: var(--te-green-deep); }
.te-submit:disabled { opacity: 0.5; }
.te-cancel { border: 1px solid var(--te-line); background: #fff; color: var(--te-ink); }
.te-cancel:hover { border-color: var(--te-green); }
.te-submit:focus-visible,
.te-cancel:focus-visible,
.te-edit:focus-visible,
.te-remove:focus-visible { outline: 2px solid var(--te-green); outline-offset: 2px; }

/* ───── کارت نوع هزینه ───── */
.te-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 1rem; }
@media (min-width: 640px) {
  .te-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (min-width: 1024px) {
  .te-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
.te-skeleton { height: 10rem; border-radius: 1rem; background: #e3ebe8; animation: te-pulse 1.6s ease-in-out infinite; }
@keyframes te-pulse { 50% { opacity: 0.55; } }

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
.te-card.is-inactive { --tone: #8a9b96; --tone-ink: #4a5b56; --tone-soft: #edf1ef; }
.te-card:hover { border-color: #7fb9a3; }
.te-card.is-editing { border-color: var(--te-green); }
.te-card::before {
  content: '';
  position: absolute;
  inset-block: 0;
  inset-inline-start: 0;
  width: 5px;
  background: var(--tone);
}

.te-card-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-block: 1.25rem;
  padding-inline-start: 1.5rem;
  padding-inline-end: 1.25rem;
}
.te-card-top { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; }
.te-card-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 1.0625rem; font-weight: 900; }
.te-badge {
  display: inline-flex;
  flex-shrink: 0;
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
.te-cap-label { font-size: 0.75rem; color: var(--te-muted); }
.te-cap { margin-top: 0.125rem; font-size: 1.375rem; font-weight: 900; }
.te-cap small { font-size: 0.75rem; font-weight: 500; color: var(--te-muted); }

.te-card-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  border-top: 1px solid var(--te-line);
  background: var(--te-mist);
  padding-block: 0.75rem;
  padding-inline-start: 1.5rem;
  padding-inline-end: 1.25rem;
}
.te-edit,
.te-remove {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  border: 1px solid var(--te-line);
  border-radius: 0.625rem;
  background: #fff;
  padding: 0.45rem 0.75rem;
  font-size: 0.8125rem;
  font-weight: 600;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}
.te-edit { color: var(--te-green); }
.te-edit:hover { border-color: var(--te-green); color: var(--te-green-deep); }
.te-remove { color: #a3281f; }
.te-remove:hover { border-color: #e5a29c; background: #fdecea; }

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

@media (prefers-reduced-motion: reduce) {
  .te-skeleton { animation: none; }
  .te-switch-track, .te-switch-track::after { transition: none; }
}
</style>