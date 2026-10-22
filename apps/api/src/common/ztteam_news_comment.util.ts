/**
 * ZTTeam: Utility tao binh luan chuan bao chi / tin tuc (News Publisher Standard)
 * Khong dung emoji spam, clickbait re tien de tranh thuat toan Facebook danh gia thap.
 */

export const ZTTEAM_NEWS_COMMENT_PREFIXES = [
  'Full story:',
  'Read more:',
  'Full report:',
  'Details:',
  'Read the full story:',
  'Read more here:'
];

export const ZTTEAM_NEWS_CAPTION_CTA = '...Full story in the comments';

/**
 * Tao binh luan chuan tin tuc tu link bai viet WordPress
 */
export function ztteam_getNewsComment(wpPostUrl?: string | null, customComment?: string | null): string {
  if (customComment && customComment.trim() && !customComment.includes('yourwebsite.com') && !customComment.includes('👇👇👇')) {
    return customComment.trim();
  }
  if (!wpPostUrl || !wpPostUrl.trim()) {
    return '';
  }
  const cleanUrl = wpPostUrl.trim();
  const prefix = ZTTEAM_NEWS_COMMENT_PREFIXES[Math.floor(Math.random() * ZTTEAM_NEWS_COMMENT_PREFIXES.length)];
  return `${prefix} ${cleanUrl}`;
}
