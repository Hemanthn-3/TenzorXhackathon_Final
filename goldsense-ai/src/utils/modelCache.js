const cache = {};

export const getCachedModel = async (key, loaderFn) => {
  if (cache[key]) return cache[key];
  console.log(`Loading model: ${key}...`);
  cache[key] = await loaderFn();
  console.log(`Model loaded: ${key}`);
  return cache[key];
};

export const clearModelCache = () => {
  Object.keys(cache).forEach(k => delete cache[k]);
};

export const isCacheEmpty = () => Object.keys(cache).length === 0;
