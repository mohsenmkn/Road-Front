import api from '@/api/axios'

const resource = '/road-transport/expense-catalog'
export const expenseCategoriesService = {
  list: () => api.get(resource),
  create: (payload) => api.post(resource, payload),
  update: (id, payload) => api.put(`${resource}/${id}`, payload),
  remove: (id) => api.delete(`${resource}/${id}`),
}
