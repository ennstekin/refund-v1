import axios from 'axios';
import { GetMerchantApiResponse } from '../app/api/ikas/get-merchant/route';
import { ApiResponseType } from '../globals/constants';
import { buildApiUrl } from './api-base-url';

export async function makePostRequest<T>({ url, data, token }: { url: string; data?: any; token?: string }) {
  return axios.post<ApiResponseType<T>>(buildApiUrl(url), data, {
    headers: token
      ? {
          Authorization: `JWT ${token}`,
        }
      : undefined,
  });
}

export async function makeGetRequest<T>({ url, data, token }: { url: string; data?: any; token?: string }) {
  return axios.get<ApiResponseType<T>>(buildApiUrl(url), {
    params: data,
    headers: token
      ? {
          Authorization: `JWT ${token}`,
        }
      : undefined,
  });
}

export async function makePatchRequest<T>({ url, data, token }: { url: string; data?: any; token?: string }) {
  return axios.patch<ApiResponseType<T>>(buildApiUrl(url), data, {
    headers: token
      ? {
          Authorization: `JWT ${token}`,
        }
      : undefined,
  });
}

// API requests object - frontend-backend bridge
export const ApiRequests = {
  ikas: {
    getMerchant: (token: string) => makeGetRequest<GetMerchantApiResponse>({ url: '/api/ikas/get-merchant', token }),
    getRefundOrders: (token: string) => makeGetRequest({ url: '/api/ikas/refund-orders', token }),
    getOrders: (token: string, search?: string) => makeGetRequest({ url: '/api/ikas/orders', token, data: { search, limit: 20 } }),
  },
  refunds: {
    list: (token: string) => makeGetRequest({ url: '/api/refunds', token }),
    get: (token: string, id: string) => makeGetRequest({ url: `/api/refunds/${id}`, token }),
    create: (token: string, data: { orderId: string; orderNumber: string; status?: string; trackingNumber?: string; reason?: string; reasonNote?: string }) =>
      makePostRequest({ url: '/api/refunds', token, data }),
    createFromOrder: (token: string, data: { orderId: string; orderNumber: string }) =>
      makePostRequest({ url: '/api/refunds/create-from-order', token, data }),
    update: (token: string, id: string, data: { status?: string; trackingNumber?: string; reason?: string; reasonNote?: string }) =>
      makePatchRequest({ url: `/api/refunds/${id}`, token, data }),
    addNote: (token: string, id: string, data: { content: string; createdBy: string }) =>
      makePostRequest({ url: `/api/refunds/${id}/notes`, token, data }),
    getNotes: (token: string, id: string) => makeGetRequest({ url: `/api/refunds/${id}/notes`, token }),
    getTimeline: (token: string, id: string) => makeGetRequest({ url: `/api/refunds/${id}/timeline`, token }),
    approve: (token: string, id: string, data: { refundShipping?: boolean; sendNotificationToCustomer?: boolean; restockItems?: boolean; reason?: string }) =>
      makePostRequest({ url: `/api/refunds/${id}/approve`, token, data }),
  },
  timeline: {
    getRecent: (token: string) => makeGetRequest({ url: '/api/timeline', token }),
  },
};
