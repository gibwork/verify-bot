export interface ServerConfig {
    server_id: string;
    server_name: string;
    token_address: string;
    required_balance: string;
    role_id: string;
    rpc_url: string;
    setup_complete: boolean;
    admin_user_id?: string;
    token_symbol?: string | null;
    token_decimals?: number | null;
    created_at?: string;
    updated_at?: string;
}

export interface Holder {
    id?: string;
    discord_user_id: string;
    server_id: string;
    username: string;
    addresses: string[];
    active: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface VerificationData {
    userId: string;
    action: "new" | "add";
    guildId: string;
}