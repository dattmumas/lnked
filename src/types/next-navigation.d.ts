/* eslint-disable @typescript-eslint/no-explicit-any */
 
declare module "next/navigation" {
  const content: any;
  export = content;
  export const usePathname: any;
  export const useRouter: any;
  export const redirect: any;
}
