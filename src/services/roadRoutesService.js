import api from '@/api/axios'

export const roadRoutesService = {
  list: () => api.get('/road-transport/routes'),
  update: (id, payload) => api.put(`/road-transport/routes/${id}`, payload),
}
