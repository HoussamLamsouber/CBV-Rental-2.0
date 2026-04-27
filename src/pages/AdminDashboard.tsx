import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  Car,
  Calendar,
  Clock,
  Zap,
  TrendingUp,
  LayoutDashboard
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatDateDisplay } from "@/utils/dateUtils";
import {
  Area,
  AreaChart,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Line
} from "recharts";
import { motion } from "framer-motion";

interface Reservation {
  id: string;
  car_id: string;
  user_id: string;
  pickup_date: string;
  return_date: string;
  pickup_location: string;
  return_location: string;
  created_at: string;
  status: string;
  car_name: string;
  car_image: string;
  car_category: string;
  car_price: number;
  date: string;
  guest_name?: string;
  guest_email?: string;
  guest_phone?: string;
  total_amount?: number;
}

interface DashboardStats {
  totalVehicles: number;
  availableVehicles: number;
  totalRevenue: number;
  activeRentals: number;
  monthlyGrowth: number;
  totalReservations: number;
  performanceRate: number;
}

interface ChartData {
  name: string;
  value: number;
}

export default function AdminDashboard() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [allReservations, setAllReservations] = useState<Reservation[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalVehicles: 0,
    availableVehicles: 0,
    totalRevenue: 0,
    activeRentals: 0,
    monthlyGrowth: 0,
    totalReservations: 0,
    performanceRate: 0
  });
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [categoryData, setCategoryData] = useState<ChartData[]>([]);
  const [revenueData, setRevenueData] = useState<ChartData[]>([]);
  const [reservationTrendData, setReservationTrendData] = useState<ChartData[]>([]);
  const [translationKey, setTranslationKey] = useState(0);
  const [chartKey, setChartKey] = useState(0);
  const [revenueRange, setRevenueRange] = useState(6);
  const [bookingRange, setBookingRange] = useState(6);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (vehicles.length > 0 && allReservations.length > 0) {
      prepareChartData(vehicles, allReservations);
    }
  }, [i18n.language, revenueRange, bookingRange]);

  useEffect(() => {
    if (
      revenueData.length > 0 &&
      categoryData.length > 0 &&
      reservationTrendData.length > 0
    ) {
      setChartKey(prev => prev + 1);
    }
  }, [revenueData, categoryData, reservationTrendData]);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      const { data: carsData, error: carsError } = await supabase
        .from("cars")
        .select("*")
        .is("is_deleted", false);

      if (carsError) throw carsError;
      setVehicles(carsData || []);

      // Fetch physical vehicle statuses to correctly account for maintenance
      const { data: physicalVehiclesData } = await supabase
        .from("vehicles")
        .select("car_id, status")
        .is("is_deleted", false);

      const { data: allResData, error: allResError } = await supabase
        .from("reservations")
        .select("*");

      if (allResError) throw allResError;
      setAllReservations((allResData as Reservation[]) || []);

      const { data: resData, error: resError } = await supabase
        .from("reservations")
        .select("*")
        .eq("status", "accepted");

      if (resError) throw resError;
      setReservations((resData as Reservation[]) || []);

      calculateStats(carsData || [], allResData as Reservation[] || [], physicalVehiclesData || []);
      prepareChartData(carsData || [], allResData as Reservation[] || []);
    } catch (error) {
      console.error("Erreur chargement données:", error);
      toast({
        title: t("error"),
        description: t("admin_dashboard.messages.cannot_load_data"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getReservationState = (reservation: Reservation): "active" | "completed" | "expired" | "pending" | "refused" | "cancelled" => {
    const today = new Date();
    const pickup = new Date(reservation.pickup_date);
    const returnDate = new Date(reservation.return_date);

    if (reservation.status === "accepted") {
      if (today >= pickup && today <= returnDate) return "active";
      if (today > returnDate) return "completed";
    }

    if (reservation.status === "pending") return "pending";
    if (reservation.status === "refused") return "refused";
    if (reservation.status === "cancelled") return "cancelled";

    return "expired"; // par défaut
  };

  function calculateStats(vehicles: any[], allReservations: Reservation[], physicalVehicles: any[] = []) {
    // SOURCE OF TRUTH: sum of quantities from cars table
    const totalVehicles = vehicles.reduce((sum, v) => sum + Number(v.quantity || 0), 0);

    const activeRentals = allReservations.filter(r => {
      const today = new Date();
      const pickup = new Date(r.pickup_date);
      const returnDate = new Date(r.return_date);
      return r.status === "accepted" && today >= pickup && today <= returnDate;
    }).length;

    // Count vehicles currently in maintenance (not available for rental)
    const maintenanceCount = physicalVehicles.filter(v => v.status === "maintenance").length;

    // Available = total stock minus active rentals minus those in maintenance
    const availableVehicles = Math.max(0, totalVehicles - activeRentals - maintenanceCount);

    const currentMonthStart = startOfMonth(new Date());
    const currentMonthEnd = endOfMonth(new Date());

    const totalReservationsThisMonth = allReservations.filter(reservation => {
      const reservationDate = new Date(reservation.created_at);
      return isWithinInterval(reservationDate, { start: currentMonthStart, end: currentMonthEnd });
    }).length;

    const monthlyReservations = allReservations.filter(reservation => {
      const reservationDate = new Date(reservation.created_at);
      return (
        reservation.status === "accepted" &&
        isWithinInterval(reservationDate, { start: currentMonthStart, end: currentMonthEnd })
      );
    });

    const totalRevenue = monthlyReservations.reduce((sum, reservation) => {
      if (reservation.total_amount) {
        return sum + reservation.total_amount;
      } else {
        const pickupDate = new Date(reservation.pickup_date);
        const returnDate = new Date(reservation.return_date);
        const durationDays = Math.ceil(
          (returnDate.getTime() - pickupDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        const estimatedRevenue = reservation.car_price * Math.max(1, durationDays);
        return sum + estimatedRevenue;
      }
    }, 0);

    const performanceRate =
      totalVehicles > 0 ? Math.round((monthlyReservations.length / totalVehicles) * 100) : 0;

    setStats({
      totalVehicles,
      availableVehicles,
      totalRevenue,
      activeRentals,
      monthlyGrowth: 12.5,
      totalReservations: totalReservationsThisMonth,
      performanceRate,
    });
  };

  function prepareChartData(vehicles: any[], allReservations: Reservation[]) {
    const categoryStats: { [key: string]: number } = {};
    vehicles.forEach(vehicle => {
      const category = vehicle.category;
      categoryStats[category] = (categoryStats[category] || 0) + 1;
    });

    const categoryChartData = Object.keys(categoryStats).map(category => ({
      name: t(`admin_vehicles.categories.${category}`),
      value: categoryStats[category],
    }));
    setCategoryData(categoryChartData);

    const monthlyRevenue: { [key: string]: number } = {};
    const lastXMonthsRevenue = Array.from({ length: revenueRange }, (_, i) => {
      const date = new Date();
      date.setDate(1);
      date.setMonth(date.getMonth() - i);
      return date.toISOString().slice(0, 7);
    }).reverse();

    const lastXMonthsBooking = Array.from({ length: bookingRange }, (_, i) => {
      const date = new Date();
      date.setDate(1);
      date.setMonth(date.getMonth() - i);
      return date.toISOString().slice(0, 7);
    }).reverse();

    lastXMonthsRevenue.forEach(month => {
      monthlyRevenue[month] = 0;
    });

    allReservations
      .filter(res => {
        const state = getReservationState(res);
        return state === "active" || state === "completed";
      })
      .forEach(reservation => {
        const reservationMonth = reservation.created_at.slice(0, 7);
        if (monthlyRevenue.hasOwnProperty(reservationMonth)) {
          const revenue =
            reservation.total_amount ||
            (() => {
              const pickupDate = new Date(reservation.pickup_date);
              const returnDate = new Date(reservation.return_date);
              const durationDays = Math.ceil(
                (returnDate.getTime() - pickupDate.getTime()) / (1000 * 60 * 60 * 24)
              );
              return reservation.car_price * Math.max(1, durationDays);
            })();
          monthlyRevenue[reservationMonth] += revenue;
        }
      });

    // FONCTION POUR TRADUIRE LES MOIS
    const formatMonthForChart = (monthString: string) => {
      const [year, month] = monthString.split('-');
      const monthIndex = parseInt(month) - 1;

      const monthTranslations = [
        t("common.months.jan"), t("common.months.feb"), t("common.months.mar"),
        t("common.months.apr"), t("common.months.may"), t("common.months.jun"),
        t("common.months.jul"), t("common.months.aug"), t("common.months.sep"),
        t("common.months.oct"), t("common.months.nov"), t("common.months.dec")
      ];

      return `${monthTranslations[monthIndex]} ${year}`;
    };

    const revenueChartData = lastXMonthsRevenue.map(month => ({
      name: formatMonthForChart(month),
      value: Math.round(monthlyRevenue[month] / 100) * 100,
    }));
    setRevenueData(revenueChartData);

    const reservationTrend = lastXMonthsBooking.map(month => ({
      name: formatMonthForChart(month),
      value: allReservations.filter(
        res => res.created_at.slice(0, 7) === month && res.status === "accepted"
      ).length,
    }));
    setReservationTrendData(reservationTrend);
  };

  const formatDateSafe = (dateString: string) => {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? "Date invalide" : formatDateDisplay(date, "dd/MM/yyyy", i18n.language);
  };

  const COLORS = ["#2563EB", "#22C55E", "#F59E0B", "#8B5CF6", "#EC4899", "#06B6D4"];

  return (
    <>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-100">
                  <LayoutDashboard className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-[24px] font-semibold text-gray-900 mb-2">
                    {t("admin_dashboard.title")}
                  </h1>
                  <p className="text-gray-600 font-medium">{t("admin_dashboard.subtitle")}</p>
                </div>
              </div>
            </div>
          </motion.div>

          {isLoading ? (
            <div className="flex justify-center items-center h-[60vh]">
              <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-600"></div>
            </div>
          ) : (
            <>
              {/* Statistiques */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
              >
                <StatCard
                  title={t("admin_reservations.total_reservations", "Réservations ce mois") || "Réservations ce mois"}
                  value={stats.totalReservations}
                  subtitle={t("admin_dashboard.stats.this_month", "Ce mois-ci") || "Ce mois-ci"}
                  icon={Calendar}
                  color="blue"
                />
                <StatCard
                  title={t("admin_dashboard.stats.total_vehicles", "Total véhicules") || "Total véhicules"}
                  value={stats.totalVehicles}
                  subtitle={t("admin_dashboard.stats.in_fleet", "Dans la flotte") || "Dans la flotte"}
                  icon={Car}
                  color="green"
                />
                <StatCard
                  title={t("admin_dashboard.stats.active_reservations", "Réservations actives") || "Réservations actives"}
                  value={stats.activeRentals}
                  subtitle={t("admin_dashboard.stats.currently_ongoing", "En cours") || "En cours"}
                  icon={Clock}
                  color="purple"
                />
                <StatCard
                  title={t("admin_vehicles.status.available", "Véhicules disponibles") || "Véhicules disponibles"}
                  value={stats.availableVehicles}
                  subtitle={t("admin_dashboard.stats.ready_to_rent", "Prêts à louer") || "Prêts à louer"}
                  icon={Zap}
                  color="orange"
                />
              </motion.div>

              {/* Graphiques */}
              <motion.div
                key={`${i18n.language}-${chartKey}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8"
              >
                <ChartCard
                  title={t("admin_dashboard.charts.revenue.title")}
                  subtitle={t("admin_dashboard.charts.revenue.subtitle")}
                  icon={TrendingUp}
                  color="green"
                  action={
                    <div className="flex items-center bg-slate-100 p-1 rounded-lg gap-0.5">
                      <button
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                          revenueRange === 6 ? "bg-white shadow text-slate-800" : "text-slate-500 hover:text-slate-700"
                        }`}
                        onClick={() => setRevenueRange(6)}
                      >
                        6M
                      </button>
                      <button
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                          revenueRange === 12 ? "bg-white shadow text-slate-800" : "text-slate-500 hover:text-slate-700"
                        }`}
                        onClick={() => setRevenueRange(12)}
                      >
                        12M
                      </button>
                    </div>
                  }
                >
                  <div className="w-full h-[220px] md:h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={revenueData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => `${value} MAD`}
                        />
                        <Tooltip
                          formatter={(value: number) => [
                            `${value.toLocaleString()} MAD`,
                            t("admin_dashboard.charts.revenue.tooltip")
                          ]}
                        />
                        <Bar
                          dataKey="value"
                          fill="#2563EB"
                          name={t("admin_dashboard.charts.revenue.tooltip")}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>

                <ChartCard
                  title={t("admin_dashboard.charts.categories.title")}
                  subtitle={t("admin_dashboard.charts.categories.subtitle")}
                  icon={Car}
                  color="blue"
                >
                  <div className="w-full h-[280px] md:h-[320px] flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart margin={{ top: 20, right: 30, left: 30, bottom: 20 }}>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => 
                            isMobile 
                              ? `${(percent * 100).toFixed(0)}%` 
                              : `${name} ${(percent * 100).toFixed(0)}%`
                          }
                          outerRadius={90}
                          dataKey="value"
                          nameKey="name"
                        >
                          {categoryData.map((entry, index) => (
                            <Cell
                              key={`cell-${entry.name}-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => [
                            value,
                            t("admin_dashboard.charts.categories.tooltip")
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* External Legend for Mobile */}
                  <div className="mt-4 md:hidden space-y-2">
                    {categoryData.map((entry, index) => (
                      <div key={entry.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="text-slate-700">{entry.name}</span>
                        </div>
                        <span className="font-semibold text-slate-900">
                          {entry.value} ({((entry.value / categoryData.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(0)}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </ChartCard>

                <ChartCard
                  className="lg:col-span-2"
                  title={t("admin_dashboard.charts.reservation_trend.title")}
                  subtitle={t("admin_dashboard.charts.reservation_trend.subtitle")}
                  icon={Calendar}
                  color="pink"
                  action={
                    <div className="flex items-center bg-slate-100 p-1 rounded-lg gap-0.5">
                      <button
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                          bookingRange === 6 ? "bg-white shadow text-slate-800" : "text-slate-500 hover:text-slate-700"
                        }`}
                        onClick={() => setBookingRange(6)}
                      >
                        6M
                      </button>
                      <button
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                          bookingRange === 12 ? "bg-white shadow text-slate-800" : "text-slate-500 hover:text-slate-700"
                        }`}
                        onClick={() => setBookingRange(12)}
                      >
                        12M
                      </button>
                    </div>
                  }
                >
                  <div className="w-full h-[250px] md:h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={reservationTrendData}>
                        <defs>
                          <linearGradient id="vividGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#EC4899" stopOpacity={0.8} />
                            <stop offset="100%" stopColor="#F9A8D4" stopOpacity={0.1} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6B7280' }} />
                        <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} />
                        <Tooltip
                          formatter={(value: number) => [value, t("admin_dashboard.charts.reservation_trend.tooltip")]}
                          contentStyle={{ borderRadius: '8px', backgroundColor: '#fff', borderColor: '#E5E7EB' }}
                        />
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="none"
                          fill="url(#vividGradient)"
                          fillOpacity={1}
                          isAnimationActive={true}
                          animationDuration={2000}
                        />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#EC4899"
                          strokeWidth={3}
                          dot={{ r: 0 }}
                          activeDot={{ r: 6 }}
                          name={t("admin_dashboard.charts.reservation_trend.tooltip")}
                          isAnimationActive={true}
                          animationDuration={2000}
                          animationEasing="ease-out"
                          animationBegin={300}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>
              </motion.div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function StatCard({ title, value, subtitle, icon: Icon, color }: any) {
  const colorClasses: any = {
    blue: "text-blue-600 bg-blue-50",
    green: "text-green-600 bg-green-50",
    purple: "text-purple-600 bg-purple-50",
    orange: "text-orange-600 bg-orange-50",
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md border transition-all">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-600">{title}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
          <p className="text-xs font-semibold text-slate-500 mt-1">{subtitle}</p>
        </div>
        <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
          <Icon className={`h-6 w-6 ${colorClasses[color].split(" ")[0]}`} />
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, icon: Icon, color, children, className, action }: any) {
  const colorMap: any = {
    blue: "text-blue-600 bg-blue-50",
    green: "text-green-600 bg-green-50",
    orange: "text-orange-600 bg-orange-50",
    pink: "text-pink-600 bg-pink-50"
  };
  return (
    <div className={`bg-white rounded-2xl p-6 shadow-sm hover:shadow-md border transition-all ${className || ""}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${colorMap[color]}`}>
            <Icon className={`h-5 w-5 ${colorMap[color].split(" ")[0]}`} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">{title}</h3>
            <p className="text-sm font-medium text-slate-600">{subtitle}</p>
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </div>
  );
}