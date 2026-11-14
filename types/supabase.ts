export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      alineas: {
        Row: {
          article_id: string
          dataset_id: string
          designation: string | null
          dispositif: string | null
          id: string
          numero: number
          tag_list_id: string
          texte_id: string
        }
        Insert: {
          article_id: string
          dataset_id: string
          designation?: string | null
          dispositif?: string | null
          id?: string
          numero: number
          tag_list_id?: string
          texte_id: string
        }
        Update: {
          article_id?: string
          dataset_id?: string
          designation?: string | null
          dispositif?: string | null
          id?: string
          numero?: number
          tag_list_id?: string
          texte_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alineas_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alineas_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alineas_texte_id_fkey"
            columns: ["texte_id"]
            isOneToOne: false
            referencedRelation: "textes"
            referencedColumns: ["id"]
          },
        ]
      }
      amendements: {
        Row: {
          acteur_ref: string | null
          alinea_id: string | null
          amendement_parent: string | null
          amendement_parent_id: string | null
          article_id: string | null
          dataset_id: string
          date_depot: string | null
          date_sort: string | null
          discussion_commune: string | null
          discussion_identique: string | null
          dispositif: string | null
          division_avant_apres: string
          division_titre: string | null
          document_uri: string | null
          etat: string | null
          expose_sommaire: string | null
          groupe_politique_ref: string | null
          id: string
          numero_long: string
          rang: number | null
          signataires_affichable: string | null
          sort: string
          sort_en_seance: string | null
          sous_etat: string | null
          tag_list_id: string
          texte_id: string
          tri_amendement: string | null
          type_auteur: string | null
          uid: string
        }
        Insert: {
          acteur_ref?: string | null
          alinea_id?: string | null
          amendement_parent?: string | null
          amendement_parent_id?: string | null
          article_id?: string | null
          dataset_id: string
          date_depot?: string | null
          date_sort?: string | null
          discussion_commune?: string | null
          discussion_identique?: string | null
          dispositif?: string | null
          division_avant_apres?: string
          division_titre?: string | null
          document_uri?: string | null
          etat?: string | null
          expose_sommaire?: string | null
          groupe_politique_ref?: string | null
          id?: string
          numero_long: string
          rang?: number | null
          signataires_affichable?: string | null
          sort?: string
          sort_en_seance?: string | null
          sous_etat?: string | null
          tag_list_id?: string
          texte_id: string
          tri_amendement?: string | null
          type_auteur?: string | null
          uid: string
        }
        Update: {
          acteur_ref?: string | null
          alinea_id?: string | null
          amendement_parent?: string | null
          amendement_parent_id?: string | null
          article_id?: string | null
          dataset_id?: string
          date_depot?: string | null
          date_sort?: string | null
          discussion_commune?: string | null
          discussion_identique?: string | null
          dispositif?: string | null
          division_avant_apres?: string
          division_titre?: string | null
          document_uri?: string | null
          etat?: string | null
          expose_sommaire?: string | null
          groupe_politique_ref?: string | null
          id?: string
          numero_long?: string
          rang?: number | null
          signataires_affichable?: string | null
          sort?: string
          sort_en_seance?: string | null
          sous_etat?: string | null
          tag_list_id?: string
          texte_id?: string
          tri_amendement?: string | null
          type_auteur?: string | null
          uid?: string
        }
        Relationships: [
          {
            foreignKeyName: "amendements_alinea_id_fkey"
            columns: ["alinea_id"]
            isOneToOne: false
            referencedRelation: "alineas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amendements_amendement_parent_id_fkey"
            columns: ["amendement_parent_id"]
            isOneToOne: false
            referencedRelation: "amendements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amendements_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amendements_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "amendements_sort_fkey"
            columns: ["sort"]
            isOneToOne: false
            referencedRelation: "sorts"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "amendements_texte_id_fkey"
            columns: ["texte_id"]
            isOneToOne: false
            referencedRelation: "textes"
            referencedColumns: ["id"]
          },
        ]
      }
      articles: {
        Row: {
          dataset_id: string
          designation: string
          dispositif: string | null
          id: string
          ordre: number
          tag_list_id: string
          texte_id: string
          titre: string | null
          uid: string
        }
        Insert: {
          dataset_id: string
          designation: string
          dispositif?: string | null
          id?: string
          ordre: number
          tag_list_id?: string
          texte_id: string
          titre?: string | null
          uid: string
        }
        Update: {
          dataset_id?: string
          designation?: string
          dispositif?: string | null
          id?: string
          ordre?: number
          tag_list_id?: string
          texte_id?: string
          titre?: string | null
          uid?: string
        }
        Relationships: [
          {
            foreignKeyName: "articles_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_texte_id_fkey"
            columns: ["texte_id"]
            isOneToOne: false
            referencedRelation: "textes"
            referencedColumns: ["id"]
          },
        ]
      }
      datasets: {
        Row: {
          description: string | null
          id: string
          imported_at: string
          license: string
          name: string
          perimeter: Json
          slug: string
          source_label: string
          tag_list_id: string
        }
        Insert: {
          description?: string | null
          id?: string
          imported_at?: string
          license?: string
          name: string
          perimeter?: Json
          slug: string
          source_label?: string
          tag_list_id?: string
        }
        Update: {
          description?: string | null
          id?: string
          imported_at?: string
          license?: string
          name?: string
          perimeter?: Json
          slug?: string
          source_label?: string
          tag_list_id?: string
        }
        Relationships: []
      }
      sorts: {
        Row: {
          code: string
          color_token: string
          display_order: number
          label: string
        }
        Insert: {
          code: string
          color_token: string
          display_order: number
          label: string
        }
        Update: {
          code?: string
          color_token?: string
          display_order?: number
          label?: string
        }
        Relationships: []
      }
      tag_links: {
        Row: {
          confidence: number | null
          created_at: string
          dataset_id: string
          id: string
          model: string | null
          source: string
          tag_id: string
          tag_list_id: string
          target_type: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          dataset_id: string
          id?: string
          model?: string | null
          source?: string
          tag_id: string
          tag_list_id: string
          target_type: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          dataset_id?: string
          id?: string
          model?: string | null
          source?: string
          tag_id?: string
          tag_list_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "tag_links_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tag_links_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          category: string
          description: string | null
          id: string
          label: string
          slug: string
        }
        Insert: {
          category?: string
          description?: string | null
          id?: string
          label: string
          slug: string
        }
        Update: {
          category?: string
          description?: string | null
          id?: string
          label?: string
          slug?: string
        }
        Relationships: []
      }
      textes: {
        Row: {
          dataset_id: string
          etape_texte: string | null
          id: string
          legislature: number | null
          organe_examen: string | null
          slug: string
          tag_list_id: string
          titre: string
          uid: string
        }
        Insert: {
          dataset_id: string
          etape_texte?: string | null
          id?: string
          legislature?: number | null
          organe_examen?: string | null
          slug: string
          tag_list_id?: string
          titre: string
          uid: string
        }
        Update: {
          dataset_id?: string
          etape_texte?: string | null
          id?: string
          legislature?: number | null
          organe_examen?: string | null
          slug?: string
          tag_list_id?: string
          titre?: string
          uid?: string
        }
        Relationships: [
          {
            foreignKeyName: "textes_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      fetch_raw_rows: {
        Args: {
          p_jeu: string
          p_limit?: number
          p_offset?: number
          p_texte_uid: string
        }
        Returns: Json
      }
      fetch_raw_summary: { Args: { p_texte_uid: string }; Returns: Json }
      raw_begin_corpus: { Args: never; Returns: string }
      raw_begin_extract: { Args: { p_texte_uid: string }; Returns: Json }
      raw_corpus_checkpoint: {
        Args: { p_run_id: string; p_state: Json }
        Returns: undefined
      }
      raw_corpus_state: { Args: { p_run_id: string }; Returns: Json }
      raw_finish_corpus: { Args: { p_run_id: string }; Returns: Json }
      raw_finish_extract: { Args: { p_run_id: string }; Returns: Json }
      raw_pull_amendements: {
        Args: { p_decalage: number; p_run_id: string }
        Returns: Json
      }
      raw_pull_corpus_page: {
        Args: {
          p_decalage: number
          p_filtres: Json
          p_jeu: string
          p_run_id: string
          p_slot?: number
        }
        Returns: Json
      }
      raw_store_hemicycle_key: { Args: { p_key: string }; Returns: undefined }
      raw_store_hemicycle_key_slot: {
        Args: { p_key: string; p_slot: number }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
