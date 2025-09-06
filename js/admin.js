// js/admin.js
import { trackActivity } from './analytics.js';

const ANALYTICS_API = 'https://l000zuq7fh.execute-api.us-west-2.amazonaws.com/prod';
let currentTimeRange = '24h';
let analyticsData = null;

// Check admin access on load
document.addEventListener('DOMContentLoaded', async () => {
    // Load navbar
    try {
        const navbarRes = await fetch('/navbar.html');
        const navbarHtml = await navbarRes.text();
        document.getElementById('navbar').innerHTML = navbarHtml;
    } catch (error) {
        console.error('Failed to load navbar:', error);
    }

    // Check if user is logged in and is admin
    const token = localStorage.getItem('accessToken');
    
    if (!token) {
        showAccessDenied();
        return;
    }

    // Try to load analytics (will fail if not admin)
    try {
        await loadAnalytics();
        showDashboard();
        setupEventListeners();
        
        // Track admin panel access
        await trackActivity('admin_access');
    } catch (error) {
        console.error('Failed to load analytics:', error);
        if (error.message.includes('403') || error.message.includes('Admin')) {
            showAccessDenied();
        } else {
            showError('Failed to load analytics data');
        }
    }
});

// Setup event listeners
function setupEventListeners() {
    // Time range buttons
    document.querySelectorAll('.time-range-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.time-range-btn').forEach(b => 
                b.classList.remove('tab-active', 'bg-[#0f0]', 'text-black')
            );
            e.target.classList.add('tab-active', 'bg-[#0f0]', 'text-black');
            currentTimeRange = e.target.dataset.range;
            loadAnalytics();
        });
    });

    // Refresh button
    document.getElementById('refresh-btn')?.addEventListener('click', loadAnalytics);

    // Tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabName = e.target.dataset.tab;
            
            // Update button styles
            document.querySelectorAll('.tab-btn').forEach(b => {
                b.classList.remove('tab-active', 'bg-[#0f0]', 'text-black');
                b.classList.add('hover:text-white');
            });
            e.target.classList.add('tab-active', 'bg-[#0f0]', 'text-black');
            e.target.classList.remove('hover:text-white');
            
            // Show/hide panels
            document.querySelectorAll('.tab-panel').forEach(panel => {
                panel.classList.add('hidden');
            });
            document.getElementById(`tab-${tabName}`).classList.remove('hidden');
        });
    });
}

// Load analytics data
async function loadAnalytics() {
    try {
        const token = localStorage.getItem('accessToken');
        
        const response = await fetch(`${ANALYTICS_API}/analytics?timeRange=${currentTimeRange}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            if (response.status === 403) {
                throw new Error('Admin access required');
            }
            throw new Error(`Failed to load analytics: ${response.status}`);
        }

        analyticsData = await response.json();
        updateDashboard();
    } catch (error) {
        console.error('Error loading analytics:', error);
        throw error;
    }
}

// Update dashboard with data
function updateDashboard() {
    if (!analyticsData) return;

    const { summary, topUsers, recentActivities, recentPrompts, users } = analyticsData;

    // Update summary stats
    document.getElementById('stat-total-users').textContent = summary.totalUsers || '0';
    document.getElementById('stat-active-users').textContent = `${summary.activeUsers || '0'}`;
    document.getElementById('stat-ai-generations').textContent = summary.totalAIGenerations || '0';
    document.getElementById('stat-ai-ratio').textContent = summary.aiVsManualRatio || '0';
    document.getElementById('stat-total-credits').textContent = summary.totalCredits || '0';
    document.getElementById('stat-avg-credits').textContent = summary.averageCreditsPerUser || '0';
    document.getElementById('stat-total-compositions').textContent = 
        (summary.totalAIGenerations || 0) + (summary.totalManualCompositions || 0);
    document.getElementById('stat-exports').textContent = summary.totalExports || '0';

    // Update top AI users
    const topAIUsersEl = document.getElementById('top-ai-users');
    if (topUsers?.byAIUsage?.length > 0) {
        topAIUsersEl.innerHTML = topUsers.byAIUsage.map((user, index) => `
            <div class="flex justify-between items-center py-1 border-b border-gray-700">
                <span class="flex items-center gap-2">
                    <span class="text-yellow-400">${index + 1}.</span>
                    <span class="truncate max-w-[200px]">${escapeHtml(user.email)}</span>
                </span>
                <span class="text-[#0f0]">${user.aiGenerateCount} uses</span>
            </div>
        `).join('');
    } else {
        topAIUsersEl.innerHTML = '<div class="text-gray-500">No data available</div>';
    }

    // Update most active users
    const topActiveUsersEl = document.getElementById('top-active-users');
    if (topUsers?.byActivity?.length > 0) {
        topActiveUsersEl.innerHTML = topUsers.byActivity.map((user, index) => `
            <div class="flex justify-between items-center py-1 border-b border-gray-700">
                <span class="flex items-center gap-2">
                    <span class="text-blue-400">${index + 1}.</span>
                    <span class="truncate max-w-[200px]">${escapeHtml(user.email)}</span>
                </span>
                <span class="text-[#0f0]">${user.totalCompositions} total</span>
            </div>
        `).join('');
    } else {
        topActiveUsersEl.innerHTML = '<div class="text-gray-500">No data available</div>';
    }

    // Update low credit users
    const lowCreditUsersEl = document.getElementById('low-credit-users');
    const lowCreditUsers = users?.filter(u => u.credits < 5) || [];
    if (lowCreditUsers.length > 0) {
        lowCreditUsersEl.innerHTML = `
            <div class="text-red-400 mb-2">${summary.usersWithLowCredits || 0} users have less than 5 credits</div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                ${lowCreditUsers.slice(0, 6).map(user => `
                    <div class="border border-red-400 p-2 rounded">
                        <div class="truncate">${escapeHtml(user.email)}</div>
                        <div class="text-red-400">${user.credits} credits remaining</div>
                    </div>
                `).join('')}
            </div>
        `;
    } else {
        lowCreditUsersEl.innerHTML = '<div class="text-green-400">All users have sufficient credits</div>';
    }

    // Update users table
    const usersTableEl = document.getElementById('users-table');
    if (users?.length > 0) {
        usersTableEl.innerHTML = users.map(user => `
            <tr class="hover:bg-gray-800">
                <td class="py-2 truncate max-w-[200px]">${escapeHtml(user.email)}</td>
                <td class="py-2 text-center ${user.credits < 5 ? 'text-red-400' : ''}">${user.credits || 0}</td>
                <td class="py-2 text-center">${user.aiGenerateCount || 0}</td>
                <td class="py-2 text-center">${user.manualComposeCount || 0}</td>
                <td class="py-2 text-center">${user.exportCount || 0}</td>
                <td class="py-2">${formatDate(user.lastActivity)}</td>
            </tr>
        `).join('');
    } else {
        usersTableEl.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-gray-500">No users found</td></tr>';
    }

    // Update prompts list
    const promptsListEl = document.getElementById('prompts-list');
    if (recentPrompts?.length > 0) {
        promptsListEl.innerHTML = recentPrompts.map(item => `
            <div class="border border-gray-700 p-3 rounded">
                <div class="text-gray-400 text-xs mb-1">${formatDate(item.timestamp)}</div>
                <div class="text-[#0f0] mb-2">"${escapeHtml(item.prompt)}"</div>
                <div class="text-gray-500 text-xs">User: ${escapeHtml(item.email || item.userId)}</div>
            </div>
        `).join('');
    } else {
        promptsListEl.innerHTML = '<div class="text-gray-500">No prompts in this time range</div>';
    }

    // Update activity log
    const activityLogEl = document.getElementById('activity-log');
    if (recentActivities?.length > 0) {
        activityLogEl.innerHTML = recentActivities.map(activity => `
            <div class="flex justify-between items-center py-2 border-b border-gray-700">
                <div>
                    <span class="text-[#0f0]">${getActivityIcon(activity.activityType)} ${formatActivityType(activity.activityType)}</span>
                    ${activity.metadata?.prompt ? `<div class="text-gray-400 text-xs mt-1">"${escapeHtml(activity.metadata.prompt.substring(0, 50))}..."</div>` : ''}
                </div>
                <div class="text-xs text-gray-400">${formatDate(activity.timestamp)}</div>
            </div>
        `).join('');
    } else {
        activityLogEl.innerHTML = '<div class="text-gray-500">No recent activity</div>';
    }
}

// Helper functions
function showAccessDenied() {
    document.getElementById('loading-state').classList.add('hidden');
    document.getElementById('access-denied').classList.remove('hidden');
    document.getElementById('analytics-dashboard').classList.add('hidden');
}

function showDashboard() {
    document.getElementById('loading-state').classList.add('hidden');
    document.getElementById('access-denied').classList.add('hidden');
    document.getElementById('analytics-dashboard').classList.remove('hidden');
}

function showError(message) {
    document.getElementById('loading-state').innerHTML = `
        <div class="text-center">
            <div class="text-4xl mb-4">❌</div>
            <p class="text-sm text-red-400">${message}</p>
            <button onclick="location.reload()" class="mt-4 border-2 border-[#0f0] px-4 py-2 text-xs hover:bg-[#0f0] hover:text-black transition">
                Retry
            </button>
        </div>
    `;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    
    return date.toLocaleDateString();
}

function formatActivityType(type) {
    const types = {
        'ai_generate': 'AI Generation',
        'manual_compose': 'Manual Composition',
        'export': 'Export',
        'login': 'Login',
        'admin_access': 'Admin Access'
    };
    return types[type] || type;
}

function getActivityIcon(type) {
    const icons = {
        'ai_generate': '🤖',
        'manual_compose': '🎹',
        'export': '💾',
        'login': '👤',
        'admin_access': '🔐'
    };
    return icons[type] || '📌';
}