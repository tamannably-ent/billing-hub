export function formatToShortDate(dateInput: any): string {
    if (!dateInput) return '-';
    
    // Safely parse strings or ISO strings back into standard Date instances
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    
    // Catch invalid date inputs gracefully
    if (isNaN(date.getTime())) return '-';

    const day = String(date.getDate()).padStart(2, '0');
    
    // Map out short upper-case month tokens matching your original report style
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const month = months[date.getMonth()];
    
    const year = date.getFullYear();

    return `${day}-${month}-${year}`; // Returns perfectly formatted '13-DEC-2025'
}