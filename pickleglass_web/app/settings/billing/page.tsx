'use client'

import { useState } from 'react'
import { useRedirectIfNotAuth } from '@/utils/auth'
import { Check, CreditCard, Download, AlertTriangle } from 'lucide-react'

export default function BillingPage() {
  const userInfo = useRedirectIfNotAuth()
  const [activePlan, setActivePlan] = useState('free')
  const [showBillingForm, setShowBillingForm] = useState(false)

  if (!userInfo) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'profile', name: 'Personal profile', href: '/settings' },
    { id: 'privacy', name: 'Data & privacy', href: '/settings/privacy' },
    { id: 'billing', name: 'Billing', href: '/settings/billing' },
  ]

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: '$0',
      description: 'Perfect for trying out the platform',
      features: [
        '10 active sessions per day',
        'Basic meeting analysis',
        'Standard response time',
        'Community support',
      ],
      cta: 'Current Plan',
      disabled: true,
      highlighted: false
    },
    {
      id: 'pro',
      name: 'Professional',
      price: '$12',
      period: '/month',
      description: 'Enhanced features for power users',
      features: [
        'Unlimited active sessions',
        'Advanced meeting analytics',
        'Priority response time',
        'Email support',
        'Custom presets',
      ],
      cta: 'Upgrade',
      disabled: false,
      highlighted: true
    },
    {
      id: 'team',
      name: 'Team',
      price: '$49',
      period: '/month',
      description: 'For teams that need more',
      features: [
        'Everything in Professional',
        'Team collaboration',
        'Shared meeting history',
        'Admin controls',
        'Priority support',
        'Custom onboarding',
      ],
      cta: 'Contact Sales',
      disabled: false,
      highlighted: false
    }
  ]

  const paymentHistory = [
    {
      id: 'INV-2025-0712',
      date: 'July 12, 2025',
      amount: '$12.00',
      status: 'Paid'
    },
    {
      id: 'INV-2025-0612',
      date: 'June 12, 2025',
      amount: '$12.00',
      status: 'Paid'
    },
    
  ]

  const handleUpgrade = (planId: string) => {
    if (planId === 'team') {
      window.open('mailto:sales@pickleglass.ai?subject=Team%20Plan%20Inquiry', '_blank')
      return
    }
    setShowBillingForm(true)
  }

  return (
    <div className="bg-stone-50 min-h-screen">
      <div className="px-8 py-8">
        <div className="mb-6">
          <p className="text-xs text-gray-500 mb-1">Settings</p>
          <h1 className="text-3xl font-bold text-gray-900">Personal settings</h1>
        </div>
        
        <div className="mb-8">
          <nav className="flex space-x-10">
            {tabs.map((tab) => (
              <a
                key={tab.id}
                href={tab.href}
                className={`pb-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  tab.id === 'billing'
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name}
              </a>
            ))}
          </nav>
        </div>

        {/* Current Plan */}
        <div className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Subscription</h2>
          <div className="bg-white border border-gray-200 rounded-lg p-6 flex flex-wrap justify-between items-center">
            <div>
              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                Active
              </span>
              <h3 className="text-lg font-medium text-gray-900 mt-2">Free Plan</h3>
              <p className="text-gray-500 text-sm mt-1">Your account is currently on the Free tier.</p>
            </div>
            <div className="mt-4 sm:mt-0">
              <p className="text-sm text-gray-500 mb-2">
                <span className="font-semibold">Next billing date:</span> N/A
              </p>
              <button
                onClick={() => setShowBillingForm(true)}
                className="text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                Upgrade your plan
              </button>
            </div>
          </div>
        </div>

        {/* Usage Stats */}
        <div className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Usage This Month</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900">Sessions</h3>
              <div className="mt-2 flex items-end">
                <span className="text-3xl font-bold text-gray-900">7</span>
                <span className="text-sm text-gray-500 ml-2">/ 10 per day</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4">
                <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '70%' }}></div>
              </div>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900">Storage</h3>
              <div className="mt-2 flex items-end">
                <span className="text-3xl font-bold text-gray-900">143 MB</span>
                <span className="text-sm text-gray-500 ml-2">/ 250 MB</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4">
                <div className="bg-green-500 h-2.5 rounded-full" style={{ width: '57%' }}></div>
              </div>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900">API Requests</h3>
              <div className="mt-2 flex items-end">
                <span className="text-3xl font-bold text-gray-900">512</span>
                <span className="text-sm text-gray-500 ml-2">/ 1,000</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4">
                <div className="bg-purple-500 h-2.5 rounded-full" style={{ width: '51%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Subscription Plans */}
        <div className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Available Plans</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div 
                key={plan.id}
                className={`bg-white rounded-xl border ${
                  plan.highlighted 
                    ? 'border-blue-500 shadow-lg shadow-blue-100' 
                    : 'border-gray-200'
                } overflow-hidden`}
              >
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                  <div className="mt-2 flex items-baseline">
                    <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                    {plan.period && <span className="text-gray-500 ml-1">{plan.period}</span>}
                  </div>
                  <p className="mt-4 text-gray-500 text-sm">{plan.description}</p>
                </div>
                <div className="border-t border-gray-100 px-6 py-4">
                  <ul className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start">
                        <Check className="h-5 w-5 text-green-500 flex-shrink-0 mr-2" />
                        <span className="text-gray-600 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="border-t border-gray-100 p-6">
                  <button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={plan.disabled}
                    className={`w-full py-2 px-4 rounded-md text-sm font-medium ${
                      plan.highlighted
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : plan.disabled
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                    }`}
                  >
                    {plan.cta}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment History */}
        <div className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Payment History</h2>
          <div className="overflow-hidden border border-gray-200 sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Download
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paymentHistory.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{payment.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {payment.date}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {payment.amount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {payment.status}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-gray-400 hover:text-gray-500" disabled>
                        <Download className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Billing Information */}
        <div className="mb-10">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Billing Information</h2>
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CreditCard className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-4">
                  <div className="text-sm font-medium text-gray-900">No payment method on file</div>
                  <div className="text-sm text-gray-500">Add a payment method to upgrade your plan</div>
                </div>
              </div>
              <div>
                <button
                  onClick={() => setShowBillingForm(true)}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                >
                  Update
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Cancellation */}
        <div>
          <div className="bg-red-50 border border-red-100 rounded-lg p-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Cancel Subscription</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>You can cancel your subscription at any time. Your account will be downgraded to the Free plan at the end of your current billing period.</p>
                </div>
                <div className="mt-4">
                  <button
                    type="button"
                    disabled
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 opacity-50 cursor-not-allowed"
                  >
                    Cancel Subscription
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Billing Modal */}
        {showBillingForm && (
          <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">Add Payment Method</h3>
                <button
                  onClick={() => setShowBillingForm(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form className="space-y-4">
                <div>
                  <label htmlFor="card-number" className="block text-sm font-medium text-gray-700">Card Number</label>
                  <input
                    type="text"
                    id="card-number"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="1234 5678 9012 3456"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="expiration" className="block text-sm font-medium text-gray-700">Expiration</label>
                    <input
                      type="text"
                      id="expiration"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="MM/YY"
                    />
                  </div>
                  <div>
                    <label htmlFor="cvc" className="block text-sm font-medium text-gray-700">CVC</label>
                    <input
                      type="text"
                      id="cvc"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="123"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name on Card</label>
                  <input
                    type="text"
                    id="name"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label htmlFor="country" className="block text-sm font-medium text-gray-700">Country</label>
                  <select
                    id="country"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option>United States</option>
                    <option>Canada</option>
                    <option>United Kingdom</option>
                    <option>Australia</option>
                  </select>
                </div>
                <div className="flex items-center">
                  <input
                    id="terms"
                    name="terms"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="terms" className="ml-2 block text-sm text-gray-900">
                    I agree to the <a href="#" className="text-blue-600 hover:text-blue-500">Terms of Service</a> and <a href="#" className="text-blue-600 hover:text-blue-500">Privacy Policy</a>
                  </label>
                </div>
                <div className="mt-5">
                  <button
                    type="button"
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    onClick={() => setShowBillingForm(false)}
                  >
                    Subscribe to Professional Plan
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
