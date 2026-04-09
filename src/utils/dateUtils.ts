// utils/dateUtils.ts
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";

/**
 * Formats a date with capitalization support for French locale.
 * @param date The date to format
 * @param formatStr The date-fns format string
 * @param localeCode The current language code ('fr' or 'en')
 */
export const formatDateDisplay = (date: Date, formatStr: string, localeCode: string): string => {
  const currentLocale = localeCode === 'fr' ? fr : enUS;
  const formatted = format(date, formatStr, { locale: currentLocale });

  if (localeCode === "fr") {
    // Capitalize every word that is a "word" (letters only)
    return formatted
      .split(" ")
      .map(word => {
        // Only capitalize if it contains letters (avoiding numbers like "12")
        if (/^[a-zàâçéèêëîïôûùüÿñæœ]+$/i.test(word)) {
          return word.charAt(0).toUpperCase() + word.slice(1);
        }
        return word;
      })
      .join(" ");
  }

  return formatted;
};

// Capitalise the first letter of a string (useful for French day/month names)
export const capitalizeFirstLetter = (text: string): string => {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
};

// Convertir une Date en string YYYY-MM-DD pour la base de données
export const formatDateForDB = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Convertir une string en date d'affichage lisible
export const formatDisplayDate = (dateString: string): string => {
  try {
    // Si c'est une date base de données "2025-11-25"
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateString.split('-').map(Number);
      
      const monthNames = [
        'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
      ];
      
      return `${day} ${monthNames[month - 1]} ${year}`;
    }
    
    // Pour les autres formats
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleDateString('fr-FR', { month: 'long' });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
    
  } catch (error) {
    console.error('Erreur formatDisplayDate:', dateString);
    return dateString;
  }
};

// Vérifier si une date est valide
export const isValidDate = (dateString: string): boolean => {
  try {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && 
           date.getMonth() === month - 1 && 
           date.getDate() === day;
  } catch (error) {
    return false;
  }
};

// Calculer la différence de jours entre deux dates
export const calculateDaysDifference = (startDate: Date, endDate: Date): number => {
  const startUTC = Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const endUTC = Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  
  const diffTime = Math.abs(endUTC - startUTC);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(diffDays, 1);
};

// Obtenir la date d'aujourd'hui au format YYYY-MM-DD
export const getTodayDate = (): string => {
  return formatDateForDB(new Date());
};

// Ajouter des jours à une date
export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

// Formater une date pour l'input date (YYYY-MM-DD)
export const formatForDateInput = (date: Date): string => {
  return formatDateForDB(date);
};

// Vérifier si une date est dans le futur
export const isFutureDate = (dateString: string): boolean => {
  const today = new Date();
  const inputDate = new Date(dateString);
  return inputDate > today;
};

// Vérifier si une date est passée
export const isPastDate = (dateString: string): boolean => {
  const today = new Date();
  const inputDate = new Date(dateString);
  return inputDate < today;
};

// Comparer deux dates (ignore l'heure)
export const areDatesEqual = (date1: Date, date2: Date): boolean => {
  return formatDateForDB(date1) === formatDateForDB(date2);
};