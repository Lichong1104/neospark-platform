import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface DropdownOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface BrutalDropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  icon?: React.ReactNode;
  className?: string;
  placeholder?: string;
}

const BrutalDropdown: React.FC<BrutalDropdownProps> = ({
  options,
  value,
  onChange,
  icon,
  className,
  placeholder = "Select...",
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-1 px-1.5 py-1 bg-card hover:bg-secondary border border-foreground/20 text-[11px] font-mono transition-none",
          isOpen && "bg-secondary"
        )}
      >
        {icon && <span className="text-foreground/70 flex-shrink-0">{icon}</span>}
        <span className="max-w-[90px] truncate">
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown className={cn("w-2.5 h-2.5 flex-shrink-0 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-1 min-w-[120px] bg-card border-brutal border-foreground z-50 brutal-shadow">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={cn(
                "w-full text-left px-3 py-2 text-xs font-mono hover:bg-accent-yellow transition-none flex items-center gap-2 border-b border-foreground/10 last:border-0",
                value === option.value && "bg-accent-cyan/20 font-bold"
              )}
            >
              {option.icon && <span>{option.icon}</span>}
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export { BrutalDropdown, type DropdownOption };
