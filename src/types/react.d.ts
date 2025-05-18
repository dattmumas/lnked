// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare module "react" {
  export type ElementType = any;
  export const useState: any;
  export const useEffect: any;
  const content: any;
  export = content;
}
