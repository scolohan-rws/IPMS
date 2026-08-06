/** Standard tag set applied to every resource. */
export const commonTags = () => ({
  Application: $app.name,
  Environment: $app.stage,
  ManagedBy: "sst",
});

/** `<application>-<stage>-<resource>` naming, per the IPMS convention. */
export const resourceName = (suffix: string) =>
  `${$app.name}-${$app.stage}-${suffix}`;
