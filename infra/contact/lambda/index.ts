import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { SESv2Client } from '@aws-sdk/client-sesv2';
import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';
import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { loadConfig } from './config';
import { LocalMockEmailTransport } from './email';
import { HandlerDeps, RuntimeResult, handleContactRequest } from './handler';
import { DynamoGuardStore } from './dynamo-store';
import { SesEmailTransport } from './ses-transport';

/** Lambda entry point. Wiring only — behavior lives in handler.ts. */
let runtimePromise: Promise<RuntimeResult> | undefined;

async function buildRuntime(): Promise<RuntimeResult> {
  const ssm = new SSMClient({});
  const result = await loadConfig(process.env, async (name) => {
    const output = await ssm.send(new GetParameterCommand({ Name: name, WithDecryption: true }));
    return output.Parameter?.Value;
  });
  if (!result.ok) {
    return result;
  }
  const { config } = result;
  const store = new DynamoGuardStore(new DynamoDBClient({}), config.guardTableName);
  // config.ts only yields `local-mock` for local/test stages; deployed stages always get SES.
  const email =
    config.emailTransport === 'local-mock'
      ? new LocalMockEmailTransport({ printBody: process.env['CONTACT_LOCAL_MOCK_PRINT_BODY'] === '1' })
      : new SesEmailTransport(new SESv2Client(config.sesRegion ? { region: config.sesRegion } : {}));
  return { ok: true, runtime: { config, store, email } };
}

const deps: HandlerDeps = {
  getRuntime: () => {
    // Do not cache failures: a transient SSM error must not poison the container.
    runtimePromise ??= buildRuntime().then((result) => {
      if (!result.ok) {
        runtimePromise = undefined;
      }
      return result;
    });
    return runtimePromise;
  },
  fetchImpl: (url, init) => fetch(url, init),
  now: () => Date.now(),
  log: (entry) => console.log(JSON.stringify(entry)),
};

export async function handler(
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyStructuredResultV2> {
  return handleContactRequest(event, deps);
}
