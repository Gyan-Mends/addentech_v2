import { Suspense } from "react";

// Minimal loading spinner component
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
);

// Lightweight lazy loader wrapper
interface LazyLoaderProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const LazyLoader = ({ children, fallback = <LoadingSpinner /> }: LazyLoaderProps) => (
  <Suspense fallback={fallback}>
    {children}
  </Suspense>
);

// Minimal page loading component for smaller bundles
export const PageLoader = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
  </div>
);

export default LazyLoader; 