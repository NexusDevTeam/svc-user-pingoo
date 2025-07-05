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
  

    
    export interface EventAuth0 {
      version: string;
      id: string;
      "detail-type": string;
      source: string;
      account: string;
      time: string;
      region: string;
      resources: any[];
      detail: {
        id: string;
        source: string;
        specversion: string;
        type: string;
        time: string;
        data: {
          object: UserInfoAuth0;
        };
        a0tenant: string;
        a0stream: string;
      };
    }
    