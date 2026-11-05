export const compose =
  <P>(...wrappers: Array<(h: any) => any>) =>
  (handler: any) =>
    wrappers.reduceRight((acc, w) => w(acc), handler)
