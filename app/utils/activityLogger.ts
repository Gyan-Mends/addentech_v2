import ActivityLog from "~/model/activityLog";

interface LogActivityParams {
  action: 'login' | 'logout' | 'create' | 'update' | 'delete' | 'view' | 'export' | 'import' | 'other';
  description: string;
  userId: string;
  targetModel?: string;
  targetId?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: any;
}

export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    const activityLog = new ActivityLog({
      action: params.action,
      description: params.description,
      user: params.userId,
      targetModel: params.targetModel,
      targetId: params.targetId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      details: params.details
    });

    await activityLog.save();
  } catch (error) {
    console.error('Failed to log activity:', error);
    // Don't throw error to avoid breaking the main functionality
  }
}

export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const clientIP = request.headers.get('x-client-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  if (clientIP) {
    return clientIP;
  }
  
  return 'unknown';
}

export function getUserAgent(request: Request): string {
  return request.headers.get('user-agent') || 'unknown';
} 