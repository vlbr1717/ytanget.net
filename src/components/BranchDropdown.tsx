import { useState } from "react";
import { ChevronDown, GitBranch, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { BranchInfo } from "@/hooks/useBranchingChat";

interface BranchDropdownProps {
  siblings: BranchInfo[];
  currentBranchId: string;
  onSwitch: (branchId: string) => void;
}

export function BranchDropdown({ 
  siblings, 
  currentBranchId,
  onSwitch 
}: BranchDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Don't show if only one branch (no siblings)
  if (siblings.length <= 1) return null;
  
  return (
    <div className="relative inline-block">
      {/* Branch indicator button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 text-xs",
          "bg-muted/50 hover:bg-muted rounded-full",
          "border border-border/50 hover:border-border",
          "transition-all duration-200",
          "text-muted-foreground hover:text-foreground"
        )}
      >
        <GitBranch className="h-3 w-3" />
        <span>{siblings.length} branches</span>
        <ChevronDown 
          className={cn(
            "h-3 w-3 transition-transform duration-200",
            isOpen && "rotate-180"
          )} 
        />
      </button>
      
      {/* Dropdown panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)}
            />
            
            {/* Dropdown menu */}
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className={cn(
                "absolute left-0 top-full mt-1 z-50",
                "min-w-[200px] max-w-[300px]",
                "bg-popover border border-border rounded-lg shadow-lg",
                "overflow-hidden"
              )}
            >
              <div className="py-1 max-h-[300px] overflow-y-auto">
                {siblings.map((branch, index) => {
                  const isActive = branch.id === currentBranchId;
                  
                  return (
                    <button
                      key={branch.id}
                      onClick={() => {
                        onSwitch(branch.id);
                        setIsOpen(false);
                      }}
                      className={cn(
                        "w-full px-3 py-2 text-left",
                        "hover:bg-muted/50 transition-colors",
                        "border-l-2",
                        isActive 
                          ? "bg-primary/5 border-l-primary" 
                          : "border-l-transparent"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-xs font-medium",
                          isActive ? "text-primary" : "text-foreground"
                        )}>
                          {branch.branch_name || `Branch ${index + 1}`}
                        </span>
                        {isActive && (
                          <Check className="h-3 w-3 text-primary ml-auto" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {branch.preview}
                      </p>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
