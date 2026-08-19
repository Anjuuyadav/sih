export const getRecordId = (record, keys = []) => {
  for (const key of keys) {
    if (record?.[key] !== undefined && record?.[key] !== null) {
      return record[key];
    }
  }
  return undefined;
};

export const formatCurrency = (value) => {
  const number = Number(value || 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(number);
};

export const formatDuration = (days, minutes) => {
  const parts = [];
  const parsedDays = Number(days || 0);
  const parsedMinutes = Number(minutes || 0);

  if (parsedDays > 0) {
    parts.push(`${parsedDays} day${parsedDays === 1 ? '' : 's'}`);
  }

  if (parsedMinutes > 0) {
    parts.push(`${parsedMinutes} min`);
  }

  return parts.length > 0 ? parts.join(' / ') : '-';
};

export const getStatusMeta = (value) => {
  const normalized = typeof value === 'boolean' ? value : String(value ?? '').toLowerCase();

  if (normalized === true || normalized === 'active' || normalized === '1' || normalized === 1) {
    return { label: 'Active', className: 'status-active' };
  }

  if (normalized === 'pending') {
    return { label: 'Pending', className: 'status-warning' };
  }

  return { label: 'Inactive', className: 'status-inactive' };
};

export const formatTime = (value) => {
  if (!value) {
    return '-';
  }

  const [hours, minutes] = String(value).split(':');
  if (hours === undefined || minutes === undefined) {
    return value;
  }

  return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
};