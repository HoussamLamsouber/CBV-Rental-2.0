import { CarCard } from "@/components/CarCard";
import { Database } from "@/integrations/supabase/types";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";

type Car = Database["public"]["Tables"]["cars"]["Row"] & {
  isAvailable?: boolean; // Ajoutez cette ligne
};

interface CarGridProps {
  cars: Car[];
  onReserve: (car: Car) => void;
  canReserve: boolean;
}

export const CarGrid = ({ cars, onReserve, canReserve }: CarGridProps) => {
  const [sortBy, setSortBy] = useState("price");
  const [filterBy, setFilterBy] = useState("all");
  const { t } = useTranslation();

  // Utilisez isAvailable pour le comptage
  const availableCars = cars.filter(car => car.isAvailable !== undefined ? car.isAvailable : car.available);
  const totalCars = cars.length;

  const filteredCars = cars.filter(car => {
    if (filterBy === "all") return true;
    if (filterBy === "available") {
      return car.isAvailable !== undefined ? car.isAvailable : car.available;
    }
    // Utilisez directement la comparaison avec la clé de catégorie
    return car.category === filterBy;
  });

  const sortedCars = [...filteredCars].sort((a, b) => {
    switch (sortBy) {
      case "price":
        return a.price - b.price;
      case "price-desc":
        return b.price - a.price;
      case "name":
        return a.name.localeCompare(b.name);
      default:
        return 0;
    }
  });

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
          <div>
            <h2 className="text-xl font-semibold mb-2">{t('car_grid.title')}</h2>
            <p className="text-muted-foreground">
              {t('car_grid.available_count')
                .replace('{available}', availableCars.length.toString())
                .replace('{total}', totalCars.toString())
              }    
            </p>
          </div>

          {/* Filters and Sort */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterBy} onValueChange={setFilterBy}> 
                <SelectTrigger className="w-[180px] no-focus-ring">
                  <SelectValue placeholder={t('car_grid.filter.placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('car_grid.filter.all_vehicles')}</SelectItem>
                  <SelectItem value="available">{t('car_grid.filter.available_only')}</SelectItem>
                  <SelectItem value="category_sedan">{t('car_grid.categories.sedan')}</SelectItem>
                  <SelectItem value="category_electric">{t('car_grid.categories.electric')}</SelectItem>
                  <SelectItem value="category_suv">{t('car_grid.categories.suv')}</SelectItem>
                  <SelectItem value="category_urban_suv">{t('car_grid.categories.suv_urban')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px] no-focus-ring">
                  <SelectValue placeholder={t('car_grid.sort.placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="price">{t('car_grid.sort.price_asc')}</SelectItem>
                  <SelectItem value="price-desc">{t('car_grid.sort.price_desc')}</SelectItem>
                  <SelectItem value="name">{t('car_grid.sort.name_asc')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>



        {/* Car Grid */}
        {sortedCars.length > 0 ? (
          <motion.div 
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ staggerChildren: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
          >
            {sortedCars.map((car, index) => (
              <motion.div 
                key={car.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 260, 
                  damping: 20, 
                  delay: index * 0.05 
                }}
                className="h-full"
              >
                <CarCard
                  car={car}
                  onReserve={onReserve}
                  canReserve={canReserve}
                />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
            <p className="text-gray-500 text-lg font-medium">
              {t('car_grid.messages.no_vehicles_match')}
            </p>
          </div>
        )}
      </div>
    </section>
  );
};