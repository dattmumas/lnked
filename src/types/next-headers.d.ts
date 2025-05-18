// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare module "next/headers" {
  const content: any;
  export = content;
  export const cookies: any;
}
