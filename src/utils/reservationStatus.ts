/**
 * Derives a consistent reservation status based on database status and dates.
 * This is for display purposes only and does not modify the database.
 */
export const getReservationStatus = (reservation: {
  status: string;
  start_date: string;
  end_date: string;
}) => {
  const now = new Date();
  const start = new Date(reservation.start_date);
  const end = new Date(reservation.end_date);
  const dbStatus = reservation.status;

  // Cancelled or refused take priority
  if (dbStatus === "cancelled") return "cancelled";
  if (dbStatus === "refused") return "refused";

  // Pending but the start date has already passed
  if (dbStatus === "pending" && start < now) {
    return "expired";
  }

  // Logic for accepted reservations
  if (dbStatus === "accepted") {
    if (now < start) return "accepted";
    if (now >= start && now <= end) return "active";
    if (now > end) return "completed";
  }

  // Fallback to the original database status (e.g., "pending")
  return dbStatus;
};
