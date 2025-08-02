// js/credits.js - Credit management system
export class CreditManager {
  constructor() {
    // Replace with your actual API Gateway URL from the Lambda you created
    this.apiBaseUrl = 'https://xyeqvofyij.execute-api.us-west-2.amazonaws.com/prod';
  }

  // Get current user's credit balance
  async getCredits() {
    const token = localStorage.getItem('accessToken');
    if (!token) throw new Error('Not authenticated');

    try {
      const response = await fetch(`${this.apiBaseUrl}/credits`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch credits');
      }
      const data = await response.json();
      return data.credits;
    } catch (error) {
      console.error('Error fetching credits:', error);
      throw error;
    }
  }

  // Deduct credits for AI generation
  async useCredit(operation = 'generate') {
    const token = localStorage.getItem('accessToken');
    if (!token) throw new Error('Not authenticated');

    try {
      const response = await fetch(`${this.apiBaseUrl}/credits/use`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ operation })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to use credit');
      }

      const data = await response.json();
      return data.remainingCredits;
    } catch (error) {
      console.error('Error using credit:', error);
      throw error;
    }
  }

  // Purchase additional credits
  async purchaseCredits(packageId) {
    const token = localStorage.getItem('accessToken');
    if (!token) throw new Error('Not authenticated');

    try {
      const response = await fetch(`${this.apiBaseUrl}/credits/purchase`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ packageId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to initiate purchase');
      }
      
      const data = await response.json();
      
      // Redirect to Stripe checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
      
      return data;
    } catch (error) {
      console.error('Error purchasing credits:', error);
      throw error;
    }
  }
}

// Credit packages configuration
export const CREDIT_PACKAGES = [
  {
    id: 'starter',
    name: 'Starter Pack',
    credits: 10,
    priceDisplay: '$1.99',
    popular: false
  },
  {
    id: 'creative',
    name: 'Creative Pack', 
    credits: 50,
    priceDisplay: '$7.99',
    popular: true,
    savings: '20%'
  },
  {
    id: 'professional',
    name: 'Professional Pack',
    credits: 100,
    priceDisplay: '$12.99',
    popular: false,
    savings: '35%'
  }
];

// UI Helper functions
export function updateCreditDisplay(credits) {
  const creditDisplay = document.getElementById('credit-display');
  if (creditDisplay) {
    creditDisplay.textContent = `Credits: ${credits}`;
    
    // Add warning styling if low on credits
    if (credits <= 2) {
      creditDisplay.classList.add('text-red-500');
      creditDisplay.classList.remove('text-accent');
    } else {
      creditDisplay.classList.remove('text-red-500');
      creditDisplay.classList.add('text-accent');
    }
  }
}

export function showLowCreditWarning(credits) {
  if (credits <= 0) {
    return 'You have no credits remaining. Purchase more to continue using AI generation.';
  } else if (credits <= 2) {
    return `You have ${credits} credit${credits === 1 ? '' : 's'} remaining. Consider purchasing more soon.`;
  }
  return null;
}

// Integration with existing generate function
export async function checkCreditsBeforeGenerate(creditManager) {
  try {
    const credits = await creditManager.getCredits();
    
    if (credits <= 0) {
      const shouldPurchase = confirm('You have no credits remaining. Would you like to purchase more?');
      if (shouldPurchase) {
        showCreditPurchaseModal();
      }
      return false;
    }

    const warning = showLowCreditWarning(credits);
    if (warning) {
      const proceed = confirm(`${warning}\n\nDo you want to continue and use 1 credit?`);
      if (!proceed) return false;
    }

    return true;
  } catch (error) {
    console.error('Error checking credits:', error);
    alert('Unable to verify credits. Please try again.');
    return false;
  }
}

export function showCreditPurchaseModal() {
  // Remove existing modal if it exists
  const existingModal = document.getElementById('credit-purchase-modal');
  if (existingModal) {
    existingModal.remove();
  }

  // Create and show modal with credit packages
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50';
  modal.id = 'credit-purchase-modal';
  
  modal.innerHTML = `
    <div class="bg-control border-4 border-accent text-fg font-pixel p-6 rounded-lg w-[90%] max-w-lg relative shadow-lg">
      <button id="close-credit-modal" class="absolute top-3 right-4 text-fg text-xl hover:text-accent">&times;</button>
      
      <h2 class="text-base tracking-wide mb-4 text-center">💳 Purchase Credits</h2>
      
      <div class="space-y-3">
        ${CREDIT_PACKAGES.map(pkg => `
          <div class="border-2 border-cell-border p-3 ${pkg.popular ? 'border-accent bg-opacity-20 bg-accent' : ''}">
            ${pkg.popular ? '<div class="text-accent text-xs mb-1 font-bold">⭐ MOST POPULAR</div>' : ''}
            <div class="flex justify-between items-center">
              <div>
                <div class="text-sm font-bold">${pkg.name}</div>
                <div class="text-xs opacity-75">${pkg.credits} credits</div>
                ${pkg.savings ? `<div class="text-xs text-accent">Save ${pkg.savings}!</div>` : ''}
              </div>
              <button class="purchase-btn bg-accent text-bg px-3 py-1 text-xs hover:bg-fg transition-colors" data-package="${pkg.id}">
                ${pkg.priceDisplay}
              </button>
            </div>
          </div>
        `).join('')}
      </div>
      
      <div class="text-xs mt-4 text-center opacity-75">
        🔒 Secure payment powered by Stripe
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Add event listeners
  document.getElementById('close-credit-modal').addEventListener('click', () => {
    modal.remove();
  });
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
  
  // Handle purchase buttons
  modal.querySelectorAll('.purchase-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const packageId = btn.dataset.package;
      const creditManager = new CreditManager();
      
      try {
        const originalText = btn.textContent;
        btn.textContent = 'Processing...';
        btn.disabled = true;
        
        await creditManager.purchaseCredits(packageId);
        // The page will redirect to Stripe, so this won't execute
        
      } catch (error) {
        console.error('Purchase error:', error);
        alert(`Purchase failed: ${error.message}`);
        btn.textContent = btn.dataset.originalText || 'Purchase';
        btn.disabled = false;
      }
    });
  });
}