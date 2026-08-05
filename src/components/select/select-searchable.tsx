import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/utils';
import { ChevronDown, Check } from 'lucide-react';

type SelectSearchableProps = {
  placeholder?: string;
  className?: string;
  value?: string;
  onChange?: (value: string) => void;
  options: Array<Record<string, any>>;
  disabled?: boolean;
  valueKey?: string;
  labelKey?: string;
};

const SelectSearchable: React.FC<SelectSearchableProps> = ({
  placeholder,
  className,
  value,
  onChange,
  options = [],
  disabled = false,
  valueKey = 'value',
  labelKey = 'label',
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const resolvedPlaceholder = placeholder ?? t('components.selectSearchable.selectPlaceholder');

  const selectedOption = options.find((opt) => String(opt[valueKey]) === String(value || ''));

 
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        setSearchValue('');
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [open]);


  const filteredOptions = options.filter((option) => {
    const label = String(option[labelKey] || '');
    const search = searchValue.toLowerCase();
    return label.toLowerCase().includes(search);
  });

  const handleSelect = (selectedValue: string) => {
    onChange?.(selectedValue);
    setOpen(false);
    setSearchValue('');
  };

  return (
    <div className="relative w-full">
      <Button
        ref={buttonRef}
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        className={cn(
          "w-full justify-between h-9",
          !selectedOption && "text-muted-foreground",
          className
        )}
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
      >
        <span className="truncate">
          {selectedOption ? selectedOption[labelKey] : resolvedPlaceholder}
        </span>
        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {open && (
        <div
          ref={containerRef}
          className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg"
          style={{ maxHeight: '300px' }}
        >
          <Command shouldFilter={false} className="rounded-md">
            <CommandInput
              placeholder={t('components.selectSearchable.searchPlaceholder')}
              value={searchValue}
              onValueChange={setSearchValue}
              autoFocus
            />
            <CommandList className="max-h-[250px]">
              <CommandEmpty>{t('components.selectSearchable.noResultsFound')}</CommandEmpty>
              <CommandGroup>
                {filteredOptions.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground text-center">
                    {t('common.noData')}
                  </div>
                ) : (
                  filteredOptions.map((option) => (
                    <CommandItem
                      key={String(option[valueKey])}
                      value={String(option[valueKey])}
                      onSelect={() => handleSelect(String(option[valueKey]))}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 shrink-0",
                          value === String(option[valueKey]) ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="flex-1">{String(option[labelKey] || '')}</span>
                    </CommandItem>
                  ))
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
};

export default SelectSearchable;

