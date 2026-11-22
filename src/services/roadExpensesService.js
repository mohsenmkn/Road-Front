import api from '@/api/axios'

export const roadExpensesService = {
  categories: () => api.get('/road-transport/expense-categories'),
  trips: () => api.get('/road-transport/trips'),
  odometerPhoto: (tripId) => api.get(`/road-transport/trips/${tripId}/odometer-photo`, { responseType: 'blob' }),
  list: (params = {}) => api.get('/road-transport/expenses', { params }),
  create: (payload) => api.post('/road-transport/expenses', payload),
  billFinancialVehicles: () => api.get('/road-transport/bill-financials/vehicles'),
  monthlyBillFinancials: (params) => api.get('/road-transport/bill-financials/monthly', { params }),
  latestBitaSync: () => api.get('/road-transport/bill-financials/bita-sync/latest'),
  syncBitaBills: (payload) => api.post('/road-transport/bill-financials/bita-sync', payload),
  createManualBillIncome: (payload) => api.post('/road-transport/bill-financials/manual-income', payload),
  indirectExpenses: () => api.get('/road-transport/bill-financials/indirect-expenses'),
  createIndirectExpense: (payload) => api.post('/road-transport/bill-financials/indirect-expenses', payload),
  updateIndirectExpense: (id, payload) => api.put(`/road-transport/bill-financials/indirect-expenses/${id}`, payload),
  deleteIndirectExpense: (id) => api.delete(`/road-transport/bill-financials/indirect-expenses/${id}`),
}
