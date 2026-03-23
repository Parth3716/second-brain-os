export function getCurrentDateIST() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000; 
  const istTime = new Date(now.getTime() + istOffset);
  istTime.setUTCHours(0, 0, 0, 0);
  return istTime;
}

export function getCurrentDateTimeIST() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000; 
  const istTime = new Date(now.getTime() + istOffset);
  return istTime;
}

export function buildISTDateTime(date: Date, timeStr: string): Date {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const result = new Date(date);
  result.setUTCHours(hours, minutes, 0, 0);
  return result;
}

export const formatTimeHM = (dateStr: string) => {
    const date = new Date(dateStr);
    let h = date.getUTCHours();
    const m = date.getUTCMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12; // '0' should be '12'
    const minStr = m < 10 ? '0' + m : m;
    return `${h}:${minStr} ${ampm}`;
  };

export function formatDisplayDateIST() {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date());
}

export function formatShortDisplayDateIST(dateString: string | Date) {
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}