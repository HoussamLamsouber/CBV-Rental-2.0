// src/pages/AdminVehicles.tsx
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog } from "@headlessui/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Car, ArrowRight, Upload, X, Table, Search, Filter, Edit, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";


interface Vehicle {
  id: string;
  name: string;
  category: string;
  image_url: string;
  price: number;
  available: boolean;
  quantity: number;
  fuel?: string;
  seats?: number;
  transmission?: string;
  reservation_count?: number;
  available_now?: number;
  maintenance_count?: number;
}

export default function AdminVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const { toast } = useToast();
  const { t } = useTranslation();

  const [newVehicle, setNewVehicle] = useState({
    name: "",
    category: "",
    price: "",
    image_url: "",
    fuel: "",
    seats: "",
    transmission: ""
  });

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      setIsLoading(true);

      // Récupère les modèles
      const { data: carsData, error: carsError } = await supabase
        .from("cars")
        .select("*")
        .is("is_deleted", false);

      if (carsError) throw carsError;

      // Récupère l'état réel de chaque véhicule physique
      const { data: vehiclesData, error: vehiclesError } = await supabase
        .from("vehicles")
        .select("car_id, status")
        .is("is_deleted", false);

      if (vehiclesError) throw vehiclesError;

      // Construire la map count par modèle
      const stockTracker = (carsData || []).map(car => {
        // Log full object for debugging as requested by user
        console.log('Vehicle data from DB (AdminVehicles):', car);

        // SOURCE OF TRUTH: must use car.quantity
        const totalStock = Number(car.quantity || 0);
        
        // Count reservations from established units if needed for "available_now"
        const relatedVehicles = (vehiclesData || []).filter(v => v.car_id === car.id);
        const reservedCount = relatedVehicles.filter(v => v.status === "reserved").length;

        return {
          ...car,
          quantity: totalStock,
          available_now: Math.max(0, totalStock - reservedCount),
          reservation_count: reservedCount,
          maintenance_count: relatedVehicles.filter(v => v.status === "maintenance").length,
        };
      });

      setVehicles(stockTracker);
    } catch (error) {
      console.error(error);
      toast({
        title: t("error"),
        description: t('admin_vehicles.messages.cannot_load_data'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    try {
      setImageUploading(true);

      // Vérifier la taille du fichier (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: t('admin_vehicles.messages.file_too_large'),
          description: t('admin_vehicles.messages.file_too_large_description'),
          variant: "destructive",
        });
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `vehicle-images/${fileName}`;

      console.log("Uploading file:", filePath);

      const { error: uploadError } = await supabase.storage
        .from('cars')
        .upload(filePath, file);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw uploadError;
      }

      // Récupérer l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('cars')
        .getPublicUrl(filePath);

      console.log("Public URL:", publicUrl);

      setNewVehicle(prev => ({ ...prev, image_url: publicUrl }));

      toast({
        title: t('admin_vehicles.messages.image_uploaded'),
        description: t('admin_vehicles.messages.image_upload_success'),
      });
    } catch (error: any) {
      console.error("Erreur upload image:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de télécharger l'image",
        variant: "destructive",
      });
    } finally {
      setImageUploading(false);
    }
  };

  const handleCreateVehicle = async (e: React.FormEvent) => {

    e.preventDefault(); // ← AJOUTEZ CETTE LIGNE

    // DEBUG: Afficher les valeurs actuelles
    console.log('Valeurs du formulaire:', {
      name: newVehicle.name,
      category: newVehicle.category,
      price: newVehicle.price,
      fuel: newVehicle.fuel,
      transmission: newVehicle.transmission,
      seats: newVehicle.seats
    });

    // Validation améliorée
    const requiredFields = [
      { field: 'name', value: newVehicle.name, label: 'Nom du modèle' },
      { field: 'category', value: newVehicle.category, label: 'Catégorie' },
      { field: 'price', value: newVehicle.price, label: 'Prix' },
      { field: 'fuel', value: newVehicle.fuel, label: 'Carburant' },
      { field: 'transmission', value: newVehicle.transmission, label: 'Transmission' },
      { field: 'seats', value: newVehicle.seats, label: 'Sièges' }
    ];

    const missingFields = requiredFields.filter(field => !field.value);

    if (missingFields.length > 0) {
      console.log('❌ Champs manquants:', missingFields);
      toast({
        title: t('admin_vehicles.messages.missing_fields'),
        description: `Champs obligatoires manquants: ${missingFields.map(f => f.label).join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    // Validation des nombres
    const price = Number(newVehicle.price);
    const seats = Number(newVehicle.seats);

    if (isNaN(price) || price <= 0) {
      toast({
        title: t('admin_vehicles.messages.invalid_price'),
        description: t('admin_vehicles.messages.invalid_price_description'),
        variant: "destructive",
      });
      return;
    }

    if (isNaN(seats) || seats < 1 || seats > 9) {
      toast({
        title: t('admin_vehicles.messages.invalid_seats'),
        description: t('admin_vehicles.messages.invalid_seats_description'),
        variant: "destructive",
      });
      return;
    }

    if (!newVehicle.name || !newVehicle.category || !newVehicle.price) {
      toast({
        title: t('admin_vehicles.messages.missing_fields'),
        description: t('admin_vehicles.messages.fill_required_fields'),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const generatedId = newVehicle.name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      const { data: existingCar } = await supabase
        .from("cars")
        .select("id")
        .eq("id", generatedId)
        .single();

      if (existingCar) {
        toast({
          title: t('admin_vehicles.messages.duplicate_model'),
          description: t('admin_vehicles.messages.model_already_exists', { name: newVehicle.name }),
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from("cars")
        .insert([{
          id: generatedId,
          name: newVehicle.name,
          category: newVehicle.category,
          price: Number(newVehicle.price),
          quantity: 0,
          image_url: newVehicle.image_url || null,
          fuel: newVehicle.fuel,
          seats: newVehicle.seats ? Number(newVehicle.seats) : null,
          transmission: newVehicle.transmission,
          available: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }]);

      if (error) throw error;

      toast({
        title: t('admin_vehicles.messages.model_created'),
        description: t('admin_vehicles.messages.model_created_success', { name: newVehicle.name }),
      });

      // Reset form
      setNewVehicle({
        name: "",
        category: "",
        price: "",
        image_url: "",
        fuel: "fuel_gasoline",
        seats: "",
        transmission: "transmission_manual"
      });

      setIsCreateModalOpen(false);
      fetchVehicles();
    } catch (error: any) {
      console.error("❌ Erreur création modèle:", error);
      toast({
        title: t("error"),
        description: error.message || t('admin_vehicles.messages.cannot_create_model'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setNewVehicle({
      name: "",
      category: "",
      price: "",
      image_url: "",
      fuel: "fuel_gasoline",
      seats: "",
      transmission: "transmission_manual"
    });
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setNewVehicle({
      name: vehicle.name,
      category: vehicle.category,
      price: vehicle.price.toString(),
      image_url: vehicle.image_url || "",
      fuel: vehicle.fuel || "fuel_gasoline",
      seats: vehicle.seats?.toString() || "",
      transmission: vehicle.transmission || "transmission_manual"
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateVehicle = async () => {
    if (!editingVehicle || !newVehicle.name || !newVehicle.category || !newVehicle.price) {
      toast({
        title: t('admin_vehicles.messages.missing_fields'),
        description: t('admin_vehicles.messages.fill_required_fields'),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("cars")
        .update({
          name: newVehicle.name,
          category: newVehicle.category,
          price: Number(newVehicle.price),
          image_url: newVehicle.image_url || null,
          fuel: newVehicle.fuel,
          seats: newVehicle.seats ? Number(newVehicle.seats) : null,
          transmission: newVehicle.transmission,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingVehicle.id);

      if (error) throw error;

      toast({
        title: t('admin_vehicles.messages.model_updated'),
        description: t('admin_vehicles.messages.model_updated_success', { name: newVehicle.name }),
      });

      resetForm();
      setIsEditModalOpen(false);
      setEditingVehicle(null);
      fetchVehicles();
    } catch (error: any) {
      console.error("Erreur modification modèle:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de modifier le modèle",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteVehicle = async (vehicle: Vehicle) => {
    if (!confirm(t('admin_vehicles.messages.delete_confirm', { name: vehicle.name }))) {
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("cars")
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", vehicle.id);

      if (error) throw error;

      toast({
        title: t('admin_vehicles.messages.model_deleted'),
        description: t('admin_vehicles.messages.model_deleted_success', { name: vehicle.name }),
      });

      fetchVehicles();
    } catch (error: any) {
      console.error("Erreur suppression modèle:", error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer le modèle",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getAvailabilityColor = (available_now: number, quantity: number) => {
    const ratio = available_now / quantity;

    if (available_now === 0) return "bg-red-100 text-red-800 border-red-300";
    if (ratio <= 0.3) return "bg-orange-100 text-orange-800 border-orange-300";
    if (ratio <= 0.7) return "bg-yellow-100 text-yellow-800 border-yellow-300";
    return "bg-green-100 text-green-800 border-green-300";
  };

  // Filtrage des véhicules
  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesSearch = searchTerm === "" ||
      vehicle.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.category.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = filterCategory === "all" || vehicle.category === filterCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          {/* En-tête amélioré */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-100">
                  <Car className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-[24px] font-semibold text-slate-900 mb-2">
                    {t('admin_vehicles.title')}
                  </h1>
                  <p className="text-slate-600 text-sm sm:text-base font-medium">
                    {t('admin_vehicles.subtitle')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2.5 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-sm hover:shadow-md"
                >
                  <Plus className="h-4 w-4" />
                  {t('admin_vehicles.actions.add_vehicle')}
                </button>
              </div>
            </div>
          </div>

          {/* Barre de recherche et filtres */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 h-4 w-4" />
                <input
                  type="text"
                  placeholder={t('admin_vehicles.search.placeholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 input-base"
                />
              </div>

              <div className="flex gap-3">
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 h-4 w-4" />
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="pl-10 input-base w-[220px]"
                  >
                    <option value="all">{t('admin_vehicles.filters.all_categories')}</option>
                    <option value="category_electric">{t('admin_vehicles.categories.category_electric')}</option>
                    <option value="category_suv">{t('admin_vehicles.categories.category_suv')}</option>
                    <option value="category_urban_suv">{t('admin_vehicles.categories.category_urban_suv')}</option>
                    <option value="category_sedan">{t('admin_vehicles.categories.category_sedan')}</option>
                  </select>
                </div>

                {(searchTerm || filterCategory !== "all") && (
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setFilterCategory("all");
                    }}
                    className="flex items-center gap-2 px-4 py-3 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors text-sm"
                  >
                    <X className="h-4 w-4" />
                    {t('admin_vehicles.search.reset')}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Liste des véhicules */}
          {isLoading ? (
            <div className="text-center py-24">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">{t('admin_vehicles.messages.loading')}</p>
            </div>
          ) : filteredVehicles.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <div className="text-gray-300 text-6xl mb-4">🚗</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                {searchTerm || filterCategory !== "all"
                  ? t('admin_vehicles.messages.no_results_title')
                  : t('admin_vehicles.messages.no_vehicles_title')
                }
              </h3>
              <p className="text-gray-600 max-w-md mx-auto mb-6">
                {searchTerm || filterCategory !== "all"
                  ? t('admin_vehicles.messages.no_results_description')
                  : t('admin_vehicles.messages.no_vehicles_description')
                }
              </p>
              {(searchTerm || filterCategory !== "all") ? (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setFilterCategory("all");
                  }}
                  className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {t('admin_vehicles.search.reset')}
                </button>
              ) : (
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2.5 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all"
                >
                  <Plus className="h-4 w-4 inline mr-2" />
                  {t('admin_vehicles.actions.add_vehicle')}
                </button>
              )}
            </div>
          ) : (
            // Vue tableau uniquement
            <div className="overflow-hidden bg-white rounded-xl shadow-sm border border-gray-100">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-slate-50/80 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
                      {t('admin_vehicles.table.vehicle')}
                    </th>
                    <th className="px-6 py-4 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
                      {t('admin_vehicles.table.category')}
                    </th>
                    <th className="px-6 py-4 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
                      {t('admin_vehicles.table.price')}
                    </th>
                    <th className="px-6 py-4 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
                      {t('admin_vehicles.table.availability')}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {t('admin_vehicles.table.seats')}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {t('admin_vehicles.table.fuel')}
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {t('admin_vehicles.table.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredVehicles.map((vehicle) => (
                    <tr key={vehicle.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <img
                            src={vehicle.image_url || "/placeholder-car.jpg"}
                            alt={vehicle.name}
                            className="w-12 h-8 object-cover rounded-lg"
                          />
                          <span className="text-sm font-medium text-gray-900">{vehicle.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {t(`admin_vehicles.categories.${vehicle.category}`)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {vehicle.price} MAD
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAvailabilityColor(vehicle.available_now ?? 0, vehicle.quantity)
                          }`}>
                          {vehicle.available_now === 0
                            ? t('admin_vehicles.status.fully_booked')
                            : `${vehicle.available_now}/${vehicle.quantity}`}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {vehicle.seats || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {t(`admin_vehicles.fuel_types.${vehicle.fuel}`)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex justify-center gap-1">
                          <Link
                            to={`/admin/vehicle/${vehicle.id}`}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title={t('admin_vehicles.actions.view_details')}
                          >
                            <Car className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => handleEditVehicle(vehicle)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title={t('admin_vehicles.actions.edit')}
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteVehicle(vehicle)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title={t('admin_vehicles.actions.delete')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Create Vehicle Modal amélioré */}
          <Dialog open={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} className="relative z-50">
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
            <div className="fixed inset-0 flex items-center justify-center p-4">
              <Dialog.Panel className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <Dialog.Title className="text-xl font-semibold mb-6 flex items-center gap-2">
                  <Car className="h-5 w-5" />
                  {t('admin_vehicles.modals.create_vehicle.title')}
                </Dialog.Title>

                <form onSubmit={handleCreateVehicle} className="space-y-6">
                  {/* Section Informations de base */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      {t('admin_vehicles.modals.create_vehicle.basic_info')}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name" className="text-sm font-medium">
                          {t('admin_vehicles.modals.create_vehicle.model_name')} *
                        </Label>
                        <Input
                          id="name"
                          value={newVehicle.name}
                          onChange={(e) => setNewVehicle({ ...newVehicle, name: e.target.value })}
                          placeholder={t('admin_vehicles.modals.create_vehicle.model_name_placeholder')}
                          className="mt-1"
                          required
                          minLength={2}
                        />
                      </div>

                      <div>
                        <Label htmlFor="category" className="text-sm font-medium">
                          {t('admin_vehicles.modals.create_vehicle.category')} *
                        </Label>
                        <select
                          id="category"
                          value={newVehicle.category}
                          onChange={(e) => setNewVehicle({ ...newVehicle, category: e.target.value })}
                          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus-subtle"
                          required
                        >
                          <option value="">{t('admin_vehicles.modals.create_vehicle.select_category')}</option>
                          <option value="category_electric">{t('admin_vehicles.categories.category_electric')}</option>
                          <option value="category_suv">{t('admin_vehicles.categories.category_suv')}</option>
                          <option value="category_urban_suv">{t('admin_vehicles.categories.category_urban_suv')}</option>
                          <option value="category_sedan">{t('admin_vehicles.categories.category_sedan')}</option>
                        </select>
                      </div>

                      <div>
                        <Label htmlFor="price" className="text-sm font-medium">
                          {t('admin_vehicles.modals.create_vehicle.price_per_day')} (MAD) *
                        </Label>
                        <Input
                          id="price"
                          type="number"
                          value={newVehicle.price}
                          onChange={(e) => setNewVehicle({ ...newVehicle, price: e.target.value })}
                          placeholder="0.00"
                          className="mt-1"
                          min="0"
                          step="0.01"
                          required
                        />
                      </div>

                    </div>
                  </div>

                  {/* Section Spécifications techniques */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      {t('admin_vehicles.modals.create_vehicle.technical_specs')}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="fuel" className="text-sm font-medium">
                          {t('admin_vehicles.modals.create_vehicle.fuel')} *
                        </Label>
                        <select
                          id="fuel"
                          value={newVehicle.fuel}
                          onChange={(e) => setNewVehicle({ ...newVehicle, fuel: e.target.value })}
                          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus-subtle"
                          required
                        >
                          <option value="">{t('admin_vehicles.modals.create_vehicle.select_fuel')}</option>
                          <option value="fuel_gasoline">{t('admin_vehicles.fuel_types.fuel_gasoline')}</option>
                          <option value="fuel_diesel">{t('admin_vehicles.fuel_types.fuel_diesel')}</option>
                          <option value="fuel_electric">{t('admin_vehicles.fuel_types.fuel_electric')}</option>
                          <option value="fuel_hybrid">{t('admin_vehicles.fuel_types.fuel_hybrid')}</option>
                        </select>
                      </div>

                      <div>
                        <Label htmlFor="transmission" className="text-sm font-medium">
                          {t('admin_vehicles.modals.create_vehicle.transmission')} *
                        </Label>
                        <select
                          id="transmission"
                          value={newVehicle.transmission}
                          onChange={(e) => setNewVehicle({ ...newVehicle, transmission: e.target.value })}
                          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus-subtle"
                          required
                        >
                          <option value="">{t('admin_vehicles.modals.create_vehicle.select_transmission')}</option>
                          <option value="transmission_manual">{t('admin_vehicles.transmission_types.transmission_manual')}</option>
                          <option value="transmission_automatic">{t('admin_vehicles.transmission_types.transmission_automatic')}</option>
                        </select>
                      </div>

                      <div>
                        <Label htmlFor="seats" className="text-sm font-medium">
                          {t('admin_vehicles.modals.create_vehicle.seats')} *
                        </Label>
                        <Input
                          id="seats"
                          type="number"
                          value={newVehicle.seats}
                          onChange={(e) => setNewVehicle({ ...newVehicle, seats: e.target.value })}
                          placeholder="5"
                          className="mt-1"
                          min="1"
                          max="9"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section Image */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      {t('admin_vehicles.modals.create_vehicle.image_section')}
                    </h3>
                    <div className="space-y-4">
                      {newVehicle.image_url ? (
                        <div className="relative">
                          <img
                            src={newVehicle.image_url}
                            alt={t('admin_vehicles.modals.create_vehicle.image_preview_alt')}
                            className="w-full h-48 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => setNewVehicle(prev => ({ ...prev, image_url: "" }))}
                            className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                          <input
                            type="file"
                            id="image-upload"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleImageUpload(file);
                            }}
                            className="hidden"
                          />
                          <label
                            htmlFor="image-upload"
                            className="cursor-pointer flex flex-col items-center justify-center"
                          >
                            <Upload className="h-8 w-8 text-slate-400 mb-2" />
                            <p className="text-gray-600">
                              {imageUploading
                                ? t('admin_vehicles.modals.create_vehicle.uploading')
                                : t('admin_vehicles.modals.create_vehicle.upload_image')
                              }
                            </p>
                          </label>
                        </div>
                      )}

                      <div>
                        <Label htmlFor="image_url" className="text-sm font-medium">
                          {t('admin_vehicles.modals.create_vehicle.or_enter_url')}
                        </Label>
                        <Input
                          id="image_url"
                          value={newVehicle.image_url}
                          onChange={(e) => setNewVehicle({ ...newVehicle, image_url: e.target.value })}
                          placeholder={t('admin_vehicles.modals.create_vehicle.url_placeholder')}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-6 border-t mt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        resetForm();
                        setIsCreateModalOpen(false);
                      }}
                      disabled={isLoading}
                    >
                      {t('admin_vehicles.modals.create_vehicle.cancel')}
                    </Button>

                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={resetForm}
                        disabled={isLoading}
                      >
                        {t('admin_vehicles.modals.create_vehicle.reset')}
                      </Button>
                      <Button
                        type="submit"
                        disabled={isLoading}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {isLoading
                          ? t('admin_vehicles.modals.create_vehicle.creating')
                          : t('admin_vehicles.modals.create_vehicle.create_model')
                        }
                      </Button>
                    </div>
                  </div>
                </form>
              </Dialog.Panel>
            </div>
          </Dialog>

          {/* Edit Vehicle Modal */}
          <Dialog open={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} className="relative z-50">
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
            <div className="fixed inset-0 flex items-center justify-center p-4">
              <Dialog.Panel className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <Dialog.Title className="text-xl font-semibold mb-6 flex items-center gap-2">
                  <Edit className="h-5 w-5" />
                  {t('admin_vehicles.modals.edit_vehicle.title')} - {editingVehicle?.name}
                </Dialog.Title>

                <form onSubmit={(e) => { e.preventDefault(); handleUpdateVehicle(); }} className="space-y-6">
                  {/* Section Informations de base */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      {t('admin_vehicles.modals.create_vehicle.basic_info')}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="edit-name" className="text-sm font-medium">
                          {t('admin_vehicles.modals.create_vehicle.model_name')} *
                        </Label>
                        <Input
                          id="edit-name"
                          value={newVehicle.name}
                          onChange={(e) => setNewVehicle({ ...newVehicle, name: e.target.value })}
                          placeholder={t('admin_vehicles.modals.create_vehicle.model_name_placeholder')}
                          className="mt-1"
                          required
                          minLength={2}
                        />
                      </div>

                      <div>
                        <Label htmlFor="edit-category" className="text-sm font-medium">
                          {t('admin_vehicles.modals.create_vehicle.category')} *
                        </Label>
                        <select
                          id="edit-category"
                          value={newVehicle.category}
                          onChange={(e) => setNewVehicle({ ...newVehicle, category: e.target.value })}
                          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus-subtle"
                          required
                        >
                          <option value="">{t('admin_vehicles.modals.create_vehicle.select_category')}</option>
                          <option value="category_electric">{t('admin_vehicles.categories.category_electric')}</option>
                          <option value="category_suv">{t('admin_vehicles.categories.category_suv')}</option>
                          <option value="category_urban_suv">{t('admin_vehicles.categories.category_urban_suv')}</option>
                          <option value="category_sedan">{t('admin_vehicles.categories.category_sedan')}</option>
                        </select>
                      </div>

                      <div>
                        <Label htmlFor="edit-price" className="text-sm font-medium">
                          {t('admin_vehicles.modals.create_vehicle.price_per_day')} (MAD) *
                        </Label>
                        <Input
                          id="edit-price"
                          type="number"
                          value={newVehicle.price}
                          onChange={(e) => setNewVehicle({ ...newVehicle, price: e.target.value })}
                          placeholder="0.00"
                          className="mt-1"
                          min="0"
                          step="0.01"
                          required
                        />
                      </div>

                    </div>
                  </div>

                  {/* Section Spécifications techniques */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      {t('admin_vehicles.modals.create_vehicle.technical_specs')}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="edit-fuel" className="text-sm font-medium">
                          {t('admin_vehicles.modals.create_vehicle.fuel')} *
                        </Label>
                        <select
                          id="edit-fuel"
                          value={newVehicle.fuel}
                          onChange={(e) => setNewVehicle({ ...newVehicle, fuel: e.target.value })}
                          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus-subtle"
                          required
                        >
                          <option value="">{t('admin_vehicles.modals.create_vehicle.select_fuel')}</option>
                          <option value="fuel_gasoline">{t('admin_vehicles.fuel_types.fuel_gasoline')}</option>
                          <option value="fuel_diesel">{t('admin_vehicles.fuel_types.fuel_diesel')}</option>
                          <option value="fuel_electric">{t('admin_vehicles.fuel_types.fuel_electric')}</option>
                          <option value="fuel_hybrid">{t('admin_vehicles.fuel_types.fuel_hybrid')}</option>
                        </select>
                      </div>

                      <div>
                        <Label htmlFor="edit-transmission" className="text-sm font-medium">
                          {t('admin_vehicles.modals.create_vehicle.transmission')} *
                        </Label>
                        <select
                          id="edit-transmission"
                          value={newVehicle.transmission}
                          onChange={(e) => setNewVehicle({ ...newVehicle, transmission: e.target.value })}
                          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus-subtle"
                          required
                        >
                          <option value="">{t('admin_vehicles.modals.create_vehicle.select_transmission')}</option>
                          <option value="transmission_manual">{t('admin_vehicles.transmission_types.transmission_manual')}</option>
                          <option value="transmission_automatic">{t('admin_vehicles.transmission_types.transmission_automatic')}</option>
                        </select>
                      </div>

                      <div>
                        <Label htmlFor="edit-seats" className="text-sm font-medium">
                          {t('admin_vehicles.modals.create_vehicle.seats')} *
                        </Label>
                        <Input
                          id="edit-seats"
                          type="number"
                          value={newVehicle.seats}
                          onChange={(e) => setNewVehicle({ ...newVehicle, seats: e.target.value })}
                          placeholder="5"
                          className="mt-1"
                          min="1"
                          max="9"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section Image */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      {t('admin_vehicles.modals.create_vehicle.image_section')}
                    </h3>
                    <div className="space-y-4">
                      {newVehicle.image_url ? (
                        <div className="relative">
                          <img
                            src={newVehicle.image_url}
                            alt={t('admin_vehicles.modals.create_vehicle.image_preview_alt')}
                            className="w-full h-48 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => setNewVehicle(prev => ({ ...prev, image_url: "" }))}
                            className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                          <input
                            type="file"
                            id="edit-image-upload"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleImageUpload(file);
                            }}
                            className="hidden"
                          />
                          <label
                            htmlFor="edit-image-upload"
                            className="cursor-pointer flex flex-col items-center justify-center"
                          >
                            <Upload className="h-8 w-8 text-gray-400 mb-2" />
                            <p className="text-gray-600">
                              {imageUploading
                                ? t('admin_vehicles.modals.create_vehicle.uploading')
                                : t('admin_vehicles.modals.create_vehicle.upload_image')
                              }
                            </p>
                          </label>
                        </div>
                      )}

                      <div>
                        <Label htmlFor="edit-image_url" className="text-sm font-medium">
                          {t('admin_vehicles.modals.create_vehicle.or_enter_url')}
                        </Label>
                        <Input
                          id="edit-image_url"
                          value={newVehicle.image_url}
                          onChange={(e) => setNewVehicle({ ...newVehicle, image_url: e.target.value })}
                          placeholder={t('admin_vehicles.modals.create_vehicle.url_placeholder')}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-6 border-t mt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        resetForm();
                        setIsEditModalOpen(false);
                        setEditingVehicle(null);
                      }}
                      disabled={isLoading}
                    >
                      Annuler
                    </Button>

                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          if (editingVehicle) {
                            setNewVehicle({
                              name: editingVehicle.name,
                              category: editingVehicle.category,
                              price: editingVehicle.price.toString(),
                              image_url: editingVehicle.image_url || "",
                              fuel: editingVehicle.fuel || "",
                              seats: editingVehicle.seats?.toString() || "",
                              transmission: editingVehicle.transmission || ""
                            });
                          }
                        }}
                        disabled={isLoading}
                      >
                        Réinitialiser
                      </Button>
                      <Button
                        type="submit"
                        disabled={isLoading}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {isLoading
                          ? t('admin_vehicles.modals.edit_vehicle.updating')
                          : t('admin_vehicles.modals.edit_vehicle.update_model')
                        }
                      </Button>
                    </div>
                  </div>
                </form>
              </Dialog.Panel>
            </div>
          </Dialog>
        </div>
      </div>
    </>
  );
}