/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
 
declare module "react" {
  export type ElementType = any;
  export const useState: any;
  export const useEffect: any;
  export const useRef: any;
  export const useMemo: any;
  export const useTransition: any;
  export type ReactNode = any;
  export type ComponentPropsWithoutRef<T = any> = any;
  export type ComponentProps<T = any> = any;
  export type TextareaHTMLAttributes<T> = any;
  const content: any;
  export = content;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}
