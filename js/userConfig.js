export const USER_API_CONFIG = {
    // Replace with your actual API Gateway URL after deployment
    API_ENDPOINT: 'https://2fro3962h4.execute-api.us-west-2.amazonaws.com/prod/users',
    
    // Optional: Add retry configuration
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000
};

// Helper function to get user info from localStorage
export function getStoredUserProfile() {
    try {
        const profile = localStorage.getItem('userProfile');
        return profile ? JSON.parse(profile) : null;
    } catch (error) {
        console.error('Error parsing stored user profile:', error);
        return null;
    }
}

// Helper function to check if user is a returning user
export function isReturningUser() {
    const profile = getStoredUserProfile();
    return profile && profile.signInCount > 1;
}