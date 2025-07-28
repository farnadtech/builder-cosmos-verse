import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import moment from "moment-jalaali";

interface PersianDateInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
  id?: string;
  className?: string;
}

export function PersianDateInput({ 
  value, 
  onChange, 
  label, 
  error, 
  id, 
  className 
}: PersianDateInputProps) {
  const [persianDate, setPersianDate] = useState("");

  // Convert Gregorian to Persian on mount if value exists
  useEffect(() => {
    if (value) {
      try {
        const gregorianDate = moment(value);
        if (gregorianDate.isValid()) {
          const persian = gregorianDate.format('jYYYY/jMM/jDD');
          setPersianDate(persian);
        }
      } catch (error) {
        console.error('Date conversion error:', error);
      }
    }
  }, []);

  const handleDateChange = (inputValue: string) => {
    // Remove any non-digit characters except /
    let cleanValue = inputValue.replace(/[^\d/]/g, '');

    // Auto-format: add slashes automatically
    if (cleanValue.length >= 4 && !cleanValue.includes('/')) {
      // If user types 4 digits, add first slash
      cleanValue = cleanValue.slice(0, 4) + '/' + cleanValue.slice(4);
    }
    if (cleanValue.length >= 7 && cleanValue.split('/').length === 2) {
      // If user has YYYY/MM format, add second slash
      const parts = cleanValue.split('/');
      cleanValue = parts[0] + '/' + parts[1].slice(0, 2) + '/' + parts[1].slice(2);
    }

    // Limit to YYYY/MM/DD format
    if (cleanValue.length > 10) {
      cleanValue = cleanValue.slice(0, 10);
    }

    setPersianDate(cleanValue);

    // Validate Persian date format (YYYY/MM/DD)
    const persianDateRegex = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/;
    const match = cleanValue.match(persianDateRegex);

    if (match) {
      const [, year, month, day] = match;

      try {
        // Create moment-jalaali date
        const jDate = moment(`${year}/${month.padStart(2, '0')}/${day.padStart(2, '0')}`, 'jYYYY/jMM/jDD');

        if (jDate.isValid()) {
          // Convert to Gregorian and send back
          const gregorianDate = jDate.format('YYYY-MM-DD');
          onChange(gregorianDate);
        } else {
          onChange('');
        }
      } catch (error) {
        onChange('');
      }
    } else {
      onChange('');
    }
  };

  const calculateAge = (birthDate: string): number => {
    if (!birthDate) return 0;
    
    try {
      const birth = moment(birthDate);
      const today = moment();
      return today.diff(birth, 'years');
    } catch {
      return 0;
    }
  };

  const age = value ? calculateAge(value) : 0;
  const ageError = age > 0 && (age < 18 || age > 120);

  return (
    <div className={className}>
      {label && <Label htmlFor={id}>{label}</Label>}
      <Input
        id={id}
        value={persianDate}
        onChange={(e) => handleDateChange(e.target.value)}
        placeholder="مثال: ۱۳۸۰/۰۵/۱۵"
        dir="ltr"
        className="text-center"
      />
      {age > 0 && (
        <p className={`text-sm mt-1 ${ageError ? 'text-red-500' : 'text-gray-600'}`}>
          سن: {age} سال
          {ageError && ' (سن باید بین ۱۸ تا ۱۲۰ سال باشد)'}
        </p>
      )}
      {error && !ageError && (
        <p className="text-sm text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
}
