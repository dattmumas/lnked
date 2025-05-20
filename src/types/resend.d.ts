/* eslint-disable @typescript-eslint/no-explicit-any */
declare module "resend" {
  export class Resend {
    constructor(apiKey: string);
    emails: {
      send(options: any): Promise<any>;
    };
  }
}
