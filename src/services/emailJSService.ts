// services/emailJSService.ts
import emailjs from '@emailjs/browser';

// Configuration pour les RÉSERVATIONS (premier compte)
const EMAILJS_CONFIG_RESERVATIONS = {
  PUBLIC_KEY: import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
  SERVICE_ID: import.meta.env.VITE_EMAILJS_SERVICE_ID,
  TEMPLATES: {
    NEW_RESERVATION_ADMIN: import.meta.env.VITE_EMAILJS_TEMPLATE_ADMIN,
    RESERVATION_STATUS: import.meta.env.VITE_EMAILJS_TEMPLATE_CLIENT_ACCEPTED,
  }
};

// Configuration pour les ANNULATIONS (deuxième compte)
const EMAILJS_CONFIG_CANCELLATIONS = {
  PUBLIC_KEY: import.meta.env.VITE_EMAILJS_PUBLIC_KEY_CANCEL,
  SERVICE_ID: import.meta.env.VITE_EMAILJS_SERVICE_ID_CANCEL,
  TEMPLATES: {
    CANCELLATION_CLIENT: import.meta.env.VITE_EMAILJS_TEMPLATE_CANCEL_CLIENT,
    CANCELLATION_ADMIN: import.meta.env.VITE_EMAILJS_TEMPLATE_CANCEL_ADMIN
  }
};

// Initialisation avec la clé du premier compte (EmailJS n'a besoin que d'une initialisation)
emailjs.init(EMAILJS_CONFIG_RESERVATIONS.PUBLIC_KEY);

export const emailJSService = {
  sendNewReservationAdminEmail: async (data: {
    reservationId: string;
    clientName: string;
    clientEmail: string;
    clientPhone: string;
    carName: string;
    carCategory: string;
    pickupDate: string;
    pickupTime: string;
    returnDate: string;
    returnTime: string;
    pickupLocation: string;
    returnLocation: string;
    totalPrice: number;
    language: string;
  }) => {
    try {
      console.log('🔔 Tentative envoi email nouvelle réservation');
  
      const language = data.language || 'fr';
      
      const templateParams = {
        reservation_id: data.reservationId,
        client_name: data.clientName,
        client_email: data.clientEmail,
        client_phone: data.clientPhone || (language === 'fr' ? 'Non renseigné' : 'Not provided'),
        car_name: data.carName,
        car_category: data.carCategory,
        pickup_date: data.pickupDate,
        pickup_time: data.pickupTime,
        return_date: data.returnDate,
        return_time: data.returnTime,
        pickup_location: data.pickupLocation,
        return_location: data.returnLocation,
        total_price: `${data.totalPrice} MAD`,
        current_date: new Date().toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US'),
        // 🔥 AJOUT DES VARIABLES CONDITIONNELLES POUR LE TEMPLATE
        is_french: language === 'fr',
        is_english: language === 'en'
      };
  
      console.log('📤 Paramètres nouvelle réservation:', templateParams);
  
      const result = await emailjs.send(
        EMAILJS_CONFIG_RESERVATIONS.SERVICE_ID,
        EMAILJS_CONFIG_RESERVATIONS.TEMPLATES.NEW_RESERVATION_ADMIN,
        templateParams,
        EMAILJS_CONFIG_RESERVATIONS.PUBLIC_KEY
      );
  
      console.log('✅ Email admin nouvelle réservation envoyé');
      return { success: true, result };
    } catch (error) {
      console.error('❌ Erreur envoi email admin:', error);
      return { success: false, error };
    }
  },

  sendCancellationEmails: async (data: {
    reservationId: string;
    clientName: string;
    clientEmail: string;
    clientPhone: string;
    carName: string;
    carCategory: string;
    pickupDate: string;
    pickupTime: string;
    returnDate: string;
    returnTime: string;
    pickupLocation: string;
    returnLocation: string;
    totalPrice: number;
    language: string;
  }) => {
    try {
      console.log('🔔 Tentative envoi emails annulation');

      const language = data.language || 'fr';
      
      // Variables de traduction pour le CLIENT
      const clientTranslations = language === 'fr' ? {
        // Titres et en-têtes
        email_title: "Confirmation d'Annulation",
        email_subtitle: "Votre réservation a été annulée avec succès",
        cancellation_badge: "❌ RÉSERVATION ANNULÉE",
        greeting: "Bonjour",
        cancellation_message: "Votre réservation a été annulée avec succès. Voici le récapitulatif de la réservation annulée :",
        
        // Détails de la réservation
        details_title: "📋 Détails de la réservation annulée",
        reference_label: "Référence :",
        vehicle_label: "Véhicule :",
        category_label: "Catégorie :",
        pickup_date_label: "Date de départ :",
        return_date_label: "Date de retour :",
        pickup_location_label: "Lieu de départ :",
        return_location_label: "Lieu de retour :",
        total_amount_label: "Montant total :",
        at_time: "à",
        
        // Section espoir
        hope_title: "💫 Nous espérons vous revoir bientôt !",
        hope_message: "Votre prochaine location bénéficiera d'un accueil tout aussi attentionné et de nos meilleurs services.",
        
        // Contact
        contact_title: "📞 Besoin d'aide ?",
        contact_message: "Notre équipe reste à votre disposition pour toute question future :",
        phone_label: "📞 Téléphone :",
        email_label: "📧 Email :",
        hours_label: "🕒 Horaires :",
        emergency_label: "🚨 Urgences :",
        hours_value: "Lun-Sam 8h-20h",
        emergency_value: "24h/24",
        
        // Pied de page
        thank_you_message: "Merci de votre confiance,",
        team_signature: "L'équipe CBV Rental",
        copyright: "© 2024 CBV Rental. Tous droits réservés."
      } : {
        // English translations
        email_title: "Cancellation Confirmation",
        email_subtitle: "Your reservation has been successfully cancelled",
        cancellation_badge: "❌ RESERVATION CANCELLED",
        greeting: "Hello",
        cancellation_message: "Your reservation has been successfully cancelled. Here is the summary of the cancelled reservation:",
        
        details_title: "📋 Cancelled Reservation Details",
        reference_label: "Reference :",
        vehicle_label: "Vehicle :",
        category_label: "Category :",
        pickup_date_label: "Pickup date :",
        return_date_label: "Return date :",
        pickup_location_label: "Pickup location :",
        return_location_label: "Return location :",
        total_amount_label: "Total amount :",
        at_time: "at",
        
        hope_title: "💫 We hope to see you again soon!",
        hope_message: "Your next rental will benefit from the same attentive welcome and our best services.",
        
        contact_title: "📞 Need help?",
        contact_message: "Our team remains available for any future questions:",
        phone_label: "📞 Phone :",
        email_label: "📧 Email :",
        hours_label: "🕒 Hours :",
        emergency_label: "🚨 Emergencies :",
        hours_value: "Mon-Sat 8am-8pm",
        emergency_value: "24/7",
        
        thank_you_message: "Thank you for your trust,",
        team_signature: "The CBV Rental Team",
        copyright: "© 2024 CBV Rental. All rights reserved."
      };

      // Variables de traduction pour l'ADMIN
      const adminTranslations = language === 'fr' ? {
        admin_email_title: "❌ RÉSERVATION ANNULÉE",
        admin_email_subtitle: "Notification d'annulation automatique",
        client_info_title: "👤 INFORMATIONS CLIENT",
        name_label: "Nom :",
        email_label: "Email :",
        phone_label: "Téléphone :",
        cancellation_details_title: "📋 DÉTAILS DE L'ANNULATION",
        vehicle_label: "Véhicule :",
        category_label: "Catégorie :",
        period_label: "Période :",
        pickup_location_label: "Lieu départ :",
        return_location_label: "Lieu retour :",
        total_price_label: "Prix total :",
        cancellation_date_label: "Date d'annulation :",
        system_info_title: "💡 INFORMATION SYSTÈME",
        system_info_message: `Cette réservation a été annulée par le client via l'interface utilisateur. Le véhicule ${data.carName} est à nouveau disponible pour la période du ${data.pickupDate} au ${data.returnDate}.`,
        system_footer: "CBV Rental - Système de gestion des réservations",
        copyright: "Notification automatique - © 2024 CBV Rental"
      } : {
        admin_email_title: "❌ RESERVATION CANCELLED",
        admin_email_subtitle: "Automatic cancellation notification",
        client_info_title: "👤 CLIENT INFORMATION",
        name_label: "Name :",
        email_label: "Email :",
        phone_label: "Phone :",
        cancellation_details_title: "📋 CANCELLATION DETAILS",
        vehicle_label: "Vehicle :",
        category_label: "Category :",
        period_label: "Period :",
        pickup_location_label: "Pickup location :",
        return_location_label: "Return location :",
        total_price_label: "Total price :",
        cancellation_date_label: "Cancellation date :",
        system_info_title: "💡 SYSTEM INFORMATION",
        system_info_message: `This reservation was cancelled by the client through the user interface. The vehicle ${data.carName} is now available again for the period from ${data.pickupDate} to ${data.returnDate}.`,
        system_footer: "CBV Rental - Reservation Management System",
        copyright: "Automatic notification - © 2024 CBV Rental"
      };

      // Paramètres pour le CLIENT
      const clientTemplateParams = {
        // Données de base
        reservation_id: data.reservationId,
        client_name: data.clientName,
        client_email: data.clientEmail,
        client_phone: data.clientPhone || (language === 'fr' ? 'Non renseigné' : 'Not provided'),
        car_name: data.carName,
        car_category: data.carCategory,
        pickup_date: data.pickupDate,
        pickup_time: data.pickupTime,
        return_date: data.returnDate,
        return_time: data.returnTime,
        pickup_location: data.pickupLocation,
        return_location: data.returnLocation,
        total_price: `${data.totalPrice} MAD`,
        cancellation_date: new Date().toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US'),
        
        // Traductions client
        ...clientTranslations
      };

      // Paramètres pour l'ADMIN
      const adminTemplateParams = {
        // Données de base
        ...clientTemplateParams,
        
        // Traductions admin (écrasent les traductions client si mêmes clés)
        ...adminTranslations
      };

      console.log('📤 Paramètres annulation avec traductions:', clientTemplateParams);

      // Envoyer l'email au CLIENT
      console.log('📧 Envoi email client annulation...');
      const clientResult = await emailjs.send(
        EMAILJS_CONFIG_CANCELLATIONS.SERVICE_ID,
        EMAILJS_CONFIG_CANCELLATIONS.TEMPLATES.CANCELLATION_CLIENT,
        {
          ...clientTemplateParams,
          to_email: data.clientEmail
        },
        EMAILJS_CONFIG_CANCELLATIONS.PUBLIC_KEY
      );
      console.log('✅ Email client annulation envoyé');

      // Envoyer l'email à l'ADMIN
      console.log('📧 Envoi email admin annulation...');
      const adminResult = await emailjs.send(
        EMAILJS_CONFIG_CANCELLATIONS.SERVICE_ID,
        EMAILJS_CONFIG_CANCELLATIONS.TEMPLATES.CANCELLATION_ADMIN,
        adminTemplateParams,
        EMAILJS_CONFIG_CANCELLATIONS.PUBLIC_KEY
      );
      console.log('✅ Email admin annulation envoyé');

      return { success: true };
    } catch (error: any) {
      console.error('❌ Erreur détaillée envoi emails annulation:', {
        status: error.status,
        text: error.text,
        message: error.message
      });
      return { success: false, error };
    }
  },

  sendReservationStatusEmail: async (data: {
    reservationId: string;
    clientName: string;
    clientEmail: string;
    clientPhone: string;
    carName: string;
    carCategory: string;
    pickupDate: string;
    pickupTime: string;
    returnDate: string;
    returnTime: string;
    pickupLocation: string;
    returnLocation: string;
    totalPrice: number;
    status: 'accepted' | 'rejected';
    rejectionReason?: string;
    language: string;
  }) => {
    try {
      console.log('🔔 Tentative envoi email statut réservation:', data.status);

      const language = data.language || 'fr';
      
      const templateParams = {
        reservation_id: data.reservationId,
        client_name: data.clientName,
        client_email: data.clientEmail,
        client_phone: data.clientPhone || (language === 'fr' ? 'Non renseigné' : 'Not provided'),
        car_name: data.carName,
        car_category: data.carCategory,
        pickup_date: data.pickupDate,
        pickup_time: data.pickupTime,
        return_date: data.returnDate,
        return_time: data.returnTime,
        pickup_location: data.pickupLocation,
        return_location: data.returnLocation,
        total_price: `${data.totalPrice} MAD`,
        current_date: new Date().toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US'),
        is_french: language === 'fr',
        is_english: language === 'en',
        is_accepted: data.status === 'accepted',
        is_rejected: data.status === 'rejected',
        reservation_status: data.status,
        rejection_reason: data.rejectionReason || ''
      };

      console.log('📤 Paramètres statut réservation:', templateParams);

      const result = await emailjs.send(
        EMAILJS_CONFIG_RESERVATIONS.SERVICE_ID,
        EMAILJS_CONFIG_RESERVATIONS.TEMPLATES.RESERVATION_STATUS,
        {
          ...templateParams,
          to_email: data.clientEmail
        },
        EMAILJS_CONFIG_RESERVATIONS.PUBLIC_KEY
      );

      console.log(`✅ Email ${data.status} envoyé avec succès`);
      return { success: true, result };
    } catch (error) {
      console.error('❌ Erreur envoi email statut:', error);
      return { success: false, error };
    }
  },

  sendReservationAcceptedEmail: async (data: {
    reservationId: string;
    clientName: string;
    clientEmail: string;
    clientPhone: string;
    carName: string;
    carCategory: string;
    pickupDate: string;
    pickupTime: string;
    returnDate: string;
    returnTime: string;
    pickupLocation: string;
    returnLocation: string;
    totalPrice: number;
    language?: string;
  }) => {
    try {
      console.log('🔔 [ACCEPTED] Tentative envoi email acceptation réservation');
      console.log('📧 [ACCEPTED] Email destination:', data.clientEmail);
      console.log('🆔 [ACCEPTED] Réservation ID:', data.reservationId);
  
      const language = data.language || 'fr';
      
      const templateParams = {
        reservation_id: data.reservationId,
        client_name: data.clientName,
        client_email: data.clientEmail,
        client_phone: data.clientPhone || (language === 'fr' ? 'Non renseigné' : 'Not provided'),
        car_name: data.carName,
        car_category: data.carCategory,
        pickup_date: data.pickupDate,
        pickup_time: data.pickupTime,
        return_date: data.returnDate,
        return_time: data.returnTime,
        pickup_location: data.pickupLocation,
        return_location: data.returnLocation,
        total_price: `${data.totalPrice} MAD`,
        current_date: new Date().toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US'),
        is_french: language === 'fr',
        is_english: language === 'en',
        is_accepted: true,
        is_rejected: false,
        reservation_status: 'accepted',
        rejection_reason: ''
      };
  
      console.log('📤 [ACCEPTED] Paramètres complets:', templateParams);
  
      const result = await emailjs.send(
        EMAILJS_CONFIG_RESERVATIONS.SERVICE_ID,
        EMAILJS_CONFIG_RESERVATIONS.TEMPLATES.RESERVATION_STATUS,
        {
          ...templateParams,
          to_email: data.clientEmail
        },
        EMAILJS_CONFIG_RESERVATIONS.PUBLIC_KEY
      );
  
      console.log('✅ [ACCEPTED] Email acceptation envoyé avec succès');
      console.log('📨 [ACCEPTED] Résultat EmailJS:', result);
      return { success: true, result };
    } catch (error: any) {
      console.error('❌ [ACCEPTED] Erreur détaillée envoi email acceptation:', {
        status: error?.status,
        text: error?.text,
        message: error?.message,
        details: error
      });
      return { success: false, error };
    }
  },

  sendReservationRejectedEmail: async (data: {
    reservationId: string;
    clientName: string;
    clientEmail: string;
    clientPhone: string;
    carName: string;
    carCategory: string;
    pickupDate: string;
    pickupTime: string;
    returnDate: string;
    returnTime: string;
    pickupLocation: string;
    returnLocation: string;
    totalPrice: number;
    rejectionReason: string;
    language?: string;
  }) => {
    try {
      console.log('🔔 [REJECTED] Tentative envoi email refus réservation');
      console.log('📧 [REJECTED] Email destination:', data.clientEmail);
      console.log('🆔 [REJECTED] Réservation ID:', data.reservationId);
  
      const language = data.language || 'fr';
      
      const templateParams = {
        reservation_id: data.reservationId,
        client_name: data.clientName,
        client_email: data.clientEmail,
        client_phone: data.clientPhone || (language === 'fr' ? 'Non renseigné' : 'Not provided'),
        car_name: data.carName,
        car_category: data.carCategory,
        pickup_date: data.pickupDate,
        pickup_time: data.pickupTime,
        return_date: data.returnDate,
        return_time: data.returnTime,
        pickup_location: data.pickupLocation,
        return_location: data.returnLocation,
        total_price: `${data.totalPrice} MAD`,
        current_date: new Date().toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US'),
        is_french: language === 'fr',
        is_english: language === 'en',
        is_accepted: false,
        is_rejected: true,
        reservation_status: 'rejected',
        rejection_reason: data.rejectionReason || (language === 'fr' ? 'Raison non spécifiée' : 'Reason not specified')
      };
  
      console.log('📤 [REJECTED] Paramètres complets:', templateParams);
  
      const result = await emailjs.send(
        EMAILJS_CONFIG_RESERVATIONS.SERVICE_ID,
        EMAILJS_CONFIG_RESERVATIONS.TEMPLATES.RESERVATION_STATUS,
        {
          ...templateParams,
          to_email: data.clientEmail
        },
        EMAILJS_CONFIG_RESERVATIONS.PUBLIC_KEY
      );
  
      console.log('✅ [REJECTED] Email refus envoyé avec succès');
      console.log('📨 [REJECTED] Résultat EmailJS:', result);
      return { success: true, result };
    } catch (error: any) {
      console.error('❌ [REJECTED] Erreur détaillée envoi email refus:', {
        status: error?.status,
        text: error?.text,
        message: error?.message,
        details: error
      });
      return { success: false, error };
    }
  }
};