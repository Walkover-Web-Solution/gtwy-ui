import { MoonIcon, SunIcon, MonitorIcon, ChevronDownIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { useThemeManager } from "@/customHooks/useThemeManager";

export default function ThemeToggle() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { theme, changeTheme, getThemeLabel } = useThemeManager();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const dropdownElement = event.target.closest('[data-dropdown="theme-toggle"]');
      if (!dropdownElement && isDropdownOpen) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [isDropdownOpen]);

  const handleThemeChange = (newTheme) => {
    setIsDropdownOpen(false);
    changeTheme(newTheme);
  };

  const getThemeIcon = () => {
    if (theme === "system") {
      return <MonitorIcon size={16} />;
    }
    return theme === "light" ? <SunIcon size={16} /> : <MoonIcon size={16} />;
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  return (
    <>
      <div className="w-full" data-dropdown="theme-toggle">
        <button
          id="theme-toggle-button"
          onClick={toggleDropdown}
          className="btn btn-ghost btn-sm w-full justify-between normal-case font-normal text-xs h-8"
        >
          <div className="flex items-center gap-2">
            {getThemeIcon()}
            {theme === "system" && <div className="badge badge-xs badge-primary opacity-70">Auto</div>}
            <span className="hidden sm:block">{getThemeLabel()}</span>
          </div>
          <ChevronDownIcon className={`w-3 h-3 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
        </button>

        {isDropdownOpen && (
          <div className="menu bg-base-200 w-full rounded-lg mt-1 p-1 shadow border border-base-300">
            <li>
              <button
                id="theme-light-button"
                className={`flex items-center gap-2 p-2 rounded text-xs hover:bg-base-300 transition-colors ${theme === "light" ? "bg-base-300" : ""}`}
                onClick={() => handleThemeChange("light")}
                disabled={theme === "light"}
              >
                <SunIcon size={14} />
                <span className="flex-1 text-left">Light</span>
                {theme === "light" && <div className="badge badge-xs badge-success">✓</div>}
              </button>
            </li>

            <li>
              <button
                id="theme-dark-button"
                className={`flex items-center gap-2 p-2 rounded text-xs hover:bg-base-300 transition-colors ${theme === "dark" ? "bg-base-300" : ""}`}
                onClick={() => handleThemeChange("dark")}
                disabled={theme === "dark"}
              >
                <MoonIcon size={14} />
                <span className="flex-1 text-left">Dark</span>
                {theme === "dark" && <div className="badge badge-xs badge-success">✓</div>}
              </button>
            </li>

            <li>
              <button
                id="theme-system-button"
                className={`flex items-center gap-2 p-2 rounded text-xs hover:bg-base-300 transition-colors ${theme === "system" ? "bg-base-300" : ""}`}
                onClick={() => handleThemeChange("system")}
                disabled={theme === "system"}
              >
                <MonitorIcon size={14} />
                <span className="flex-1 text-left">System</span>
                {theme === "system" && <div className="badge badge-xs badge-success">✓</div>}
              </button>
            </li>
          </div>
        )}
      </div>
    </>
  );
}
