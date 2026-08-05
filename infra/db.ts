export function dbEnvironment() {
  return {
    DB_HOST: process.env.DB_HOST,
    DB_NAME: process.env.DB_NAME,
    DB_USER: process.env.DB_USER,
  };
}

export function dbConnectPermission(
  dbUser = process.env.DB_USER ?? "postgres",
) {
  const accountId = process.env.ACCOUNT_ID;
  const rdsDbId = process.env.RDS_DB_ID;
  const region = aws.getRegionOutput().name;

  return {
    actions: ["rds-db:connect"],
    resources: [
      $interpolate`arn:aws:rds-db:${region}:${accountId}:dbuser:${rdsDbId}/${dbUser}`,
    ],
    effect: "allow" as const,
  };
}
