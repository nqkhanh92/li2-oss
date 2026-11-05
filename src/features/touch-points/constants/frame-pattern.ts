export type FrameProperties = {
  reactElement: () => JSX.Element;
  key: string;
  transform?: string;
  options?: {
    [key: string]: string;
  };
};
export type Frames = {
  [key: string]: FrameProperties;
};
