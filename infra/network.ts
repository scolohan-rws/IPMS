import {
  POSTGRES_PORT,
  VPC_ANYONE_CIDR,
} from "../src/constants/app.constants.js";
import { commonTags, resourceName } from "./resource-metadata.js";

export type VpcConfig = {
  privateSubnets: $util.Input<string>[];
  securityGroups: $util.Input<string>[];
};

let cached:
  | Promise<{ lambdaSG: aws.ec2.SecurityGroup; vpcConfig: VpcConfig }>
  | undefined;

export function getNetwork() {
  cached ??= build();
  return cached;
}

async function build() {
  const dbVpcId = process.env.DB_VPC_ID;
  const rdsSGId = process.env.RDS_SG_ID;
  if (!dbVpcId) throw new Error("DB_VPC_ID is not set");
  if (!rdsSGId) throw new Error("RDS_SG_ID is not set");

  const vpc = await aws.ec2.getVpc({ id: process.env.DB_VPC_ID });

  const subnets = await aws.ec2.getSubnets({
    filters: [{ name: "vpc-id", values: [vpc.id] }],
  });

  const lambdaSG = new aws.ec2.SecurityGroup(
    "authLambdaSG",
    {
      name: resourceName("lambda"),
      vpcId: vpc.id,
      egress: [
        {
          protocol: "-1",
          fromPort: 0,
          toPort: 0,
          cidrBlocks: [VPC_ANYONE_CIDR],
        },
      ],
      tags: commonTags(),
    },
    { deleteBeforeReplace: true },
  );

  new aws.vpc.SecurityGroupIngressRule("RdsFromLambdaSG", {
    securityGroupId: rdsSGId,
    referencedSecurityGroupId: lambdaSG.id,
    ipProtocol: "tcp",
    fromPort: POSTGRES_PORT,
    toPort: POSTGRES_PORT,
    description: resourceName("lambda"),
    tags: commonTags(),
  });

  return {
    lambdaSG,
    vpcConfig: { privateSubnets: subnets.ids, securityGroups: [lambdaSG.id] },
  };
}
