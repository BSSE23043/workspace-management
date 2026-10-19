// Turns a stored timestamp into a short "x ago" label for broadcasts and
// clarification replies, e.g. "Just now", "12m ago", "3h ago", or a readable
// date once the entry is more than a day old.
//
// Returns an empty string when there is no timestamp at all (entries saved
// before timestamps were stored), so callers can render the value directly:
// an empty <Text> simply shows nothing instead of a misleading label.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const timeAgo = (createdAt) => {
  if (!createdAt) return '';

  const minutes = Math.floor((Date.now() - createdAt) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const posted = new Date(createdAt);
  const minutePad = posted.getMinutes() < 10 ? `0${posted.getMinutes()}` : `${posted.getMinutes()}`;
  return `${posted.getDate()} ${MONTHS[posted.getMonth()]}, ${posted.getHours()}:${minutePad}`;
};

export default timeAgo;
