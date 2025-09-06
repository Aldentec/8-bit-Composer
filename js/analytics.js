// Add to js/analytics.js
const ANALYTICS_API = 'https://l000zuq7fh.execute-api.us-west-2.amazonaws.com/prod';

export async function trackActivity(activityType, metadata = {}) {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    
    try {
        await fetch(`${ANALYTICS_API}/track`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                activityType,
                metadata
            })
        });
    } catch (error) {
        console.error('Failed to track activity:', error);
    }
}