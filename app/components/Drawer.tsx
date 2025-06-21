import { useEffect, createContext, useContext, useState } from "react";
import { X } from "lucide-react";

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

// Create context for drawer state
interface DrawerContextType {
  isDrawerOpen: boolean;
  drawerWidth: string;
}

const DrawerContext = createContext<DrawerContextType>({
  isDrawerOpen: false,
  drawerWidth: "0px",
});

export const useDrawerContext = () => useContext(DrawerContext);

export const DrawerProvider = ({ children }: { children: React.ReactNode }) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerWidth, setDrawerWidth] = useState("0px");

  return (
    <DrawerContext.Provider value={{ isDrawerOpen, drawerWidth }}>
      {children}
    </DrawerContext.Provider>
  );
};

const Drawer = ({ isOpen, onClose, title, children, size = "md" }: DrawerProps) => {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Update body class for content shifting
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('drawer-open');
    } else {
      document.body.classList.remove('drawer-open');
    }

    return () => {
      document.body.classList.remove('drawer-open');
    };
  }, [isOpen]);

  const sizeClasses = {
    sm: "w-80",   // 320px
    md: "w-96",   // 384px
    lg: "w-[500px]",  // 500px
    xl: "w-[600px]",  // 600px
  };

  const sizeValues = {
    sm: "320px",
    md: "384px", 
    lg: "500px",
    xl: "600px",
  };

  return (
    <>
      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full ${sizeClasses[size]} bg-white dark:bg-gray-800 shadow-2xl z-50 transform transition-all duration-300 ease-in-out border-l border-gray-200 dark:border-gray-700 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 h-[calc(100vh-80px)] scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
          <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            {children}
          </div>
        </div>
      </div>

      {/* Add dynamic styles for content pushing with smooth transitions */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .drawer-open main {
            margin-right: ${sizeValues[size]};
            transition: margin-right 300ms cubic-bezier(0.4, 0, 0.2, 1);
          }
          .drawer-open .dashboard-layout {
            margin-right: ${sizeValues[size]};
            transition: margin-right 300ms cubic-bezier(0.4, 0, 0.2, 1);
          }
          main, .dashboard-layout {
            transition: margin-right 300ms cubic-bezier(0.4, 0, 0.2, 1);
          }
          
          /* Custom scrollbar styles */
          .scrollbar-thin {
            scrollbar-width: thin;
          }
          .scrollbar-thumb-gray-300::-webkit-scrollbar {
            width: 6px;
          }
          .scrollbar-thumb-gray-300::-webkit-scrollbar-thumb {
            background-color: #d1d5db;
            border-radius: 3px;
          }
          .dark .scrollbar-thumb-gray-600::-webkit-scrollbar-thumb {
            background-color: #4b5563;
          }
        `
      }} />
    </>
  );
};

export default Drawer; 