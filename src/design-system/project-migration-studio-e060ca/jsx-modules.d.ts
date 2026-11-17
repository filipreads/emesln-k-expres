declare module "*.jsx" {
  const Component: () => import("react").JSX.Element;
  export default Component;
  export const partners: { name: string; mark: import("react").ReactNode }[];
}
