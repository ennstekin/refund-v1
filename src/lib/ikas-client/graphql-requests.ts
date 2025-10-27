import { gql } from 'graphql-request';

export const GET_MERCHANT = gql`
  query getMerchant {
    getMerchant {
      id
      email
      storeName
    }
  }
`;

export const GET_AUTHORIZED_APP = gql`
  query getAuthorizedApp {
    getAuthorizedApp {
      id
      salesChannelId
    }
  }
`;

export const LIST_ORDERS = gql`
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

export const LIST_REFUND_ORDERS = gql`
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

export const GET_ORDER_DETAIL = gql`
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

export const REFUND_ORDER_LINE = gql`
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
