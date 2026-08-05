import { getNetwork } from "./network.js";
import { dbEnvironment, dbConnectPermission } from "./db.js";
import { loggingEnvironment } from "./logger.js";

export async function withDbAccess<T extends sst.aws.FunctionArgs>(
  args: T,
): Promise<T> {
  const { vpcConfig } = await getNetwork();

  return {
    ...args,
    ...($dev ? {} : { vpc: vpcConfig }),
    environment: {
      ...dbEnvironment(),
      ...loggingEnvironment(),
      ...args.environment,
    },
    permissions: [...(args.permissions ?? []), dbConnectPermission()],
  };
}
