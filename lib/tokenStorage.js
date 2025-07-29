const tokenStorage = new Map();

export const setUserTokens = (userId, tokens) => {
  tokenStorage.set(userId, {
    ...tokens,
    timestamp: Date.now()
  });
};

export const getUserTokens = (userId) => {
  const tokens = tokenStorage.get(userId);
  if (!tokens) return null;
  
  const tokenAge = Date.now() - tokens.timestamp;
  const oneHour = 60 * 60 * 1000;
  
  if (tokenAge > oneHour) {
    tokenStorage.delete(userId);
    return null;
  }
  
  return tokens;
};

export const removeUserTokens = (userId) => {
  tokenStorage.delete(userId);
};
