// components/AdminDepots.tsx
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit, Trash2, MapPin, Phone, Mail, Search, Filter, X, Car, Check, Table, Building2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";


interface Depot {
  id: string;
  phone?: string;
  email?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  depot_translations: {
    language_code: string;
    name: string;
    address: string;
    city: string;
  }[];
}


interface Vehicle {
  id: string;
  matricule: string;
  status: string;
  car_id: string;
  depot_id: string | null;
  cars: {
    name: string;
    image_url?: string;
  };
}

export default function AdminDepots() {
  const [depots, setDepots] = useState<Depot[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showVehiclesModal, setShowVehiclesModal] = useState(false);
  const [showAssignVehicleModal, setShowAssignVehicleModal] = useState(false);
  const [selectedDepot, setSelectedDepot] = useState<Depot | null>(null);
  const [depotVehicles, setDepotVehicles] = useState<Vehicle[]>([]);
  const [availableVehicles, setAvailableVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([]);
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");
  
  const { t, i18n } = useTranslation();


  const [activeLang, setActiveLang] = useState<"fr" | "en">("fr");

  const [formData, setFormData] = useState({
    translations: {
      fr: {
        name: "",
        address: "",
        city: "",
      },
      en: {
        name: "",
        address: "",
        city: "",
      }
    },
    phone: "",
    email: "",
    is_active: true
  });


  const fetchDepots = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('depots')
        .select(`
          *,
          depot_translations (
            language_code,
            name,
            address,
            city
          )
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setDepots(data || []);
    } catch (error: any) {
      toast({
        title: t('admin_depots.toast.error_loading'),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTranslation = (depot: Depot) => {
    const lang = i18n.language || "fr";

    return (
      depot.depot_translations.find(t => t.language_code === lang) ||
      depot.depot_translations.find(t => t.language_code === "fr") ||
      depot.depot_translations[0]
    );
  };


  const fetchDepotVehicles = async (depotId: string) => {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select(`
          id,
          matricule,
          status,
          car_id,
          depot_id,
          cars (
            name,
            image_url
          )
        `)
        .eq('depot_id', depotId)
        .is('deleted_at', null) // Exclure les véhicules supprimés
        .order('matricule');

      if (error) {
        throw error;
      }

      setDepotVehicles(data || []);
    } catch (error: any) {
      console.error('Erreur chargement véhicules:', error);
      toast({
        title: t('admin_depots.toast.error_loading_vehicles'),
        description: t('admin_depots.toast.loading_vehicles_error_desc'),
        variant: "destructive",
      });
    }
  };

  const fetchAvailableVehicles = async () => {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select(`
          id,
          matricule,
          status,
          car_id,
          depot_id,
          cars (
            name,
            image_url
          )
        `)
        .is('depot_id', null)
        .is('deleted_at', null) // Exclure les véhicules supprimés
        .order('matricule');

      if (error) {
        throw error;
      }

      setAvailableVehicles(data || []);
    } catch (error: any) {
      console.error('Erreur chargement véhicules disponibles:', error);
      toast({
        title: t('admin_depots.toast.error_loading_available'),
        description: t('admin_depots.toast.loading_available_error_desc'),
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchDepots();
  }, []);

  const handleCreateDepot = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // 1️⃣ Création du dépôt
      const { data: depotData, error: depotError } = await supabase
        .from('depots')
        .insert([{
          phone: formData.phone || null,
          email: formData.email || null,
          is_active: formData.is_active
        }])
        .select()
        .single();

      if (depotError) throw depotError;

      // 2️⃣ Création des traductions
      const translationsToInsert = ["fr", "en"].map((lang) => ({
        depot_id: depotData.id,
        language_code: lang,
        name: formData.translations[lang].name,
        address: formData.translations[lang].address,
        city: formData.translations[lang].city,
      }));

      const { error: translationError } = await supabase
        .from('depot_translations')
        .insert(translationsToInsert);

      if (translationError) throw translationError;

      toast({
        title: t('admin_depots.toast.depot_created'),
        description: t('admin_depots.toast.depot_created_desc'),
      });

      setShowCreateModal(false);
      resetForm();
      await fetchDepots();

    } catch (error: any) {
      toast({
        title: t('admin_depots.toast.creation_error'),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEditDepot = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDepot) return;

    try {
      // 1️⃣ Update depot
      const { error: depotError } = await supabase
        .from('depots')
        .update({
          phone: formData.phone || null,
          email: formData.email || null,
          is_active: formData.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedDepot.id);

      if (depotError) throw depotError;

      // 2️⃣ Update translations
      for (const lang of ["fr", "en"]) {
        await supabase
          .from('depot_translations')
          .update({
            name: formData.translations[lang].name,
            address: formData.translations[lang].address,
            city: formData.translations[lang].city,
            updated_at: new Date().toISOString(),
          })
          .eq('depot_id', selectedDepot.id)
          .eq('language_code', lang);
      }

      toast({
        title: t('admin_depots.toast.depot_updated'),
        description: t('admin_depots.toast.depot_updated_desc'),
      });

      setShowEditModal(false);
      resetForm();
      await fetchDepots();

    } catch (error: any) {
      toast({
        title: t('admin_depots.toast.update_error'),
        description: error.message,
        variant: "destructive",
      });
    }
  };


  const handleDeleteDepot = async (depotId: string) => {
    if (!confirm(t('admin_depots.messages.confirm_delete'))) {
      return;
    }

    try {
      // Vérifier d'abord si le dépôt a des véhicules assignés
      const { data: vehicles, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('id')
        .eq('depot_id', depotId)
        .is('deleted_at', null);

      if (vehiclesError) {
        throw vehiclesError;
      }

      if (vehicles && vehicles.length > 0) {
        toast({
          title: t('admin_depots.toast.delete_error'),
          description: t('admin_depots.toast.depot_has_vehicles'),
          variant: "destructive",
        });
        return;
      }

      // Soft delete - marquer comme supprimé avec un timestamp
      const { error } = await supabase
        .from('depots')
        .update({ 
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', depotId);

      if (error) {
        throw error;
      }

      toast({
        title: t('admin_depots.toast.depot_deleted'),
        description: t('admin_depots.toast.depot_deleted_desc'),
      });

      await fetchDepots();
      
    } catch (error: any) {
      console.error('Erreur suppression dépôt:', error);
      toast({
        title: t('admin_depots.toast.delete_error'),
        description: error.message || t('admin_depots.toast.delete_error_desc'),
        variant: "destructive",
      });
    }
  };

  const handleAssignVehicles = async () => {
    if (!selectedDepot || selectedVehicles.length === 0) return;

    try {
      const { error } = await supabase
        .from('vehicles')
        .update({
          depot_id: selectedDepot.id,
          updated_at: new Date().toISOString()
        })
        .in('id', selectedVehicles);

      if (error) {
        throw error;
      }

      toast({
        title: t('admin_depots.toast.vehicles_assigned'),
        description: t('admin_depots.toast.vehicles_assigned_desc', {
          count: selectedVehicles.length
        }),
      });

      setSelectedVehicles([]);
      setShowAssignVehicleModal(false);
      
      if (selectedDepot) {
        await fetchDepotVehicles(selectedDepot.id);
        await fetchAvailableVehicles();
      }
      
    } catch (error: any) {
      console.error('Erreur assignation véhicules:', error);
      toast({
        title: t('admin_depots.toast.assignment_error'),
        description: error.message || t('admin_depots.toast.assignment_error_desc'),
        variant: "destructive",
      });
    }
  };

  const handleRemoveVehicle = async (vehicleId: string) => {

    try {
      const { error } = await supabase
        .from('vehicles')
        .update({
          depot_id: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', vehicleId);

      if (error) {
        throw error;
      }

      toast({
        title: t('admin_depots.toast.vehicle_removed'),
        description: t('admin_depots.toast.vehicle_removed_desc'),
      });

      if (selectedDepot) {
        await fetchDepotVehicles(selectedDepot.id);
        await fetchAvailableVehicles();
      }
      
    } catch (error: any) {
      console.error('Erreur retrait véhicule:', error);
      toast({
        title: t('admin_depots.toast.remove_error'),
        description: error.message || t('admin_depots.toast.remove_error_desc'),
        variant: "destructive",
      });
    }
  };

  const handleSelectVehicle = (vehicleId: string) => {
    setSelectedVehicles(prev =>
      prev.includes(vehicleId)
        ? prev.filter(id => id !== vehicleId)
        : [...prev, vehicleId]
    );
  };

  const handleSelectAll = () => {
    if (selectedVehicles.length === availableVehicles.length) {
      setSelectedVehicles([]);
    } else {
      setSelectedVehicles(availableVehicles.map(v => v.id));
    }
  };

  const resetForm = () => {
    setFormData({
      translations: {
        fr: { name: "", address: "", city: "" },
        en: { name: "", address: "", city: "" },
      },
      phone: "",
      email: "",
      is_active: true,
    });

    setSelectedDepot(null);
    setSelectedVehicles([]);
  };


  const openEditModal = (depot: Depot) => {
    setSelectedDepot(depot);

    const fr = depot.depot_translations.find(t => t.language_code === "fr");
    const en = depot.depot_translations.find(t => t.language_code === "en");

    setFormData({
      translations: {
        fr: {
          name: fr?.name || "",
          address: fr?.address || "",
          city: fr?.city || "",
        },
        en: {
          name: en?.name || "",
          address: en?.address || "",
          city: en?.city || "",
        },
      },
      phone: depot.phone || "",
      email: depot.email || "",
      is_active: depot.is_active,
    });

    setShowEditModal(true);
  };


  const openCreateModal = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const openVehiclesModal = async (depot: Depot) => {
    setSelectedDepot(depot);
    await fetchDepotVehicles(depot.id);
    setShowVehiclesModal(true);
  };

  const openAssignVehicleModal = async (depot: Depot) => {
    setSelectedDepot(depot);
    setSelectedVehicles([]);
    await fetchAvailableVehicles();
    setShowAssignVehicleModal(true);
  };

  const filteredDepots = depots.filter((depot) => {
    const translation = getTranslation(depot);

    const matchesSearch =
      searchTerm === "" ||
      translation?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      translation?.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      translation?.address?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      filterActive === "all" ||
      (filterActive === "active" && depot.is_active) ||
      (filterActive === "inactive" && !depot.is_active);

    return matchesSearch && matchesFilter;
  });

  const activeDepotsCount = depots.filter(d => d.is_active).length;
  const inactiveDepotsCount = depots.filter(d => !d.is_active).length;

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-gray-600">
            {t('admin_depots.messages.loading')}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* En-tête amélioré */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-100">
                <Building2 className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                  {t('admin_depots.title')}
                </h1>
                <p className="text-gray-600 text-sm sm:text-base">
                  {t('admin_depots.subtitle', {
                    total: depots.length,
                    active: activeDepotsCount,
                    inactive: inactiveDepotsCount
                  })}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={openCreateModal}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2.5 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-sm hover:shadow-md"
              >
                <Plus className="h-4 w-4" />
                {t('admin_depots.actions.create')}
              </button>
            </div>
          </div>
        </div>

        {/* Barre de recherche et filtres améliorée */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder={t('admin_depots.search.placeholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-gray-50/50 transition-colors"
              />
            </div>

            <div className="flex gap-3">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <select
                  value={filterActive}
                  onChange={(e) => setFilterActive(e.target.value as "all" | "active" | "inactive")}
                  className="pl-10 pr-8 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-gray-50/50 appearance-none cursor-pointer"
                >
                  <option value="all">{t('admin_depots.filters.all')}</option>
                  <option value="active">{t('admin_depots.filters.active')}</option>
                  <option value="inactive">{t('admin_depots.filters.inactive')}</option>
                </select>
              </div>

              {(searchTerm || filterActive !== "all") && (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setFilterActive("all");
                  }}
                  className="flex items-center gap-2 px-4 py-3 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors text-sm"
                >
                  <X className="h-4 w-4" />
                  {t('admin_depots.filters.reset')}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Liste des dépôts */}
        {filteredDepots.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="text-gray-300 text-6xl mb-4">🏢</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              {searchTerm || filterActive !== "all" 
                ? t('admin_depots.messages.no_results')
                : t('admin_depots.messages.no_depots')
              }
            </h3>
            <p className="text-gray-600 max-w-md mx-auto mb-6">
              {searchTerm || filterActive !== "all"
                ? t('admin_depots.messages.try_search')
                : t('admin_depots.messages.create_first')
              }
            </p>
            {(searchTerm || filterActive !== "all") ? (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setFilterActive("all");
                }}
                className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors"
              >
                {t('admin_depots.filters.reset')}
              </button>
            ) : (
              <button
                onClick={openCreateModal}
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2.5 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all"
              >
                <Plus className="h-4 w-4 inline mr-2" />
                {t('admin_depots.actions.create')}
              </button>
            )}
          </div>
        ) : (
          // Vue tableau uniquement
          <div className="overflow-hidden bg-white rounded-xl shadow-sm border border-gray-100">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {t('admin_depots.table.name')}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {t('admin_depots.table.city')}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {t('admin_depots.table.address')}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {t('admin_depots.table.phone')}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {t('admin_depots.table.email')}
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {t('admin_depots.table.status')}
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {t('admin_depots.table.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDepots.map((depot) => {
                  const translation = getTranslation(depot);

                  return (
                    <tr key={depot.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            depot.is_active ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-400'
                          }`}>
                            <Building2 className="h-4 w-4" />
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {translation?.name}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {translation?.city}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {translation?.address}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {depot.phone || "-"}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {depot.email || "-"}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          depot.is_active 
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : 'bg-gray-50 text-gray-600 border border-gray-200'
                        }`}>
                          {depot.is_active 
                            ? t('admin_depots.status.active')
                            : t('admin_depots.status.inactive')}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex justify-center gap-1">
                          <button
                            onClick={() => openEditModal(depot)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => handleDeleteDepot(depot.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => openVehiclesModal(depot)}
                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          >
                            <Car className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de création */}
      {showCreateModal && (
        <DepotModal
          title={t('admin_depots.modal.create_title')}
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleCreateDepot}
          onClose={() => setShowCreateModal(false)}
          submitText={t('admin_depots.actions.create')}
        />
      )}

      {/* Modal de modification */}
      {showEditModal && selectedDepot && (
        <DepotModal
          title={t('admin_depots.modal.edit_title')}
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleEditDepot}
          onClose={() => setShowEditModal(false)}
          submitText={t('admin_depots.actions.update')}
        />
      )}

      {/* Modal de gestion des véhicules */}
      {showVehiclesModal && selectedDepot && (
        <VehiclesModal
          depot={selectedDepot}
          vehicles={depotVehicles}
          onRemoveVehicle={handleRemoveVehicle}
          onClose={() => setShowVehiclesModal(false)}
          onAddVehicle={() => {
            setShowVehiclesModal(false);
            openAssignVehicleModal(selectedDepot);
          }}
        />
      )}

      {/* Modal d'assignation de véhicules */}
      {showAssignVehicleModal && selectedDepot && (
        <AssignVehicleModal
          depot={selectedDepot}
          availableVehicles={availableVehicles}
          selectedVehicles={selectedVehicles}
          onSelectVehicle={handleSelectVehicle}
          onSelectAll={handleSelectAll}
          onAssignVehicles={handleAssignVehicles}
          onClose={() => setShowAssignVehicleModal(false)}
        />
      )}
    </div>
  );
}

// Composant modal pour les dépôts avec design amélioré
function DepotModal({ title, formData, setFormData, onSubmit, onClose, submitText }: any) {
  const { t } = useTranslation();
  const [activeLang, setActiveLang] = useState<"fr" | "en">("fr");

  const updateTranslation = (field: string, value: string) => {
    setFormData((prev: any) => ({
      ...prev,
      translations: {
        ...prev.translations,
        [activeLang]: {
          ...prev.translations[activeLang],
          [field]: value
        }
      }
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">

        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>

        {/* Tabs langues */}
        <div className="flex gap-2 mb-4">
          {["fr", "en"].map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => setActiveLang(lang as any)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                activeLang === lang
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {lang.toUpperCase()}
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit} className="space-y-4">

          {/* Champs traduits */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin_depots.form.name')} ({activeLang.toUpperCase()})
            </label>
            <input
              type="text"
              required
              value={formData.translations[activeLang].name}
              onChange={(e) => updateTranslation("name", e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin_depots.form.address')} ({activeLang.toUpperCase()})
            </label>
            <input
              type="text"
              required
              value={formData.translations[activeLang].address}
              onChange={(e) => updateTranslation("address", e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin_depots.form.city')} ({activeLang.toUpperCase()})
            </label>
            <input
              type="text"
              required
              value={formData.translations[activeLang].city}
              onChange={(e) => updateTranslation("city", e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          {/* Champs non traduits */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin_depots.form.phone')}
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('admin_depots.form.email')}
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) =>
                setFormData({ ...formData, is_active: e.target.checked })
              }
            />
            <label>{t('admin_depots.form.active')}</label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={onClose}>
              {t('admin_depots.actions.cancel')}
            </button>
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg"
            >
              {submitText}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

// Composant modal pour la gestion des véhicules avec design amélioré
function VehiclesModal({ depot, vehicles, onRemoveVehicle, onClose, onAddVehicle }: any) {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col shadow-xl">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Car className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {t('admin_depots.vehicles_modal.title')}
                </h3>
                <p className="text-sm text-gray-600">
                  {depot.name} - {vehicles.length} {t('admin_depots.vehicles_modal.vehicles_count')}
                </p>
              </div>
            </div>
            <button
              onClick={onAddVehicle}
              className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-green-700 text-white px-3 py-2 rounded-lg hover:from-green-700 hover:to-green-800 transition-all text-sm shadow-sm"
            >
              <Plus className="h-4 w-4" />
              {t('admin_depots.actions.add_vehicle')}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {vehicles.length === 0 ? (
            <div className="text-center py-8">
              <Car className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                {t('admin_depots.vehicles_modal.no_vehicles')}
              </h4>
              <p className="text-gray-600">
                {t('admin_depots.vehicles_modal.no_vehicles_desc')}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {vehicles.map((vehicle: any) => (
                <div key={vehicle.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center gap-3">
                    {vehicle.cars?.image_url ? (
                      <img
                        src={vehicle.cars.image_url}
                        alt={vehicle.cars.name}
                        className="w-12 h-8 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-12 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
                        <Car className="h-4 w-4 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-gray-900">
                        {vehicle.matricule}
                      </div>
                      <div className="text-sm text-gray-600">
                        {vehicle.cars?.name}
                      </div>
                      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
                        vehicle.status === 'available' 
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : vehicle.status === 'reserved'
                          ? 'bg-orange-50 text-orange-700 border border-orange-200'
                          : 'bg-gray-50 text-gray-600 border border-gray-200'
                      }`}>
                        {vehicle.status === 'available' && t('admin_depots.vehicle_status.available')}
                        {vehicle.status === 'reserved' && t('admin_depots.vehicle_status.reserved')}
                        {vehicle.status === 'maintenance' && t('admin_depots.vehicle_status.maintenance')}
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => onRemoveVehicle(vehicle.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title={t('admin_depots.actions.remove_vehicle')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-gray-600 hover:text-gray-800 transition-colors font-medium"
            >
              {t('admin_depots.actions.close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Composant modal pour l'assignation de véhicules avec sélection multiple et design amélioré
function AssignVehicleModal({ 
  depot, 
  availableVehicles, 
  selectedVehicles, 
  onSelectVehicle, 
  onSelectAll, 
  onAssignVehicles, 
  onClose 
}: any) {
  const { t } = useTranslation();

  const allSelected = availableVehicles.length > 0 && selectedVehicles.length === availableVehicles.length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col shadow-xl">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Car className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {t('admin_depots.assign_modal.title')}
                </h3>
                <p className="text-sm text-gray-600">
                  {depot.name} - {selectedVehicles.length} {t('admin_depots.assign_modal.selected')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg">
                {t('admin_depots.assign_modal.available', {
                  count: availableVehicles.length
                })}
              </div>
              {availableVehicles.length > 0 && (
                <button
                  onClick={onSelectAll}
                  className="flex items-center gap-2 bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-200 transition-colors"
                >
                  <Check className={`h-4 w-4 ${allSelected ? 'text-green-600' : 'text-gray-400'}`} />
                  {allSelected 
                    ? t('admin_depots.actions.deselect_all')
                    : t('admin_depots.actions.select_all')
                  }
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {availableVehicles.length === 0 ? (
            <div className="text-center py-8">
              <Car className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                {t('admin_depots.assign_modal.no_available_vehicles')}
              </h4>
              <p className="text-gray-600">
                {t('admin_depots.assign_modal.no_available_vehicles_desc')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableVehicles.map((vehicle: any) => (
                <div
                  key={vehicle.id}
                  onClick={() => onSelectVehicle(vehicle.id)}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedVehicles.includes(vehicle.id)
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      selectedVehicles.includes(vehicle.id)
                        ? 'bg-blue-500 border-blue-500'
                        : 'border-gray-300'
                    }`}>
                      {selectedVehicles.includes(vehicle.id) && (
                        <Check className="h-3 w-3 text-white" />
                      )}
                    </div>
                    
                    {vehicle.cars?.image_url ? (
                      <img
                        src={vehicle.cars.image_url}
                        alt={vehicle.cars.name}
                        className="w-16 h-12 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-16 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                        <Car className="h-6 w-6 text-gray-400" />
                      </div>
                    )}
                    
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {vehicle.matricule}
                      </div>
                      <div className="text-sm text-gray-600">
                        {vehicle.cars?.name}
                      </div>
                      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
                        vehicle.status === 'available' 
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : vehicle.status === 'reserved'
                          ? 'bg-orange-50 text-orange-700 border border-orange-200'
                          : 'bg-gray-50 text-gray-600 border border-gray-200'
                      }`}>
                        {vehicle.status === 'available' && t('admin_depots.vehicle_status.available')}
                        {vehicle.status === 'reserved' && t('admin_depots.vehicle_status.reserved')}
                        {vehicle.status === 'maintenance' && t('admin_depots.vehicle_status.maintenance')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600 bg-white px-3 py-1.5 rounded-lg border border-gray-200">
              {selectedVehicles.length} {t('admin_depots.assign_modal.selected')}
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2.5 text-gray-600 hover:text-gray-800 transition-colors font-medium"
              >
                {t('admin_depots.actions.cancel')}
              </button>
              <button
                onClick={onAssignVehicles}
                disabled={selectedVehicles.length === 0}
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2.5 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all font-medium shadow-sm disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed"
              >
                {t('admin_depots.actions.assign_selected', {
                  count: selectedVehicles.length
                })}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}