
import * as React from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Command as CommandPrimitive } from "cmdk";
import { cn } from "@/utils";

interface MultiSelectProps<T> {
  options: T[];
  valueKey: keyof T;
  labelKey: keyof T;
  value?: any[];
  onChange?: (selected: T[]) => void;
  placeholder?: string;
  disabled?: boolean;
  getOptionDisabled?: (option: T) => boolean;
}

export function MultiSelect<T extends Record<string, any>>({
  options,
  valueKey,
  labelKey,
  value = [],
  onChange,
  placeholder = "Select...",
  disabled = false,
  getOptionDisabled
}: MultiSelectProps<T>) {
  const { t } = useTranslation();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<T[]>(value);
  const [inputValue, setInputValue] = React.useState("");

  const selectables = React.useMemo(() => {
    return options.filter(
      (option) => !selected.some((s) => s[valueKey] === option[valueKey])
    );
  }, [options, selected, valueKey]);

  const handleInputKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (disabled) return;

      if (e.key === "Enter" && inputValue.trim() !== "") {
        e.preventDefault();
        e.stopPropagation();

        const trimmed = inputValue.trim().toLowerCase();
        const matched = selectables.find(
          (opt) => String(opt[labelKey]).toLowerCase() === trimmed
        );
        if (matched) {
          const newSelected = [...selected, matched];
          setSelected(newSelected);
          onChange?.(newSelected);
          setInputValue("");
        } else {
          const alreadySelected = selected.some(
            (s) => String(s[labelKey]).toLowerCase() === trimmed
          );
          if (alreadySelected) {
            toast.warning(
              t("components.multiSelect.serialAlreadySelected", {
                serial: inputValue.trim(),
              })
            );
          } else {
            toast.error(
              t("components.multiSelect.serialNotInStock", {
                serial: inputValue.trim(),
              })
            );
          }
        }
      }
    },
    [disabled, inputValue, selectables, labelKey, selected, onChange, t]
  );

  const handlePaste = React.useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      if (disabled) return;
      const pastedText = e.clipboardData.getData("text");
      if (!pastedText) return;

      const parsedSerials = pastedText
        .split(/[\n,;\t]+/)
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);

      if (parsedSerials.length === 0) return;

      e.preventDefault();

      const newlySelected: T[] = [];
      const unmatched: string[] = [];

      parsedSerials.forEach((ps) => {
        const matched = selectables.find(
          (opt) => String(opt[labelKey]).toLowerCase() === ps
        );
        if (matched && !newlySelected.some(s => s[valueKey] === matched[valueKey])) {
          newlySelected.push(matched);
        } else {
          unmatched.push(ps);
        }
      });

      if (newlySelected.length > 0) {
        const newSelected = [...selected, ...newlySelected];
        setSelected(newSelected);
        onChange?.(newSelected);
        setInputValue("");
      }

      if (unmatched.length > 0) {
        toast.warning(
          t("components.multiSelect.serialsNotFoundInStock", {
            count: unmatched.length,
            serials: unmatched.join(", "),
          })
        );
      }
    },
    [disabled, selected, selectables, labelKey, valueKey, onChange, t]
  );

  // Đồng bộ khi value thay đổi từ props
  React.useEffect(() => {
    setSelected(value);
  }, [value]);

  const handleUnselect = React.useCallback(
    (item: T) => {
      const newSelected = selected.filter(
        (s) => s[valueKey] !== item[valueKey]
      );
      setSelected(newSelected);
      onChange?.(newSelected);
    },
    [selected, valueKey, onChange]
  );

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return;

      const input = inputRef.current;
      if (input) {
        if ((e.key === "Delete" || e.key === "Backspace") && input.value === "") {
          const newSelected = [...selected];
          newSelected.pop();
          setSelected(newSelected);
          onChange?.(newSelected);
        }
        if (e.key === "Escape") {
          input.blur();
        }
      }
    },
    [selected, onChange]
  );

  return (
    <Command onKeyDown={handleKeyDown} className="overflow-visible bg-transparent">
      <div className="group rounded-md border border-input px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
        <div className="flex flex-wrap gap-1">
          {selected.map((item) => (
            <Badge key={item[valueKey] as string} variant="secondary">
              {item[labelKey]}
              <button
                className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleUnselect(item);
                }}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleUnselect(item)}
              >
                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
              </button>
            </Badge>
          ))}
          <CommandPrimitive.Input
            ref={inputRef}
            value={inputValue}
            onValueChange={setInputValue}
            onBlur={() => setOpen(false)}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            onKeyDown={handleInputKeyDown}
            onPaste={handlePaste}
            className="ml-2 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="relative mt-2">
        <CommandList>
          {!disabled && open && selectables.length > 0 && (
            <div className="absolute top-0 z-10 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in">
              <CommandGroup>
                {selectables.map((item) => {
                  const optionDisabled = getOptionDisabled?.(item);

                  return (
                    <CommandItem
                      key={item[valueKey]}
                      disabled={optionDisabled}
                      onMouseDown={(e) => e.preventDefault()}
                      onSelect={() => {
                        if (optionDisabled) return;

                        const newSelected = [...selected, item];
                        setSelected(newSelected);
                        onChange?.(newSelected);
                        setInputValue("");
                      }}
                      className={cn(
                        "cursor-pointer",
                        optionDisabled && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      {item[labelKey]}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </div>
          )}
        </CommandList>
      </div>
    </Command>
  );
}
