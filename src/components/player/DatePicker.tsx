import { useState, useEffect, useRef } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  minDate?: string;
  className?: string;
}

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const DAYS_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const formatDateToString = (year: number, month: number, day: number): string => {
  const monthStr = String(month + 1).padStart(2, '0');
  const dayStr = String(day).padStart(2, '0');
  return `${year}-${monthStr}-${dayStr}`;
};

export function DatePicker({ value, onChange, minDate, className = '' }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (value) {
      setCurrentMonth(new Date(value));
    }
  }, [value]);

  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return 'Sélectionner une date';
    const date = new Date(dateString);
    return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    const adjustedStartDay = (startingDayOfWeek + 6) % 7;

    const days: (number | null)[] = [];

    for (let i = 0; i < adjustedStartDay; i++) {
      days.push(null);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    return days;
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const handleDateSelect = (day: number) => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const dateString = formatDateToString(year, month, day);

    if (minDate && dateString < minDate) {
      return;
    }

    onChange(dateString);
    setIsOpen(false);
  };

  const isDateDisabled = (day: number) => {
    if (!minDate) return false;
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const dateString = formatDateToString(year, month, day);
    return dateString < minDate;
  };

  const isSelectedDate = (day: number) => {
    if (!value) return false;
    const selectedDate = new Date(value);
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === currentMonth.getMonth() &&
      selectedDate.getFullYear() === currentMonth.getFullYear()
    );
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      today.getDate() === day &&
      today.getMonth() === currentMonth.getMonth() &&
      today.getFullYear() === currentMonth.getFullYear()
    );
  };

  const isPrevMonthDisabled = () => {
    if (!minDate) return false;
    const prevMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1);
    const lastDayOfPrevMonth = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0);
    const lastDayString = formatDateToString(
      lastDayOfPrevMonth.getFullYear(),
      lastDayOfPrevMonth.getMonth(),
      lastDayOfPrevMonth.getDate()
    );
    return lastDayString < minDate;
  };

  const days = getDaysInMonth(currentMonth);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 bg-neutral-800 border border-neutral-700 text-white rounded-lg focus:ring-2 focus:ring-[#c4ab63] focus:border-transparent focus:shadow-lg focus:shadow-[#c4ab63]/20 cursor-pointer flex items-center justify-between"
      >
        <span className={value ? 'text-white' : 'text-neutral-400'}>
          {formatDisplayDate(value)}
        </span>
        <Calendar size={20} className="text-neutral-400" />
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-2 bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl p-4 w-full sm:w-auto sm:min-w-[320px] sm:max-w-sm">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={handlePrevMonth}
              disabled={isPrevMonthDisabled()}
              className="p-1 hover:bg-neutral-800 rounded disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={20} className="text-white" />
            </button>
            <div className="text-white font-semibold">
              {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </div>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 hover:bg-neutral-800 rounded"
            >
              <ChevronRight size={20} className="text-white" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS_SHORT.map(day => (
              <div key={day} className="text-center text-xs text-neutral-400 font-medium py-1">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} className="aspect-square" />;
              }

              const disabled = isDateDisabled(day);
              const selected = isSelectedDate(day);
              const today = isToday(day);

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleDateSelect(day)}
                  disabled={disabled}
                  className={`
                    aspect-square rounded-lg text-sm font-medium transition
                    ${disabled
                      ? 'text-neutral-600 cursor-not-allowed'
                      : 'text-white hover:bg-neutral-800'
                    }
                    ${selected
                      ? 'bg-gradient-to-br from-[#866733] to-[#c4ab63] hover:from-[#6b5229] hover:to-[#866733] shadow-lg shadow-[#866733]/50 ring-2 ring-[#c4ab63]/30 font-semibold'
                      : ''
                    }
                    ${today && !selected
                      ? 'ring-2 ring-[#c4ab63] ring-inset'
                      : ''
                    }
                  `}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
