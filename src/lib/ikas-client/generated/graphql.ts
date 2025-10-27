import { BaseGraphQLAPIClient, BaseGraphQLAPIClientOptions, APIResult } from '@ikas/admin-api-client';

export enum OrderPackageStatusEnum {
  CANCELLED = "CANCELLED",
  CANCEL_REJECTED = "CANCEL_REJECTED",
  CANCEL_REQUESTED = "CANCEL_REQUESTED",
  DELIVERED = "DELIVERED",
  FULFILLED = "FULFILLED",
  PARTIALLY_CANCELLED = "PARTIALLY_CANCELLED",
  PARTIALLY_DELIVERED = "PARTIALLY_DELIVERED",
  PARTIALLY_FULFILLED = "PARTIALLY_FULFILLED",
  PARTIALLY_READY_FOR_SHIPMENT = "PARTIALLY_READY_FOR_SHIPMENT",
  PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED",
  PLANNED = "PLANNED",
  READY_FOR_PICK_UP = "READY_FOR_PICK_UP",
  READY_FOR_SHIPMENT = "READY_FOR_SHIPMENT",
  REFUNDED = "REFUNDED",
  REFUND_DELIVERED = "REFUND_DELIVERED",
  REFUND_IN_TRANSIT = "REFUND_IN_TRANSIT",
  REFUND_REJECTED = "REFUND_REJECTED",
  REFUND_REQUESTED = "REFUND_REQUESTED",
  REFUND_REQUEST_ACCEPTED = "REFUND_REQUEST_ACCEPTED",
  UNABLE_TO_DELIVER = "UNABLE_TO_DELIVER",
  UNFULFILLED = "UNFULFILLED"
}

export enum OrderPaymentStatusEnum {
  FAILED = "FAILED",
  OVER_PAID = "OVER_PAID",
  PAID = "PAID",
  PARTIALLY_PAID = "PARTIALLY_PAID",
  REFUNDED = "REFUNDED",
  WAITING = "WAITING"
}

export enum OrderStatusEnum {
  CANCELLED = "CANCELLED",
  CREATED = "CREATED",
  DRAFT = "DRAFT",
  PARTIALLY_CANCELLED = "PARTIALLY_CANCELLED",
  PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED",
  REFUNDED = "REFUNDED",
  REFUND_REJECTED = "REFUND_REJECTED",
  REFUND_REQUESTED = "REFUND_REQUESTED",
  WAITING_UPSELL_ACTION = "WAITING_UPSELL_ACTION"
}

export type DateFilterInput = {
  eq?: number;
  gt?: number;
  gte?: number;
  in?: Array<number>;
  lt?: number;
  lte?: number;
  ne?: number;
  nin?: Array<number>;
}

export type OrderRefundLineInput = {
  orderLineItemId: string;
  price: number;
  quantity: number;
  restockItems: boolean;
}

export type OrderRefundTransactionInput = {
  amount: number;
  refundToStoreCredit?: boolean;
  transactionId: string;
}

export type PaginationInput = {
  limit?: number;
  page?: number;
}

export type PublicOrderRefundBranchInfoInput = {
  branchSessionId: string;
  terminalId: string;
}

export type PublicOrderRefundInput = {
  branchInfo?: PublicOrderRefundBranchInfoInput;
  forceRefund?: boolean;
  orderId: string;
  orderRefundLines: Array<OrderRefundLineInput>;
  orderRefundTransactions?: Array<OrderRefundTransactionInput>;
  reason?: string;
  refundGift?: boolean;
  refundShipping?: boolean;
  sendNotificationToCustomer?: boolean;
  stockLocationId?: string;
}

export type StringFilterInput = {
  eq?: string;
  in?: Array<string>;
  ne?: string;
  nin?: Array<string>;
}

export type GetMerchantQueryVariables = {}

export type GetMerchantQueryData = {
  id: string;
  email: string;
  storeName?: string;
}

export interface GetMerchantQuery {
  getMerchant: GetMerchantQueryData;
}

export type GetAuthorizedAppQueryVariables = {}

export type GetAuthorizedAppQueryData = {
  id: string;
  salesChannelId?: string;
}

export interface GetAuthorizedAppQuery {
  getAuthorizedApp: GetAuthorizedAppQueryData;
}

export type ListOrderQueryVariables = {
  pagination?: PaginationInput;
  sort?: string;
  search?: string;
  orderNumber?: StringFilterInput;
}

export type ListOrderQueryData = {
  data: Array<{
  id: string;
  orderNumber?: string;
  status: OrderStatusEnum;
  orderPaymentStatus?: OrderPaymentStatusEnum;
  orderPackageStatus?: OrderPackageStatusEnum;
  totalFinalPrice: number;
  currencyCode: string;
  currencySymbol?: string;
  orderedAt?: number;
  customer?: {
  id?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
};
  orderLineItems: Array<{
  id: string;
  quantity: number;
  finalPrice?: number;
  status: OrderLineItemStatusEnum;
  variant: {
  id?: string;
  name: string;
  sku?: string;
  productId?: string;
};
}>;
  shippingAddress?: {
  id?: string;
  firstName: string;
  lastName: string;
  addressLine1: string;
  addressLine2?: string;
  city: {
  id?: string;
  name: string;
};
  district?: {
  id?: string;
  name?: string;
};
  phone?: string;
};
  orderPackages?: Array<{
  id: string;
  orderPackageNumber: string;
  trackingInfo?: {
  trackingNumber?: string;
  trackingLink?: string;
};
}>;
}>;
}

export interface ListOrderQuery {
  listOrder: ListOrderQueryData;
}

export type ListRefundOrdersQueryVariables = {
  pagination?: PaginationInput;
  orderedAt?: DateFilterInput;
}

export type ListRefundOrdersQueryData = {
  data: Array<{
  id: string;
  orderNumber?: string;
  status: OrderStatusEnum;
  orderPaymentStatus?: OrderPaymentStatusEnum;
  orderPackageStatus?: OrderPackageStatusEnum;
  totalFinalPrice: number;
  totalPrice: number;
  currencyCode: string;
  currencySymbol?: string;
  orderedAt?: number;
  note?: string;
  customer?: {
  id?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
};
  orderLineItems: Array<{
  id: string;
  quantity: number;
  finalPrice?: number;
  status: OrderLineItemStatusEnum;
  variant: {
  id?: string;
  name: string;
  sku?: string;
  productId?: string;
};
}>;
  shippingAddress?: {
  id?: string;
  firstName: string;
  lastName: string;
  addressLine1: string;
  addressLine2?: string;
  city: {
  id?: string;
  name: string;
};
  district?: {
  id?: string;
  name?: string;
};
  phone?: string;
};
  orderPackages?: Array<{
  id: string;
  orderPackageNumber: string;
  orderPackageFulfillStatus: OrderPackageFulfillStatusEnum;
  trackingInfo?: {
  trackingNumber?: string;
  trackingLink?: string;
};
}>;
}>;
}

export interface ListRefundOrdersQuery {
  listOrder: ListRefundOrdersQueryData;
}

export type ListOrderDetailQueryVariables = {
  id?: StringFilterInput;
}

export type ListOrderDetailQueryData = {
  data: Array<{
  id: string;
  orderNumber?: string;
  status: OrderStatusEnum;
  orderPaymentStatus?: OrderPaymentStatusEnum;
  orderPackageStatus?: OrderPackageStatusEnum;
  totalFinalPrice: number;
  totalPrice: number;
  currencyCode: string;
  currencySymbol?: string;
  orderedAt?: number;
  note?: string;
  customer?: {
  id?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
};
  orderLineItems: Array<{
  id: string;
  quantity: number;
  finalPrice?: number;
  finalUnitPrice?: number;
  price: number;
  unitPrice?: number;
  status: OrderLineItemStatusEnum;
  variant: {
  id?: string;
  name: string;
  sku?: string;
  productId?: string;
};
}>;
  shippingAddress?: {
  id?: string;
  firstName: string;
  lastName: string;
  addressLine1: string;
  addressLine2?: string;
  city: {
  id?: string;
  name: string;
};
  district?: {
  id?: string;
  name?: string;
};
  country: {
  id?: string;
  name: string;
};
  phone?: string;
  postalCode?: string;
};
  billingAddress?: {
  id?: string;
  firstName: string;
  lastName: string;
  addressLine1: string;
  addressLine2?: string;
  city: {
  id?: string;
  name: string;
};
  district?: {
  id?: string;
  name?: string;
};
  country: {
  id?: string;
  name: string;
};
  phone?: string;
  postalCode?: string;
};
  orderPackages?: Array<{
  id: string;
  orderPackageNumber: string;
  orderPackageFulfillStatus: OrderPackageFulfillStatusEnum;
  trackingInfo?: {
  trackingNumber?: string;
  trackingLink?: string;
};
}>;
}>;
}

export interface ListOrderDetailQuery {
  listOrder: ListOrderDetailQueryData;
}

export type RefundOrderLineMutationVariables = {
  input: PublicOrderRefundInput;
}

export type RefundOrderLineMutationData = {
  id: string;
  orderNumber?: string;
  status: OrderStatusEnum;
  orderPaymentStatus?: OrderPaymentStatusEnum;
  orderPackageStatus?: OrderPackageStatusEnum;
  totalFinalPrice: number;
  totalPrice: number;
  currencyCode: string;
  currencySymbol?: string;
  orderedAt?: number;
  customer?: {
  id?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
};
  orderLineItems: Array<{
  id: string;
  quantity: number;
  finalPrice?: number;
  status: OrderLineItemStatusEnum;
  variant: {
  id?: string;
  name: string;
  sku?: string;
};
}>;
}

export interface RefundOrderLineMutation {
  refundOrderLine: RefundOrderLineMutationData;
}

export class GeneratedQueries {
  client: BaseGraphQLAPIClient<any>;

  constructor(client: BaseGraphQLAPIClient<any>) {
    this.client = client;
  }

  async getMerchant(): Promise<APIResult<Partial<GetMerchantQuery>>> {
    const query = `
  query getMerchant {
    getMerchant {
      id
      email
      storeName
    }
  }
`;
    return this.client.query<Partial<GetMerchantQuery>>({ query });
  }

  async getAuthorizedApp(): Promise<APIResult<Partial<GetAuthorizedAppQuery>>> {
    const query = `
  query getAuthorizedApp {
    getAuthorizedApp {
      id
      salesChannelId
    }
  }
`;
    return this.client.query<Partial<GetAuthorizedAppQuery>>({ query });
  }

  async listOrder(variables: ListOrderQueryVariables): Promise<APIResult<Partial<ListOrderQuery>>> {
    const query = `
  query listOrder($pagination: PaginationInput, $sort: String, $search: String, $orderNumber: StringFilterInput) {
    listOrder(pagination: $pagination, sort: $sort, search: $search, orderNumber: $orderNumber) {
      data {
        id
        orderNumber
        status
        orderPaymentStatus
        orderPackageStatus
        totalFinalPrice
        currencyCode
        currencySymbol
        orderedAt
        customer {
          id
          email
          firstName
          lastName
          phone
        }
        orderLineItems {
          id
          quantity
          finalPrice
          status
          variant {
            id
            name
            sku
            productId
          }
        }
        shippingAddress {
          id
          firstName
          lastName
          addressLine1
          addressLine2
          city {
            id
            name
          }
          district {
            id
            name
          }
          phone
        }
        orderPackages {
          id
          orderPackageNumber
          trackingInfo {
            trackingNumber
            trackingLink
          }
        }
      }
    }
  }
`;
    return this.client.query<Partial<ListOrderQuery>>({ query, variables });
  }

  async listRefundOrders(variables: ListRefundOrdersQueryVariables): Promise<APIResult<Partial<ListRefundOrdersQuery>>> {
    const query = `
  query listRefundOrders($pagination: PaginationInput, $orderedAt: DateFilterInput) {
    listOrder(
      pagination: $pagination
      orderedAt: $orderedAt
      orderPackageStatus: { in: [REFUND_REQUESTED, REFUNDED, REFUND_DELIVERED] }
      sort: "-orderedAt"
    ) {
      data {
        id
        orderNumber
        status
        orderPaymentStatus
        orderPackageStatus
        totalFinalPrice
        totalPrice
        currencyCode
        currencySymbol
        orderedAt
        note
        customer {
          id
          email
          firstName
          lastName
          phone
        }
        orderLineItems {
          id
          quantity
          finalPrice
          status
          variant {
            id
            name
            sku
            productId
          }
        }
        shippingAddress {
          id
          firstName
          lastName
          addressLine1
          addressLine2
          city {
            id
            name
          }
          district {
            id
            name
          }
          phone
        }
        orderPackages {
          id
          orderPackageNumber
          orderPackageFulfillStatus
          trackingInfo {
            trackingNumber
            trackingLink
          }
        }
      }
    }
  }
`;
    return this.client.query<Partial<ListRefundOrdersQuery>>({ query, variables });
  }

  async listOrderDetail(variables: ListOrderDetailQueryVariables): Promise<APIResult<Partial<ListOrderDetailQuery>>> {
    const query = `
  query listOrderDetail($id: StringFilterInput) {
    listOrder(id: $id) {
      data {
        id
        orderNumber
        status
        orderPaymentStatus
        orderPackageStatus
        totalFinalPrice
        totalPrice
        currencyCode
        currencySymbol
        orderedAt
        note
        customer {
          id
          email
          firstName
          lastName
          phone
        }
        orderLineItems {
          id
          quantity
          finalPrice
          finalUnitPrice
          price
          unitPrice
          status
          variant {
            id
            name
            sku
            productId
          }
        }
        shippingAddress {
          id
          firstName
          lastName
          addressLine1
          addressLine2
          city {
            id
            name
          }
          district {
            id
            name
          }
          country {
            id
            name
          }
          phone
          postalCode
        }
        billingAddress {
          id
          firstName
          lastName
          addressLine1
          addressLine2
          city {
            id
            name
          }
          district {
            id
            name
          }
          country {
            id
            name
          }
          phone
          postalCode
        }
        orderPackages {
          id
          orderPackageNumber
          orderPackageFulfillStatus
          trackingInfo {
            trackingNumber
            trackingLink
          }
        }
      }
    }
  }
`;
    return this.client.query<Partial<ListOrderDetailQuery>>({ query, variables });
  }
}

export class GeneratedMutations {
  client: BaseGraphQLAPIClient<any>;

  constructor(client: BaseGraphQLAPIClient<any>) {
    this.client = client;
  }

  async refundOrderLine(variables: RefundOrderLineMutationVariables): Promise<APIResult<Partial<RefundOrderLineMutation>>> {
    const mutation = `
  mutation refundOrderLine($input: PublicOrderRefundInput!) {
    refundOrderLine(input: $input) {
      id
      orderNumber
      status
      orderPaymentStatus
      orderPackageStatus
      totalFinalPrice
      totalPrice
      currencyCode
      currencySymbol
      orderedAt
      customer {
        id
        email
        firstName
        lastName
      }
      orderLineItems {
        id
        quantity
        finalPrice
        status
        variant {
          id
          name
          sku
        }
      }
    }
  }
`;
    return this.client.mutate<Partial<RefundOrderLineMutation>>({ mutation, variables });
  }
}

export class ikasAdminGraphQLAPIClient<TokenData> extends BaseGraphQLAPIClient<TokenData> {
  queries: GeneratedQueries;
  mutations: GeneratedMutations;

  constructor(options: BaseGraphQLAPIClientOptions<TokenData>) {
    super(options);
    this.queries = new GeneratedQueries(this);
    this.mutations = new GeneratedMutations(this);
  }
}
