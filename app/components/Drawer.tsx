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

  if (!isOpen) return null;

  return (
    <>
      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full ${sizeClasses[size]} bg-white dark:bg-gray-800 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l border-gray-200 dark:border-gray-700`}
        style={{
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        }}
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
        <div className="flex-1 overflow-y-auto p-6 h-[calc(100vh-80px)]">
          {children}
        </div>
      </div>

      {/* Add dynamic styles for content shifting */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .drawer-open .dashboard-content {
            margin-right: ${sizeValues[size]};
            transition: margin-right 300ms ease-in-out;
          }
          .dashboard-content {
            transition: margin-right 300ms ease-in-out;
          }
        `
      }} />
    </>
  );
};

export default Drawer; 