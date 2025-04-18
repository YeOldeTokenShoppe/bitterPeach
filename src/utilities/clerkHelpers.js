/**
 * Helper functions for handling Clerk user data
 */

/**
 * Gets the best available image URL from a Clerk user object
 * @param {Object} user - The Clerk user object
 * @param {string} defaultImage - Optional default image path
 * @returns {string} The best available image URL
 */
export const getUserImageUrl = (user, defaultImage = './defaultAvatar.png') => {
  if (!user) return defaultImage;
  
  // Debug user object structure
  console.log("[getUserImageUrl] Analyzing user data for image:", {
    hasExternalAccounts: !!user.externalAccounts,
    numExternalAccounts: user.externalAccounts?.length || 0,
    discordAccount: user.externalAccounts?.find(acc => acc.provider === 'discord'),
    userImageUrl: user.imageUrl
  });
  
  // Check for provider-specific images (Discord, etc.)
  if (user.externalAccounts?.length > 0) {
    // Look specifically for Discord first
    const discordAccount = user.externalAccounts.find(
      acc => acc.provider === 'discord' && acc.imageUrl
    );
    
    if (discordAccount?.imageUrl) {
      console.log("[getUserImageUrl] Using Discord image:", discordAccount.imageUrl);
      return discordAccount.imageUrl;
    }
    
    // Then look for other providers
    const providers = ['google', 'github', 'facebook'];
    
    for (const provider of providers) {
      const account = user.externalAccounts.find(
        acc => acc.provider === provider && acc.imageUrl
      );
      
      if (account?.imageUrl) {
        console.log(`[getUserImageUrl] Using ${provider} image:`, account.imageUrl);
        return account.imageUrl;
      }
    }
    
    // If no specific provider found but we have any account with an image
    const anyAccountWithImage = user.externalAccounts.find(acc => acc.imageUrl);
    if (anyAccountWithImage?.imageUrl) {
      console.log("[getUserImageUrl] Using generic external account image:", anyAccountWithImage.imageUrl);
      return anyAccountWithImage.imageUrl;
    }
  }
  
  // Try standard Clerk imageUrl
  if (user.imageUrl) {
    console.log("[getUserImageUrl] Using standard Clerk imageUrl:", user.imageUrl);
    return user.imageUrl;
  }
  
  // Final fallback
  console.log("[getUserImageUrl] Using default image:", defaultImage);
  return defaultImage;
};

/**
 * Gets the best available username from a Clerk user object
 * @param {Object} user - The Clerk user object
 * @param {string} defaultName - Default name if no name is available
 * @returns {string} The best available username
 */
export const getUsername = (user, defaultName = 'Anonymous') => {
  if (!user) return defaultName;
  
  // Debug username options
  console.log("[getUsername] Username options:", {
    username: user.username,
    firstName: user.firstName,
    fullName: user.fullName,
    discordUsername: user.externalAccounts?.find(acc => acc.provider === 'discord')?.username
  });
  
  // Check for Discord username first
  const discordAccount = user.externalAccounts?.find(acc => acc.provider === 'discord');
  if (discordAccount?.username) {
    return discordAccount.username;
  }
  
  return user.username || 
         user.firstName || 
         (user.fullName && user.fullName !== ' ' ? user.fullName : null) || 
         user.emailAddresses?.[0]?.emailAddress || 
         defaultName;
};

/**
 * Creates a standardized user data object from Clerk user
 * @param {Object} user - The Clerk user object
 * @returns {Object} Standardized user data
 */
export const createUserData = (user) => {
  if (!user) return null;
  
  // Find Discord account if available
  const discordAccount = user.externalAccounts?.find(acc => acc.provider === 'discord');
  
  const userData = {
    userId: user.id,
    username: getUsername(user),
    imageUrl: getUserImageUrl(user),
    email: user.emailAddresses?.[0]?.emailAddress || null,
    provider: discordAccount ? 'discord' : (user.externalAccounts?.[0]?.provider || null),
    identifier: user.externalId || user.id
  };
  
  console.log("[createUserData] Created user data:", userData);
  return userData;
}; 