import { authService } from "./auth"

export interface SubscriptionPlan {
  id: string
  name: string
  price: number
  interval: "month" | "year"
  features: string[]
  popular?: boolean
  stripePriceId: string
}

export interface Subscription {
  id: string
  status: "active" | "canceled" | "past_due" | "incomplete"
  planId: string
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  stripeSubscriptionId: string
}

export interface PaymentMethod {
  id: string
  type: "card"
  card: {
    brand: string
    last4: string
    expMonth: number
    expYear: number
  }
  isDefault: boolean
}

export interface Invoice {
  id: string
  amount: number
  currency: string
  status: "paid" | "open" | "void" | "uncollectible"
  created: string
  paidAt?: string
  invoiceUrl: string
  planName: string
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1"

class SubscriptionService {
  private async getAuthHeaders() {
    const token = authService.getAccessToken()
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    }
  }

  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    const response = await fetch(`${API_BASE_URL}/payments/plans`)

    if (!response.ok) {
      throw new Error("Failed to fetch subscription plans")
    }

    const result = await response.json()
    return result.plans
  }

  async createCheckoutSession(planId: string): Promise<{ url: string }> {
    const response = await fetch(`${API_BASE_URL}/payments/checkout`, {
      method: "POST",
      headers: await this.getAuthHeaders(),
      body: JSON.stringify({ planId }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Failed to create checkout session")
    }

    return response.json()
  }

  async getCurrentSubscription(): Promise<Subscription | null> {
    const response = await fetch(`${API_BASE_URL}/payments/subscription`, {
      headers: await this.getAuthHeaders(),
    })

    if (!response.ok) {
      if (response.status === 404) {
        return null // No active subscription
      }
      throw new Error("Failed to fetch subscription")
    }

    const result = await response.json()
    return result.subscription
  }

  async cancelSubscription(): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/payments/subscription/cancel`, {
      method: "POST",
      headers: await this.getAuthHeaders(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Failed to cancel subscription")
    }
  }

  async reactivateSubscription(): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/payments/subscription/reactivate`, {
      method: "POST",
      headers: await this.getAuthHeaders(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Failed to reactivate subscription")
    }
  }

  async getPaymentMethods(): Promise<PaymentMethod[]> {
    const response = await fetch(`${API_BASE_URL}/payments/methods`, {
      headers: await this.getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error("Failed to fetch payment methods")
    }

    const result = await response.json()
    return result.paymentMethods
  }

  async getBillingHistory(): Promise<Invoice[]> {
    const response = await fetch(`${API_BASE_URL}/payments/invoices`, {
      headers: await this.getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error("Failed to fetch billing history")
    }

    const result = await response.json()
    return result.invoices
  }

  async updatePaymentMethod(paymentMethodId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/payments/methods/default`, {
      method: "POST",
      headers: await this.getAuthHeaders(),
      body: JSON.stringify({ paymentMethodId }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Failed to update payment method")
    }
  }

  async createPortalSession(): Promise<{ url: string }> {
    const response = await fetch(`${API_BASE_URL}/payments/portal`, {
      method: "POST",
      headers: await this.getAuthHeaders(),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Failed to create portal session")
    }

    return response.json()
  }
}

export const subscriptionService = new SubscriptionService()
