/**
 * ZTTeam: Utility phân định loại Website WordPress đích (News vs Story).
 * 
 * - Website Tin Tức (News): imsb.info, mv.imsb.info
 *   => Bắt buộc tuân thủ quy tắc: Chỉ lấy bài viết mới nhất trong vòng 5 ngày.
 * 
 * - Website Câu Chuyện (Story): an.imsb.info và các website truyện khác
 *   => Không bị giới hạn 5 ngày (lấy bài evergreen, câu chuyện cũ vẫn có giá trị cao).
 *   => Bật bộ lọc Gatekeeper: Tự động phát hiện và bỏ qua các bài tin tức thông thường (không phải story).
 */

export function ztteam_isNewsSite(wpUrl?: string | null): boolean {
  if (!wpUrl) return false;
  const clean = wpUrl.toLowerCase();
  // an.imsb.info là website câu chuyện / động vật, tuyệt đối KHÔNG phải website tin tức
  if (clean.includes('an.imsb.info')) {
    return false;
  }
  return clean.includes('imsb.info') || clean.includes('mv.imsb.info');
}

export function ztteam_isStorySite(wpUrl?: string | null): boolean {
  if (!wpUrl) return false;
  return !ztteam_isNewsSite(wpUrl);
}
