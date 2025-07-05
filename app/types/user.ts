interface Identity {
    provider: string;
    access_token: string;
    expires_in: number;
    user_id: string;
    connection: string;
    isSocial: boolean;
  }
  
  interface UserMetadata {
    roles: string[];
    returning_user: boolean;
  }
  export interface UserInfoAuth0 {
    created_at: string;
    email: string;
    email_verified: boolean;
    family_name: string;
    given_name: string;
    identities: Identity[];
    idp_tenant_domain: string;
    name: string;
    nickname: string;
    picture: string;
    updated_at: string;
    user_id: string;
    user_metadata: UserMetadata;
    last_ip: string;
    last_login: string;
    logins_count: number;
  }
  
    interface LogDetails {
      authentication_methods: string[];
      body: {
        client_id: string;
        connection: string;
        email: string;
        is_signup: boolean;
        password: string;
        tenant: string;
      };
    }
    
    export interface LogData {
      client_id: string;
      client_name: string;
      connection: string;
      connection_id: string;
      date: string;
      description: string;
      details: LogDetails;
      ip: string;
      strategy: string;
      strategy_type: string;
      type: string;
      user_agent: string;
      user_id: string;
      user_name: string;
      log_id: string;
      tenant_name: string;
    }
    
    export interface LogDetail {
      log_id: string;
      data: LogData;
    }
    
    export interface EventAuth0 {
      version: string;
      id: string;
      "detail-type": string;
      source: string;
      account: string;
      time: string;
      region: string;
      resources: any[];
      detail: LogDetail;
    }
    