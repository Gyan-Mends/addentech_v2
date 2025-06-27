// Utility functions for MongoDB ObjectId operations without requiring mongoose client-side

export function createObjectId(): string {
  // Generate a 24-character hex string (MongoDB ObjectId format)
  const timestamp = Math.floor(Date.now() / 1000).toString(16);
  const randomBytes = Math.random().toString(16).substring(2, 18);
  return (timestamp + randomBytes).substring(0, 24);
}

export function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

// For server-side usage in API routes where we need actual ObjectId instances
export function createObjectIdString(id?: string): string {
  if (id && isValidObjectId(id)) return id;
  return createObjectId();
} 