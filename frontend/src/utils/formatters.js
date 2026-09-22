export const formatDate = (dateString, includeTime = false) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';
  
  const options = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  };
  return date.toLocaleDateString(undefined, options);
};

export const formatScore = (score) => {
  if (score === null || score === undefined) return '0%';
  return `${Math.round(Number(score))}%`;
};

export const formatDuration = (ms) => {
  if (!ms && ms !== 0) return '-';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

export const formatBytes = (bytes) => {
  if (!bytes && bytes !== 0) return '-';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
};

export const getInitials = (name) => {
  if (!name) return 'U';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export const getMasteryColor = (score) => {
  if (score >= 70) return '#10b981'; // emerald
  if (score >= 50) return '#f59e0b'; // amber
  return '#ef4444'; // rose / red
};

export const getMasteryStatus = (score) => {
  if (score >= 70) return { label: 'Good', color: 'success' };
  if (score >= 50) return { label: 'Needs Improvement', color: 'warning' };
  return { label: 'Weak Topic', color: 'error' };
};
