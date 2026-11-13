// Fichier GÉNÉRÉ — ne pas éditer à la main.
// Régénérer après chaque migration :
//   - via le MCP Supabase : outil `generate_typescript_types` (projet mloaychfjhajdjfktcjp), puis coller la sortie ici ;
//   - ou via la CLI : `pnpm supabase:types` (nécessite `pnpm supabase:login` une fois).
// Placeholder initial : schéma `public` vide tant qu'aucune table n'a été typée.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
