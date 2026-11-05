import axios, { AxiosInstance } from "axios";
export class RetryableError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = "RetryableError";
  }
}
export class NonRetryableError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = "NonRetryableError";
  }
}
export interface OpenObserveConfig {
  url: string;
  organization: string;
  username: string;
  password: string;
  timeout?: number;
}
export class OpenObserveClient {
  private baseUrl: string;
  private organization: string;
  private authToken: string;
  private axiosInstance: AxiosInstance;

  constructor(config: OpenObserveConfig) {
    this.baseUrl = config.url;
    this.organization = config.organization;
    this.authToken = Buffer.from(
      `${config.username}:${config.password}`
    ).toString("base64");

    this.axiosInstance = axios.create({
      timeout: config.timeout || 5000,
      headers: {
        Authorization: `Basic ${this.authToken}`,
        "Content-Type": "application/json",
      },
    });

    // Add response interceptor for better error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error: any) => {
        if (error.response?.status >= 500) {
          throw new RetryableError(
            `OpenObserve server error: ${error.message}`,
            error
          );
        } else if (error.response?.status >= 400) {
          throw new NonRetryableError(
            `OpenObserve client error: ${error.message}`,
            error
          );
        } else {
          throw new RetryableError(
            `OpenObserve network error: ${error.message}`,
            error
          );
        }
      }
    );
  }

  async ingest(stream: string, data: any[]): Promise<void> {
    const url = `${this.baseUrl}/api/${this.organization}/${stream}/_json`;

    try {
      await this.axiosInstance.post(url, data);
    } catch (error) {
      // Error handling is done in the interceptor
      throw error;
    }
  }

  async query(stream: string, query: any): Promise<any> {
    const url = `${this.baseUrl}/api/${this.organization}/${stream}/_search`;

    try {
      const response = await this.axiosInstance.post(url, query);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}
