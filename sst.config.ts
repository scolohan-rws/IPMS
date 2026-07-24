/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "ipms",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: ["production"].includes(input?.stage),
      home: "aws",
    };
  },
  async run() {
    const api = new sst.aws.ApiGatewayV2("ipms-api", {});
    api.route("ANY /v1", {
      bundle: "lambda/dist",
      handler: "index.handler"
    });
  },
});
