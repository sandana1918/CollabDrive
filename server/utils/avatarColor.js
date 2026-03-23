const hashSeed = (seed = "") => {
  let hash = 7;
  for (const char of String(seed)) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash;
};

export const generateAvatarColor = (seed = "user") => {
  const hash = hashSeed(seed);
  const hue = hash % 360;
  const saturation = 60 + (hash % 12);
  const lightness = 44 + ((hash >> 3) % 10);
  return `hsl(${hue} ${saturation}% ${lightness}%)`;
};

export const buildAvatarSeed = (userLike = {}) => [userLike._id, userLike.username, userLike.email].filter(Boolean).join(":");
