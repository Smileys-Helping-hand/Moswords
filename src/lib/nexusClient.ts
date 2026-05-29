/**
 * Nexus Email & OS API Client
 * Handles integration with Nexus email system and Nexus OS
 */

export interface NexusEmailConfig {
  apiUrl: string;
  apiKey: string;
  organizationId?: string;
}

export interface NexusContact {
  id?: string;
  email: string;
  name: string;
  phone?: string;
  avatar?: string;
  customData?: Record<string, any>;
}

export interface NexusEmailResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode: number;
}

export interface NexusSyncResult {
  contactId: string;
  nexusId: string;
  status: 'synced' | 'failed' | 'pending';
  lastSync: Date;
  error?: string;
}

/**
 * Nexus Email Client
 * Manages email contacts and syncing
 */
export class NexusEmailClient {
  private apiUrl: string;
  private apiKey: string;
  private organizationId: string;

  constructor(config: NexusEmailConfig) {
    this.apiUrl = config.apiUrl;
    this.apiKey = config.apiKey;
    this.organizationId = config.organizationId || 'default';
  }

  /**
   * Make authenticated request to Nexus API
   */
  private async makeRequest<T = any>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    body?: any
  ): Promise<NexusEmailResponse<T>> {
    try {
      const response = await fetch(`${this.apiUrl}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Organization-ID': this.organizationId,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json();

      return {
        success: response.ok,
        data: response.ok ? data : undefined,
        error: !response.ok ? data?.error || 'Unknown error' : undefined,
        statusCode: response.status,
      };
    } catch (error) {
      console.error(`[NexusEmail] Request failed:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Request failed',
        statusCode: 500,
      };
    }
  }

  /**
   * Create or update a contact in Nexus
   */
  async syncContact(contact: NexusContact): Promise<NexusSyncResult> {
    try {
      const endpoint = contact.id
        ? `/api/v1/contacts/${contact.id}`
        : '/api/v1/contacts';

      const method = contact.id ? 'PUT' : 'POST';

      const response = await this.makeRequest(method, endpoint, {
        email: contact.email,
        name: contact.name,
        phone: contact.phone,
        avatar: contact.avatar,
        metadata: contact.customData,
      });

      if (response.success && response.data) {
        return {
          contactId: contact.id || '',
          nexusId: response.data.id,
          status: 'synced',
          lastSync: new Date(),
        };
      }

      return {
        contactId: contact.id || '',
        nexusId: '',
        status: 'failed',
        lastSync: new Date(),
        error: response.error,
      };
    } catch (error) {
      return {
        contactId: contact.id || '',
        nexusId: '',
        status: 'failed',
        lastSync: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Fetch all contacts from Nexus
   */
  async getContacts(limit = 100, offset = 0) {
    return this.makeRequest('GET', `/api/v1/contacts?limit=${limit}&offset=${offset}`);
  }

  /**
   * Get single contact from Nexus
   */
  async getContact(contactId: string) {
    return this.makeRequest('GET', `/api/v1/contacts/${contactId}`);
  }

  /**
   * Delete contact from Nexus
   */
  async deleteContact(contactId: string) {
    return this.makeRequest('DELETE', `/api/v1/contacts/${contactId}`);
  }

  /**
   * Send email via Nexus
   */
  async sendEmail(to: string, subject: string, body: string, cc?: string[], bcc?: string[]) {
    return this.makeRequest('POST', '/api/v1/emails/send', {
      to,
      cc,
      bcc,
      subject,
      body,
      contentType: 'text/html',
    });
  }

  /**
   * Get Nexus organization info
   */
  async getOrgInfo() {
    return this.makeRequest('GET', `/api/v1/organizations/${this.organizationId}`);
  }

  /**
   * Verify API key is valid
   */
  async verifyConnection(): Promise<boolean> {
    const response = await this.makeRequest('GET', '/api/v1/health');
    return response.success;
  }

  /**
   * Batch sync multiple contacts
   */
  async batchSyncContacts(contacts: NexusContact[]): Promise<NexusSyncResult[]> {
    const results: NexusSyncResult[] = [];

    for (const contact of contacts) {
      const result = await this.syncContact(contact);
      results.push(result);
      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return results;
  }
}

/**
 * Nexus OS Client
 * Manages OS-level integrations and features
 */
export class NexusOSClient {
  private apiUrl: string;
  private apiKey: string;

  constructor(apiUrl: string, apiKey: string) {
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
  }

  /**
   * Make authenticated request to Nexus OS API
   */
  private async makeRequest<T = any>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    body?: any
  ): Promise<NexusEmailResponse<T>> {
    try {
      const response = await fetch(`${this.apiUrl}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await response.json();

      return {
        success: response.ok,
        data: response.ok ? data : undefined,
        error: !response.ok ? data?.error || 'Unknown error' : undefined,
        statusCode: response.status,
      };
    } catch (error) {
      console.error(`[NexusOS] Request failed:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Request failed',
        statusCode: 500,
      };
    }
  }

  /**
   * Get user profile from Nexus OS
   */
  async getUserProfile(userId: string) {
    return this.makeRequest('GET', `/api/v1/users/${userId}`);
  }

  /**
   * Update user profile in Nexus OS
   */
  async updateUserProfile(userId: string, profileData: Record<string, any>) {
    return this.makeRequest('PUT', `/api/v1/users/${userId}`, profileData);
  }

  /**
   * Get user settings from Nexus OS
   */
  async getUserSettings(userId: string) {
    return this.makeRequest('GET', `/api/v1/users/${userId}/settings`);
  }

  /**
   * Update user settings in Nexus OS
   */
  async updateUserSettings(userId: string, settings: Record<string, any>) {
    return this.makeRequest('PUT', `/api/v1/users/${userId}/settings`, settings);
  }

  /**
   * Get connected apps/integrations
   */
  async getConnectedApps(userId: string) {
    return this.makeRequest('GET', `/api/v1/users/${userId}/apps`);
  }

  /**
   * Connect an app/integration
   */
  async connectApp(userId: string, appId: string, credentials: Record<string, any>) {
    return this.makeRequest('POST', `/api/v1/users/${userId}/apps/${appId}/connect`, credentials);
  }

  /**
   * Disconnect an app/integration
   */
  async disconnectApp(userId: string, appId: string) {
    return this.makeRequest('DELETE', `/api/v1/users/${userId}/apps/${appId}`);
  }

  /**
   * Get app status
   */
  async getAppStatus(appId: string) {
    return this.makeRequest('GET', `/api/v1/apps/${appId}/status`);
  }

  /**
   * Log event to Nexus OS
   */
  async logEvent(userId: string, eventType: string, eventData: Record<string, any>) {
    return this.makeRequest('POST', `/api/v1/users/${userId}/events`, {
      type: eventType,
      data: eventData,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get user activity logs
   */
  async getActivityLogs(userId: string, limit = 50) {
    return this.makeRequest('GET', `/api/v1/users/${userId}/activity?limit=${limit}`);
  }

  /**
   * Verify connection to Nexus OS
   */
  async verifyConnection(): Promise<boolean> {
    const response = await this.makeRequest('GET', '/api/v1/health');
    return response.success;
  }
}

/**
 * Factory function to create configured Nexus Email client
 */
export function createNexusEmailClient(apiKey: string, apiUrl?: string): NexusEmailClient {
  return new NexusEmailClient({
    apiKey,
    apiUrl: apiUrl || process.env.NEXUS_EMAIL_API_URL || 'https://api.nexusemail.com',
  });
}

/**
 * Factory function to create configured Nexus OS client
 */
export function createNexusOSClient(apiKey: string, apiUrl?: string): NexusOSClient {
  return new NexusOSClient(
    apiUrl || process.env.NEXUS_OS_API_URL || 'https://api.nexusos.com',
    apiKey
  );
}
