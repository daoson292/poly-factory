/**
 * T068: Tiện ích xử lý Deep Link mở nhanh từ link ghim đầu nhóm chat Zalo (FR-polyfactory-283)
 * Định dạng hỗ trợ:
 * - https://zalo.me/s/polyfactory?action=checkin
 * - https://zalo.me/s/polyfactory?action=shift&shiftNumber=2
 * - https://zalo.me/s/polyfactory?action=urgent
 */

export interface DeepLinkParams {
  action: 'checkin' | 'shift' | 'training' | 'urgent' | 'home';
  shiftNumber?: number;
  taskId?: string;
}

export function parseDeepLink(urlOrQuery: string): DeepLinkParams {
  try {
    let queryString = urlOrQuery;
    if (urlOrQuery.includes('?')) {
      queryString = urlOrQuery.split('?')[1];
    }

    const params = new URLSearchParams(queryString);
    const action = (params.get('action') as any) || 'home';
    const shiftNumber = params.get('shiftNumber') ? parseInt(params.get('shiftNumber')!, 10) : undefined;
    const taskId = params.get('taskId') || undefined;

    return {
      action,
      shiftNumber,
      taskId,
    };
  } catch (err) {
    return { action: 'home' };
  }
}

export function resolveDeepLinkRoute(params: DeepLinkParams): string {
  switch (params.action) {
    case 'checkin':
      return 'pages/attendance/index';
    case 'shift':
      return 'pages/home/index?tab=shifts';
    case 'urgent':
      return 'pages/home/index?popup=urgent';
    case 'training':
      return 'pages/training/index';
    case 'home':
    default:
      return 'pages/home/index';
  }
}
