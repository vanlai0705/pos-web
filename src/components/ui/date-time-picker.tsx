import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/utils"
import { CalendarClock, ChevronLeft, ChevronRight } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
interface DateTimePickerProps {
  value?: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}

export function DateTimePicker({ value, onChange, disabled }: DateTimePickerProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  // Parse current value or fallback
  const currentStr = value || "";
  const matches = currentStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/) 
    || currentStr.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
    
  let initialDate = new Date();
  let initialHours = "12";
  let initialMinutes = "00";
  let initialSeconds = "00";
  
  if (matches) {
    const year = parseInt(matches[1]);
    const month = parseInt(matches[2]) - 1;
    const day = parseInt(matches[3]);
    initialDate = new Date(year, month, day);
    initialHours = matches[4];
    initialMinutes = matches[5];
    initialSeconds = matches[6];
  } else {
    const d = new Date(currentStr);
    if (!isNaN(d.getTime())) {
      initialDate = d;
      initialHours = String(d.getHours()).padStart(2, "0");
      initialMinutes = String(d.getMinutes()).padStart(2, "0");
      initialSeconds = String(d.getSeconds()).padStart(2, "0");
    }
  }

  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);
  const [navMonth, setNavMonth] = useState<number>(initialDate.getMonth());
  const [navYear, setNavYear] = useState<number>(initialDate.getFullYear());
  
  const [hours, setHours] = useState<string>(initialHours);
  const [minutes, setMinutes] = useState<string>(initialMinutes);
  const [seconds, setSeconds] = useState<string>(initialSeconds);

  // Keep internal state in sync with external value
  useEffect(() => {
    if (value) {
      const parts = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/) 
        || value.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
      if (parts) {
        const year = parseInt(parts[1]);
        const month = parseInt(parts[2]) - 1;
        const day = parseInt(parts[3]);
        setSelectedDate(new Date(year, month, day));
        setHours(parts[4]);
        setMinutes(parts[5]);
        setSeconds(parts[6]);
        setNavMonth(month);
        setNavYear(year);
      }
    }
  }, [value, isOpen]);

  const monthNames = Array.from({ length: 12 }, (_, i) => t('components.dateTimePicker.monthLabel', { month: i + 1 }));
  const weekDays = [
    t('components.dateTimePicker.weekDaySun'),
    t('components.dateTimePicker.weekDayMon'),
    t('components.dateTimePicker.weekDayTue'),
    t('components.dateTimePicker.weekDayWed'),
    t('components.dateTimePicker.weekDayThu'),
    t('components.dateTimePicker.weekDayFri'),
    t('components.dateTimePicker.weekDaySat'),
  ];

  const prevMonth = () => {
    if (navMonth === 0) {
      setNavMonth(11);
      setNavYear(navYear - 1);
    } else {
      setNavMonth(navMonth - 1);
    }
  };

  const nextMonth = () => {
    if (navMonth === 11) {
      setNavMonth(0);
      setNavYear(navYear + 1);
    } else {
      setNavMonth(navMonth + 1);
    }
  };

  const daysGrid = useMemo(() => {
    const firstDay = new Date(navYear, navMonth, 1);
    const startDayOfWeek = firstDay.getDay();
    
    const gridStart = new Date(firstDay);
    gridStart.setDate(gridStart.getDate() - startDayOfWeek);
    
    const days: Date[] = [];
    for (let i = 0; i < 42; i++) {
      days.push(new Date(gridStart));
      gridStart.setDate(gridStart.getDate() + 1);
    }
    return days;
  }, [navMonth, navYear]);

  const isToday = (day: Date) => {
    const today = new Date();
    return day.getDate() === today.getDate() && 
           day.getMonth() === today.getMonth() && 
           day.getFullYear() === today.getFullYear();
  };

  const isSelected = (day: Date) => {
    return day.getDate() === selectedDate.getDate() && 
           day.getMonth() === selectedDate.getMonth() && 
           day.getFullYear() === selectedDate.getFullYear();
  };

  const handleDateSelect = (day: Date) => {
    setSelectedDate(day);
    setNavMonth(day.getMonth());
    setNavYear(day.getFullYear());
  };

  const handleClear = () => {
    onChange("");
    setIsOpen(false);
  };

  const handleToday = () => {
    const d = new Date();
    setSelectedDate(d);
    setNavMonth(d.getMonth());
    setNavYear(d.getFullYear());
    setHours(String(d.getHours()).padStart(2, '0'));
    setMinutes(String(d.getMinutes()).padStart(2, '0'));
    setSeconds(String(d.getSeconds()).padStart(2, '0'));
  };

  const handleOK = () => {
    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const d = String(selectedDate.getDate()).padStart(2, "0");
    const h = (hours || "00").padStart(2, "0");
    const min = (minutes || "00").padStart(2, "0");
    const sec = (seconds || "00").padStart(2, "0");
    onChange(`${y}-${m}-${d}T${h}:${min}:${sec}`);
    setIsOpen(false);
  };

  const formatDisplay = () => {
    if (!value) return t('components.dateTimePicker.placeholderSelectDateTime');
    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const d = String(selectedDate.getDate()).padStart(2, "0");
    return `${d}/${m}/${y} ${hours}:${minutes}:${seconds}`;
  };

  return (
    <Popover modal={true} open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full pl-10 text-left font-normal h-10 border border-input rounded-md shadow-sm relative flex items-center hover:bg-accent hover:text-accent-foreground",
            !value && "text-muted-foreground"
          )}
        >
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
            <CalendarClock className="h-4 w-4" />
          </div>
          <span>{formatDisplay()}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent disablePortal={true} className="w-[280px] p-0 bg-white border border-neutral-200 shadow-lg rounded-lg z-[100] pointer-events-auto" align="start">
        <div className="flex items-center justify-between p-3 border-b border-neutral-100">
          <button
            type="button"
            onClick={prevMonth}
            className="p-1 hover:bg-neutral-100 rounded text-neutral-600 transition"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-1">
            <select
              value={navMonth}
              onChange={(e) => setNavMonth(parseInt(e.target.value))}
              className="text-xs font-semibold text-neutral-900 bg-white border border-neutral-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer"
            >
              {monthNames.map((name, index) => (
                <option key={index} value={index} className="text-black bg-white">
                  {name}
                </option>
              ))}
            </select>
            <select
              value={navYear}
              onChange={(e) => setNavYear(parseInt(e.target.value))}
              className="text-xs font-semibold text-neutral-900 bg-white border border-neutral-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer"
            >
              {Array.from({ length: 31 }, (_, i) => new Date().getFullYear() - 15 + i).map((year) => (
                <option key={year} value={year} className="text-black bg-white">
                  {year}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={nextMonth}
            className="p-1 hover:bg-neutral-100 rounded text-neutral-600 transition"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="p-3">
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {weekDays.map((wd, index) => (
              <span
                key={wd}
                className={cn(
                  "text-[11px] font-bold select-none",
                  (index === 0 || index === 6) ? "text-red-500" : "text-neutral-800"
                )}
              >
                {wd}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {daysGrid.map((day, idx) => {
              const isCurrentMonth = day.getMonth() === navMonth;
              const isSel = isSelected(day);
              const isT = isToday(day);
              const dayOfWeek = day.getDay();
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleDateSelect(day)}
                  className={cn(
                    "h-7 w-7 text-xs font-medium rounded transition-colors focus:outline-none select-none flex items-center justify-center",
                    isSel && "bg-blue-600 text-white font-semibold rounded",
                    !isSel && isT && "text-blue-600 font-bold border border-blue-300",
                    !isSel && !isT && isCurrentMonth && isWeekend && "text-red-500 hover:bg-neutral-100",
                    !isSel && !isT && isCurrentMonth && !isWeekend && "text-neutral-800 hover:bg-neutral-100",
                    !isCurrentMonth && "text-neutral-300 opacity-40 hover:bg-neutral-50"
                  )}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-t border-neutral-100 p-3 flex items-center justify-between bg-neutral-50/50">
          <span className="text-xs font-bold text-neutral-500 select-none">{t('components.dateTimePicker.hourLabel')}</span>
          <div className="flex items-center gap-1.5">
            <select
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              className="w-12 h-7 text-center border rounded bg-white text-neutral-900 text-xs focus:outline-none focus:ring-1 focus:ring-blue-600 transition cursor-pointer font-bold"
            >
              {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map((h) => (
                <option key={h} value={h} className="text-black bg-white">
                  {h}
                </option>
              ))}
            </select>
            <span className="text-neutral-400 font-bold select-none">:</span>
            <select
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              className="w-12 h-7 text-center border rounded bg-white text-neutral-900 text-xs focus:outline-none focus:ring-1 focus:ring-blue-600 transition cursor-pointer font-bold"
            >
              {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map((m) => (
                <option key={m} value={m} className="text-black bg-white">
                  {m}
                </option>
              ))}
            </select>
            <span className="text-neutral-400 font-bold select-none">:</span>
            <select
              value={seconds}
              onChange={(e) => setSeconds(e.target.value)}
              className="w-12 h-7 text-center border rounded bg-white text-neutral-900 text-xs focus:outline-none focus:ring-1 focus:ring-blue-600 transition cursor-pointer font-bold"
            >
              {Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')).map((s) => (
                <option key={s} value={s} className="text-black bg-white">
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="border-t border-neutral-200 p-2 flex items-center justify-between bg-neutral-50/80 rounded-b-lg">
          <button
            type="button"
            onClick={handleClear}
            className="px-3 py-1 text-xs font-semibold text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 rounded transition"
          >
            {t('components.dateTimePicker.clear')}
          </button>
          <button
            type="button"
            onClick={handleToday}
            className="px-3 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded transition"
          >
            {t('components.dateTimePicker.today')}
          </button>
          <button
            type="button"
            onClick={handleOK}
            className="px-4 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded transition shadow-sm"
          >
            {t('components.dateTimePicker.confirm')}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
