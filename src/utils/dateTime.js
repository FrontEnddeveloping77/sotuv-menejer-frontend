const parseUtcTimestamp = (value) => {
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value;
    }
    if (typeof value !== 'string' || !value.trim()) return null;

    const normalized = value.trim().replace(' ', 'T');
    const timestamp = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized)
        ? normalized
        : `${normalized}Z`;
    const date = new Date(timestamp);
    return Number.isNaN(date.getTime()) ? null : date;
};

export const formatLocalDateTime = (value) => {
    const date = parseUtcTimestamp(value);
    if (!date) return '—';

    return new Intl.DateTimeFormat('uz-UZ', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23'
    }).format(date);
};

export const timestampToEpoch = (value) => parseUtcTimestamp(value)?.getTime() ?? NaN;
