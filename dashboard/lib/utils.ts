import { clsx, type ClassValue } from 'clsx'
import { formatDistanceToNow } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatTimeAgo(date: string | Date) {
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true })
  } catch (error) {
    return 'Unknown time'
  }
}

export function truncateSha(sha: string) {
  return sha.slice(0, 7)
}

export function getStatusColor(status: string) {
  switch (status.toLowerCase()) {
    case 'live':
      return 'live'
    case 'building':
      return 'building'
    case 'queued':
      return 'queued'
    case 'failed':
      return 'failed'
    case 'deploying':
      return 'deploying'
    case 'stopped':
      return 'stopped'
    default:
      return 'queued'
  }
}
