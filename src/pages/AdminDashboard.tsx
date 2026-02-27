import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  Car, 
  Calendar, 
  Users,
  DollarSign,
  ChevronRight,
  MapPin,
  Clock,
  Zap,
  TrendingUp
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
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
  LineChart,
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

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Forcer le re-rendu pour les traductions instantanées
    setTranslationKey(prev => prev + 1);
    
    // Recalculer les données des graphiques si nécessaire
    if (vehicles.length > 0 && allReservations.length > 0) {
      prepareChartData(vehicles, allReservations);
    }
  }, [i18n.language]);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      const { data: carsData, error: carsError } = await supabase
        .from("cars")
        .select("*")
        .is("is_deleted", false);

      if (carsError) throw carsError;
      setVehicles(carsData || []);

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

      calculateStats(carsData || [], allResData as Reservation[] || []);
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

  const calculateStats = (vehicles: any[], allReservations: Reservation[]) => {
    const totalVehicles = vehicles.length;
    const availableVehicles = vehicles.filter(v => v.available).length;

    const currentMonthStart = startOfMonth(new Date());
    const currentMonthEnd = endOfMonth(new Date());

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

    const activeRentals = allReservations.filter(r => {
      const today = new Date();
      const pickup = new Date(r.pickup_date);
      const returnDate = new Date(r.return_date);
      return r.status === "accepted" && today >= pickup && today <= returnDate;
    }).length;

    const performanceRate =
      totalVehicles > 0 ? Math.round((monthlyReservations.length / totalVehicles) * 100) : 0;

    const totalActiveReservations = activeRentals;

    setStats({
      totalVehicles,
      availableVehicles,
      totalRevenue,
      activeRentals,
      monthlyGrowth: 12.5,
      totalReservations: totalActiveReservations,
      performanceRate,
    });
  };

  // FONCTION POUR TRADUIRE LES STATUTS
  const translateStatus = (status: string) => {
    return t(`admin_dashboard.recent_reservations.status.${status.toLowerCase()}`, { defaultValue: status });
  };

  // FONCTION POUR LES COULEURS DES STATUTS
  const getStatusColorClasses = (status: string) => {
    const statusColors: { [key: string]: string } = {
      pending: "bg-yellow-100 text-yellow-800",
      accepted: "bg-green-100 text-green-800",
      confirmed: "bg-blue-100 text-blue-800",
      cancelled: "bg-purple-100 text-purple-800",
      refused: "bg-red-100 text-red-800",
      expired: "bg-orange-100 text-orange-800"
    };
    
    return statusColors[status.toLowerCase()] || "bg-gray-100 text-gray-800";
  };

  const prepareChartData = (vehicles: any[], allReservations: Reservation[]) => {
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
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      return date.toISOString().slice(0, 7);
    }).reverse();
  
    last6Months.forEach(month => {
      monthlyRevenue[month] = 0;
    });
  
    allReservations
      .filter(res => res.status === "accepted")
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
  
    const revenueChartData = last6Months.map(month => ({
      name: formatMonthForChart(month), // ← Utiliser la nouvelle fonction
      value: Math.round(monthlyRevenue[month] / 100) * 100,
    }));
    setRevenueData(revenueChartData);
  
    const reservationTrend = last6Months.map(month => ({
      name: formatMonthForChart(month), // ← Utiliser la nouvelle fonction
      value: allReservations.filter(
        res => res.created_at.slice(0, 7) === month && res.status === "accepted"
      ).length,
    }));
    setReservationTrendData(reservationTrend);
  };

  const formatDateSafe = (dateString: string) => {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? "Date invalide" : format(date, "dd/MM/yyyy");
  };

  const COLORS = ["#2563EB", "#22C55E", "#F59E0B", "#8B5CF6", "#EC4899", "#06B6D4"];

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {t("admin_dashboard.title")}
            </h1>
            <p className="text-gray-600">{t("admin_dashboard.subtitle")}</p>
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
                  title={t("admin_dashboard.stats.total_vehicles")}
                  value={stats.totalVehicles}
                  subtitle={t("admin_dashboard.stats.in_fleet")}
                  icon={Car}
                  color="blue"
                />
                <StatCard
                  title={t("admin_dashboard.stats.performance")}
                  value={`${stats.performanceRate}%`}
                  subtitle={t("admin_dashboard.stats.reservation_ratio")}
                  icon={Zap}
                  trend={stats.monthlyGrowth}
                  color="green"
                />
                <StatCard
                  title={t("admin_dashboard.stats.total_revenue")}
                  value={`${stats.totalRevenue.toLocaleString()} MAD`}
                  subtitle={t("admin_dashboard.stats.this_month")}
                  icon={DollarSign}
                  color="purple"
                />
                <StatCard
                  title={t("admin_dashboard.stats.active_reservations")}
                  value={stats.totalReservations}
                  subtitle={t("admin_dashboard.stats.currently_ongoing")}
                  icon={Users}
                  color="orange"
                />
              </motion.div>

              {/* Graphiques */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8 }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8"
                key={translationKey}
              >
                <ChartCard
                  title={t("admin_dashboard.charts.revenue.title")}
                  subtitle={t("admin_dashboard.charts.revenue.subtitle")}
                  icon={TrendingUp}
                  color="green"
                >
                  <ResponsiveContainer width="100%" height={300}>
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
                </ChartCard>

                <ChartCard
                  title={t("admin_dashboard.charts.categories.title")}
                  subtitle={t("admin_dashboard.charts.categories.subtitle")}
                  icon={Car}
                  color="blue"
                >
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                        outerRadius={100}
                        dataKey="value"
                        nameKey="name"
                      >
                        {categoryData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
                </ChartCard>
              </motion.div>

              {/* Réservations récentes */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.9 }}
                className="bg-white rounded-2xl shadow-md p-6 border"
              >
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {t("admin_dashboard.recent_reservations.title")}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {t("admin_dashboard.recent_reservations.subtitle")}
                    </p>
                  </div>
                  <Link to="/admin/reservations">
                    <Button variant="ghost" size="sm" className="text-blue-600">
                      {t("admin_dashboard.actions.see_all")}{" "}
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
                {/* Placeholder si aucune donnée */}
                {allReservations.length === 0 ? (
                  <div className="text-center text-gray-500 py-12">
                    <Clock className="h-10 w-10 mx-auto mb-2 text-gray-400" />
                    <p>{t("admin_dashboard.messages.no_recent_reservations")}</p>
                  </div>
                ) : (
                  allReservations.slice(0, 5).map((r,index) => (
                    <div 
                      key={r.id || `reservation-${index}`} 
                      className="p-4 border rounded-lg mb-2 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-800">
                          {r.car_name || "Véhicule non spécifié"}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColorClasses(r.status)}`}>
                          {translateStatus(r.status) || t("common.unknown")}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {formatDateSafe(r.pickup_date)} - {formatDateSafe(r.return_date)}
                      </p>
                    </div>
                  ))
                )}
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
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
        </div>
        <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
          <Icon className={`h-6 w-6 ${colorClasses[color].split(" ")[0]}`} />
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, icon: Icon, color, children }: any) {
  const colorMap: any = {
    blue: "text-blue-600 bg-blue-50",
    green: "text-green-600 bg-green-50",
    orange: "text-orange-600 bg-orange-50",
  };
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md border transition-all">
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2 rounded-lg ${colorMap[color]}`}>
          <Icon className={`h-5 w-5 ${colorMap[color].split(" ")[0]}`} />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}
