// src/pages/AdminLocalisations.tsx
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { Search, MapPin, Building, Train, Plane, ToggleLeft, ToggleRight, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import i18n from "@/i18n";

interface Localisation {
  id: string;
  localisation_value: string;
  localisation_type: string;
  is_active: boolean;
  localisation_translations?: {
    language: string;
    display_name: string;
  }[];
}

export default function AdminLocalisations() {
  const [localisations, setLocalisations] = useState<Localisation[]>([]);
  const [filteredLocalisations, setFilteredLocalisations] = useState<Localisation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const { toast } = useToast();
  const { t } = useTranslation();

  const [newLocalisation, setNewLocalisation] = useState({
    localisation_value: "",
    localisation_type: "airport",
    translations: {
      fr: "",
      en: ""
    }
  });

  const [activeLang, setActiveLang] = useState<"fr" | "en">("fr");

  const [showAddForm, setShowAddForm] = useState(false);

  const [validation, setValidation] = useState({
    isDuplicate: false,
    isValid: true
  });

  const getDisplayName = (localisation: Localisation) => {
    const currentLang = i18n.language;

    const translation = localisation.localisation_translations?.find(
      t => t.language === currentLang
    );

    return translation?.display_name || localisation.localisation_value;
  };


  useEffect(() => {
    fetchLocalisations();
  }, []);

  useEffect(() => {
    filterLocalisations();
  }, [localisations, searchTerm, filterType]);

  useEffect(() => {
    filterLocalisations();
  }, [i18n.language]);

  useEffect(() => {
    const updateLocalisationValue = async () => {
      const frName = newLocalisation.translations.fr;

      if (!frName) return;

      const localisationValue = generateLocalisationValue(
        frName,
        newLocalisation.localisation_type
      );

      const isDuplicate = await checkLocalisationValueExists(localisationValue);

      setNewLocalisation((prev) => ({
        ...prev,
        localisation_value: localisationValue,
      }));

      setValidation({
        isDuplicate,
        isValid: !isDuplicate && !!frName
      });
    };

    updateLocalisationValue();
  }, [newLocalisation.translations.fr, newLocalisation.localisation_type]);




  const fetchLocalisations = async () => {
    try {
      const { data, error } = await supabase
        .from("active_localisations")
        .select(`
          *,
          localisation_translations (
            language,
            display_name
          )
        `)
        .is("deleted_at", null)
        .order("localisation_type");


      if (error) throw error;

      setLocalisations(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteLocalisation = async (localisation: Localisation) => {
    if (!confirm(t('admin_localisations.messages.confirm_delete'))) return;

    try {
      const { error } = await supabase
        .from("active_localisations")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", localisation.id);

      if (error) throw error;

      // Mise à jour locale
      setLocalisations(prev =>
        prev.filter(loc => loc.id !== localisation.id)
      );

      toast({
        title: t('admin_localisations.messages.deleted'),
        description: t('admin_localisations.messages.deleted_success'),
      });


    } catch (error: any) {
      toast({
        title: t('admin_localisations.messages.error'),
        description: t('admin_localisations.messages.cannot_delete'),
        variant: "destructive",
      });
    }
  };


  const filterLocalisations = () => {
    let filtered = localisations;

    // Filtre par recherche
    if (searchTerm) {
      filtered = filtered.filter(localisation => {
        const displayName = getDisplayName(localisation);
        return displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
               localisation.localisation_value.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }

    // Filtre par type
    if (filterType !== "all") {
      filtered = filtered.filter(localisation => localisation.localisation_type === filterType);
    }

    setFilteredLocalisations(filtered);
  };

  const toggleLocalisationActive = async (localisation: Localisation) => {
    try {
      const { error } = await supabase
        .from("active_localisations")
        .update({ is_active: !localisation.is_active })
        .eq("id", localisation.id);
  
      if (error) throw error;
  
      // Mise à jour locale sans toast
      setLocalisations(prevLocalisations => 
        prevLocalisations.map(loc => 
          loc.id === localisation.id 
            ? { ...loc, is_active: !localisation.is_active }
            : loc
        )
      );
    } catch (error: any) {
      console.error("Erreur modification:", error);
      // Optionnel: garder le toast d'erreur seulement
      toast({
        title: "Erreur",
        description: "Impossible de modifier le statut",
        variant: "destructive",
      });
    }
  };

  const handleAddLocalisation = async () => {
    try {
      const { data: localisationData, error: locError } = await supabase
        .from("active_localisations")
        .insert({
          localisation_value: newLocalisation.localisation_value,
          localisation_type: newLocalisation.localisation_type,
          is_active: true
        })
        .select()
        .single();

      if (locError) throw locError;

      const { error: translationError } = await supabase
        .from("localisation_translations")
        .insert([
          {
            localisation_id: localisationData.id,
            language: "fr",
            display_name: newLocalisation.translations.fr,
          },
          {
            localisation_id: localisationData.id,
            language: "en",
            display_name: newLocalisation.translations.en,
          },
        ]);

      if (translationError) throw translationError;

      // ✅ Refresh liste
      await fetchLocalisations();

      // ✅ Reset formulaire
      setNewLocalisation({
        localisation_value: "",
        localisation_type: "airport",
        translations: {
          fr: "",
          en: ""
        }
      });

      // ✅ Reset validation
      setValidation({
        isDuplicate: false,
        isValid: true
      });

      // ✅ Revenir sur FR
      setActiveLang("fr");

      // ✅ Optionnel : fermer le form
      setShowAddForm(false);

      // ✅ Toast succès
      toast({
        title: "Succès",
        description: "Localisation ajoutée avec succès",
      });

    } catch (error: any) {
      console.error(error);

      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue",
        variant: "destructive",
      });
    }
  };


  const getLocalisationIcon = (type: string) => {
    switch (type) {
      case 'airport':
        return <Plane className="h-4 w-4" />;
      case 'station':
        return <Train className="h-4 w-4" />;
      default:
        return <Building className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 p-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center py-24">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">{t('admin_localisations.messages.loading')}</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Fonction pour générer le localisation_value à partir du display_name
  const generateLocalisationValue = (displayName: string, type: string) => {
    if (!displayName) return "";
    
    // Nettoyer le nom : minuscules, remplacer espaces par underscores, supprimer accents
    const cleanName = displayName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
      .replace(/[^a-z0-9\s]/g, '') // Garder seulement lettres, chiffres et espaces
      .replace(/\s+/g, '_') // Remplacer espaces par underscores
      .trim();

    // Ajouter le préfixe selon le type
    const prefix = type === 'airport' ? 'airport_' : 'station_';
    
    return prefix + cleanName;
  };

  // Fonction pour vérifier si un localisation_value existe déjà
  const checkLocalisationValueExists = async (localisationValue: string): Promise<boolean> => {
    if (!localisationValue) return false;
    
    try {
      const { data, error } = await supabase
        .from("active_localisations")
        .select("localisation_value")
        .eq("localisation_value", localisationValue)
        .single();

      return !error && data !== null;
    } catch (error) {
      return false;
    }
  };

  // Fonction pour gérer le changement de type
  const handleLocalisationTypeChange = async (type: string) => {
    const localisationValue = generateLocalisationValue(
      newLocalisation.translations.fr,
      type
    );

    const isDuplicate = localisationValue ? await checkLocalisationValueExists(localisationValue) : false;

    setNewLocalisation(prev => ({
      ...prev, 
      localisation_type: type,
      localisation_value: localisationValue
    }));

    setValidation({
      isDuplicate,
      isValid: !isDuplicate && !!newLocalisation.translations.fr
    });
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          {/* En-tête */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {t('admin_localisations.title')}
            </h1>
            <p className="text-gray-600">
              {t('admin_localisations.subtitle')}
            </p>
          </div>

          {/* Barre de recherche et filtres */}
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <div className="flex flex-col lg:flex-row gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder={t('admin_localisations.search.placeholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">{t('admin_localisations.filters.all_types')}</option>
                <option value="airport">{t('admin_localisations.filters.airports')}</option>
                <option value="station">{t('admin_localisations.filters.stations')}</option>
              </select>

              <Button
                onClick={() => setShowAddForm(!showAddForm)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('admin_localisations.actions.add_localisation')}
              </Button>
            </div>

            {/* Statistiques */}
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              <span>{t('admin_localisations.stats.total')}: {localisations.length}</span>
              <span>{t('admin_localisations.stats.active')}: {localisations.filter(l => l.is_active).length}</span>
              <span>{t('admin_localisations.stats.airports')}: {localisations.filter(l => l.localisation_type === 'airport').length}</span>
              <span>{t('admin_localisations.stats.stations')}: {localisations.filter(l => l.localisation_type === 'station').length}</span>
            </div>
          </div>

          {/* Formulaire d'ajout */}
          {showAddForm && (
            <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
              <h3 className="text-lg font-semibold mb-6">{t('admin_localisations.add_form.title')}</h3>
              
              {/* Grid pour aligner les inputs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 mb-6 items-start">

                {/* Type */}
                <div className="flex flex-col">
                  <Label htmlFor="localisation_type" className="mb-1">
                    {t('admin_localisations.add_form.type')} *
                  </Label>
                  <select
                    id="localisation_type"
                    value={newLocalisation.localisation_type}
                    onChange={(e) => handleLocalisationTypeChange(e.target.value)}
                    className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="airport">{t('admin_localisations.types.airport')}</option>
                    <option value="station">{t('admin_localisations.types.station')}</option>
                  </select>
                </div>

                {/* Display Name */}
                <div className="flex flex-col relative">
                  <Label className="mb-1">
                    {t('admin_localisations.add_form.display_name_label')} *
                  </Label>

                  {/* Tabs pour FR / EN */}
                  <div className="absolute -top-3 right-0 flex gap-2">
                    {["fr", "en"].map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => setActiveLang(lang as "fr" | "en")}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition ${
                          activeLang === lang
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {lang.toUpperCase()}
                      </button>
                    ))}
                  </div>

                  <Input
                    className="mt-1"
                    value={newLocalisation.translations[activeLang]}
                    onChange={(e) =>
                      setNewLocalisation((prev) => ({
                        ...prev,
                        translations: {
                          ...prev.translations,
                          [activeLang]: e.target.value,
                        },
                      }))
                    }
                    placeholder={`${t('admin_localisations.add_form.name')} ${activeLang.toUpperCase()}`}
                  />
                </div>

                {/* Technical Value */}
                <div className="flex flex-col">
                  <Label htmlFor="localisation_value" className="mb-1">
                    {t('admin_localisations.add_form.technical_value')}
                  </Label>
                  <div className="relative">
                    <Input
                      id="localisation_value"
                      value={newLocalisation.localisation_value}
                      readOnly
                      className={cn(
                        "mt-1 pr-10",
                        validation.isDuplicate 
                          ? "bg-red-50 border-red-300 text-red-900" 
                          : "bg-gray-50 border-gray-200 text-gray-700"
                      )}
                      placeholder={t('admin_localisations.add_form.technical_value_placeholder')}
                    />
                    {validation.isDuplicate && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <span className="text-red-500 text-sm">⚠️</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {validation.isDuplicate 
                      ? t('admin_localisations.validation.duplicate')
                      : t('admin_localisations.add_form.technical_value_help')
                    }
                  </p>
                </div>

              </div>

              {/* Aperçu */}
              {newLocalisation.translations.fr && (
                <div className={cn(
                  "border rounded-lg p-4 mb-4",
                  validation.isDuplicate 
                    ? "bg-red-50 border-red-200" 
                    : "bg-blue-50 border-blue-200"
                )}>
                  <h4 className={cn(
                    "text-sm font-medium mb-2",
                    validation.isDuplicate ? "text-red-900" : "text-blue-900"
                  )}>
                    {validation.isDuplicate 
                      ? t('admin_localisations.add_form.conflict_detected')
                      : t('admin_localisations.add_form.preview')
                    }
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Nom affiché :</span>
                      <div className={cn(
                        "mt-1",
                        validation.isDuplicate ? "text-red-700" : "text-blue-700"
                      )}>
                        {newLocalisation.translations[activeLang]}
                      </div>
                    </div>
                    <div>
                      <span className="font-medium">Valeur technique :</span>
                      <div className={cn(
                        "font-mono text-xs mt-1 px-2 py-1 rounded",
                        validation.isDuplicate 
                          ? "bg-red-100 text-red-700" 
                          : "bg-blue-100 text-blue-700"
                      )}>
                        {newLocalisation.localisation_value}
                      </div>
                    </div>
                  </div>
                  {validation.isDuplicate && (
                    <p className="text-red-600 text-xs mt-2">
                      {t('admin_localisations.add_form.conflict_message')}
                    </p>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-3">
                <Button 
                  onClick={handleAddLocalisation} 
                  className="bg-green-600 hover:bg-green-700"
                  disabled={
                    !newLocalisation.translations.fr ||
                    !newLocalisation.translations.en ||
                    !newLocalisation.localisation_value ||
                    validation.isDuplicate
                  }
                >
                  {t('admin_localisations.actions.add')} {t('admin_localisations.add_form.technical_value')}
                </Button>
                <Button variant="outline" onClick={() => {
                  setShowAddForm(false);
                  setNewLocalisation({
                    localisation_value: "",
                    localisation_type: "airport",
                    translations: {
                      fr: "",
                      en: ""
                    }
                  });
                  setValidation({
                    isDuplicate: false,
                    isValid: true
                  });
                }}>
                  {t('admin_localisations.actions.cancel')}
                </Button>
              </div>
            </div>
          )}

          {/* Liste des localisations */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin_localisations.table.localisation')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin_localisations.table.type')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin_localisations.table.technical_value')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin_localisations.table.status')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin_localisations.table.action')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredLocalisations.map((localisation) => {
                    const displayName = getDisplayName(localisation);
                    
                    return (
                      <tr key={localisation.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {getLocalisationIcon(localisation.localisation_type)}
                            <span className="font-medium text-gray-900">
                              {displayName}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            localisation.localisation_type === 'airport' 
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {t(`admin_localisations.types.${localisation.localisation_type}`)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                          {localisation.localisation_value}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            localisation.is_active 
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {localisation.is_active 
                              ? t('admin_localisations.status.active')
                              : t('admin_localisations.status.inactive')
                            }
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            {/* Bouton Activer/Désactiver */}
                            <button
                              onClick={() => toggleLocalisationActive(localisation)}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                localisation.is_active
                                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                  : 'bg-green-100 text-green-700 hover:bg-green-200'
                              }`}
                            >
                              {localisation.is_active ? (
                                <>
                                  <ToggleLeft className="h-4 w-4" />
                                  {t('admin_localisations.actions.deactivate')}
                                </>
                              ) : (
                                <>
                                  <ToggleRight className="h-4 w-4" />
                                  {t('admin_localisations.actions.activate')}
                                </>
                              )}
                            </button>

                            {/* Bouton Supprimer */}
                            <button
                              onClick={() => deleteLocalisation(localisation)}
                              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200"
                            >
                              <X className="h-4 w-4" />
                              {t('admin_localisations.actions.delete')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredLocalisations.length === 0 && (
                <div className="text-center py-12">
                  <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">{t('admin_localisations.messages.no_localisations')}</p>
                  {searchTerm && (
                    <p className="text-gray-400 text-sm mt-2">
                      {t('admin_localisations.messages.no_results', { searchTerm })}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}