"use client";

import * as React from "react";
import { Eye, EyeOff, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "./input";

export interface PasswordInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  showValidation?: boolean;
}

interface ValidationRule {
  label: string;
  test: (password: string) => boolean;
}

const validationRules: ValidationRule[] = [
  {
    label: "At least 8 characters",
    test: (password) => password.length >= 8,
  },
  {
    label: "Contains a number",
    test: (password) => /\d/.test(password),
  },
  {
    label: "Contains a special character",
    test: (password) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  },
];

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, showValidation = false, value, onChange, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const [password, setPassword] = React.useState("");

    // Sync internal state with controlled value
    React.useEffect(() => {
      if (typeof value === "string") {
        setPassword(value);
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setPassword(newValue);
      if (onChange) {
        onChange(e);
      }
    };

    const allRulesPassed = React.useMemo(() => {
      return validationRules.every((rule) => rule.test(password));
    }, [password]);

    return (
      <div className="space-y-2">
        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            className={cn("pr-10", className)}
            ref={ref}
            value={value}
            onChange={handleChange}
            {...props}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm"
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>

        {showValidation && password.length > 0 && (
          <div className="space-y-1.5 pt-1">
            {validationRules.map((rule, index) => {
              const passed = rule.test(password);
              return (
                <div
                  key={index}
                  className={cn(
                    "flex items-center gap-2 text-xs transition-colors",
                    passed ? "text-green-500" : "text-muted-foreground"
                  )}
                >
                  {passed ? (
                    <Check className="h-3.5 w-3.5 flex-shrink-0" />
                  ) : (
                    <X className="h-3.5 w-3.5 flex-shrink-0 opacity-50" />
                  )}
                  <span>{rule.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
export { validationRules };
