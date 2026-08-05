import { useTranslation } from 'react-i18next';
import {
  SelectTrigger,
  SelectValue,
  Select,
  SelectContent,
  SelectItem
} from '../ui/select';

type SelectBaseProps = {
  placeholder?: string;
  className?: string;
  classNameContent?: string;
  value?: any;
  onChange?: (value: string) => void;
  options: Record<string, any>[];
  loading?: boolean;
  valueKey?: string;
  labelKey?: string;
  disabled?: boolean;
  valueDisable?: string
};

const SelectBase: React.FC<SelectBaseProps> = ({
  placeholder,
  className,
  onChange,
  value,
  options,
  loading,
  valueKey = 'value',
  labelKey = 'label',
  classNameContent,
  disabled = false,
  valueDisable = ""
}) => {
  const { t } = useTranslation();
  return (
    <Select
      disabled={loading}
      onValueChange={onChange}
      value={value}
    >
      <SelectTrigger className={className} disabled={disabled}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className={`${classNameContent} max-h-60 overflow-y-auto`}>
        {options.length === 0 ? (
          <div className="px-2 py-1.5 text-sm text-muted-foreground text-center">
            {t('common.noData')}
          </div>
        ) : (
          options.map((option) => {
            return (
              <SelectItem key={option[valueKey]} value={option[valueKey]} disabled={option[valueKey] === valueDisable}>
                {option[labelKey]}
              </SelectItem>
            );
          })
        )}
      </SelectContent>
    </Select>
  );
};

export default SelectBase;
