// Database types for Supabase
// Generate with: npx supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/supabase.types.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      orders: {
        Row: {
          id: number
          order_number: string
          status_id: string
          financial_status: number
          payment_status: number
          currency: string
          total_price: string
          subtotal_price: string
          current_total_discounts: string
          local_currency_amount: string
          exchange_rate_usd: string
          customer: Json
          line_items: Json
          payment: Json
          afid: string | null
          affiliate_name: string | null
          affiliate_email: string | null
          affiliate_slug: string
          affiliate_amount: string
          refunds: Json | null
          chargeback_received: number
          chargeback_at: string | null
          created_at: string
          updated_at: string
          synced_at: string
        }
        Insert: {
          id: number
          order_number: string
          status_id: string
          financial_status: number
          payment_status: number
          currency: string
          total_price: string
          subtotal_price: string
          current_total_discounts: string
          local_currency_amount: string
          exchange_rate_usd: string
          customer: Json
          line_items: Json
          payment: Json
          afid?: string | null
          affiliate_name?: string | null
          affiliate_email?: string | null
          affiliate_slug: string
          affiliate_amount: string
          refunds?: Json | null
          chargeback_received: number
          chargeback_at?: string | null
          created_at: string
          updated_at: string
          synced_at?: string
        }
        Update: {
          id?: number
          order_number?: string
          status_id?: string
          financial_status?: number
          payment_status?: number
          currency?: string
          total_price?: string
          subtotal_price?: string
          current_total_discounts?: string
          local_currency_amount?: string
          exchange_rate_usd?: string
          customer?: Json
          line_items?: Json
          payment?: Json
          afid?: string | null
          affiliate_name?: string | null
          affiliate_email?: string | null
          affiliate_slug?: string
          affiliate_amount?: string
          refunds?: Json | null
          chargeback_received?: number
          chargeback_at?: string | null
          created_at?: string
          updated_at?: string
          synced_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
