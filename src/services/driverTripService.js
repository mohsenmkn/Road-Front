import axios from 'axios'

const baseURL = (import.meta.env.VITE_API_BASE_URL || '/Back/v1').replace(/\/$/, '')
const driverApi = axios.create({ baseURL, headers: { Accept: 'application/json' } })

export const driverTripService = {
  requestOtp: (bill_number) => driverApi.post('/road-transport/driver/request-otp', { bill_number }),
  verifyOtp: (bill_number, otp) => driverApi.post('/road-transport/driver/verify-otp', { bill_number, otp }),
  current: (token) => driverApi.get('/road-transport/driver/current-trip', { headers: { Authorization: `Bearer ${token}` } }),
  categories: (token) => driverApi.get('/road-transport/driver/expense-categories', { headers: { Authorization: `Bearer ${token}` } }),
  expenses: (token) => driverApi.get('/road-transport/driver/expenses', { headers: { Authorization: `Bearer ${token}` } }),
  start: (token, photo) => {
    const body = new FormData()
    body.append('odometer_photo', photo)
    return driverApi.post('/road-transport/driver/start-trip', body, { headers: { Authorization: `Bearer ${token}` } })
  },
  expense: (token, payload) => driverApi.post('/road-transport/driver/expenses', payload, { headers: { Authorization: `Bearer ${token}` } }),
}
