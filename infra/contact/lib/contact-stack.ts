import * as path from 'node:path';
import * as cdk from 'aws-cdk-lib';
import * as apigw from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export interface ContactStackProps extends cdk.StackProps {
  /** Deployed stage name, e.g. `prod`. `local`/`test` are reserved for the local mock. */
  stage: string;
  /** Fixed server-side recipient (CONTACT_TO_EMAIL). Never provided by the browser. */
  toEmail: string;
  /** Verified SES sender (CONTACT_FROM_EMAIL). */
  fromEmail: string;
  /** SES identity name that authorizes `fromEmail`: the address itself or its verified domain. */
  sesIdentity: string;
  /** Browser origins allowed to call the API (https only), e.g. https://easypayments.dev. */
  allowedOrigins: string[];
  /** SSM SecureString parameter names (created manually, never stored in code). */
  turnstileSecretParam: string;
  ipHashSecretParam: string;
  dailySendCap: number;
  /** Lambda runtime. Defaults to Node 20 as specified; newer runtimes work unchanged. */
  runtime?: lambda.Runtime;
}

/**
 * Contact form backend: HTTP API (POST /contact) -> Lambda (Node 20) -> SES, with one
 * DynamoDB table for rate limits, daily cap, and idempotency (TTL cleanup).
 *
 * This stack is DEFINITION ONLY. Nothing is created until `cdk deploy` is run manually.
 */
export class ContactStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ContactStackProps) {
    super(scope, id, props);

    const isProd = props.stage === 'prod';

    const guardTable = new dynamodb.Table(this, 'GuardTable', {
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'expiresAt',
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    const logGroup = new logs.LogGroup(this, 'ContactFunctionLogs', {
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const contactFunction = new NodejsFunction(this, 'ContactFunction', {
      entry: path.join(__dirname, '..', 'lambda', 'index.ts'),
      handler: 'handler',
      runtime: props.runtime ?? lambda.Runtime.NODEJS_20_X,
      architecture: lambda.Architecture.ARM_64,
      memorySize: 256,
      timeout: cdk.Duration.seconds(15),
      logGroup,
      environment: {
        STAGE: props.stage,
        // Deployed functions are always production-like: local-mock email is refused in config.ts.
        NODE_ENV: 'production',
        CONTACT_EMAIL_TRANSPORT: 'ses',
        CONTACT_TO_EMAIL: props.toEmail,
        CONTACT_FROM_EMAIL: props.fromEmail,
        CONTACT_ALLOWED_ORIGINS: props.allowedOrigins.join(','),
        GUARD_TABLE_NAME: guardTable.tableName,
        TURNSTILE_SECRET_SSM_PARAM: props.turnstileSecretParam,
        IP_HASH_SECRET_SSM_PARAM: props.ipHashSecretParam,
        RATE_LIMIT_WINDOW_SECONDS: '900',
        RATE_LIMIT_MAX_SUBMISSIONS: '3',
        RATE_LIMIT_MAX_ATTEMPTS: '10',
        DAILY_SEND_CAP: String(props.dailySendCap),
        SES_REGION: this.region,
      },
      bundling: {
        target: 'node20',
        minify: true,
        sourceMap: true,
        // Bundle the AWS SDK so the deployed code matches the lockfile exactly.
        externalModules: [],
      },
    });

    // --- Least-privilege IAM -------------------------------------------------------------
    contactFunction.addToRolePolicy(
      new iam.PolicyStatement({
        sid: 'GuardTableAccess',
        actions: ['dynamodb:UpdateItem', 'dynamodb:GetItem', 'dynamodb:PutItem'],
        resources: [guardTable.tableArn],
      }),
    );

    const identityArn = (identity: string) =>
      this.formatArn({
        service: 'ses',
        resource: 'identity',
        resourceName: identity,
        arnFormat: cdk.ArnFormat.SLASH_RESOURCE_NAME,
      });
    contactFunction.addToRolePolicy(
      new iam.PolicyStatement({
        sid: 'SendContactEmail',
        actions: ['ses:SendEmail'],
        // Sender identity; the recipient identity is listed too because SES accounts still in the
        // sandbox authorize the recipient identity as well.
        resources: [identityArn(props.sesIdentity), identityArn(props.toEmail)],
        conditions: { StringEquals: { 'ses:FromAddress': props.fromEmail } },
      }),
    );

    const parameterArn = (name: string) =>
      this.formatArn({
        service: 'ssm',
        resource: 'parameter',
        resourceName: name.replace(/^\//, ''),
        arnFormat: cdk.ArnFormat.SLASH_RESOURCE_NAME,
      });
    contactFunction.addToRolePolicy(
      new iam.PolicyStatement({
        sid: 'ReadSecrets',
        actions: ['ssm:GetParameter'],
        resources: [parameterArn(props.turnstileSecretParam), parameterArn(props.ipHashSecretParam)],
      }),
    );

    // --- HTTP API --------------------------------------------------------------------------
    const httpApi = new apigw.HttpApi(this, 'ContactApi', {
      description: 'Easy Payments website contact form (POST /contact)',
      createDefaultStage: false,
      corsPreflight: {
        allowOrigins: props.allowedOrigins,
        allowMethods: [apigw.CorsHttpMethod.POST, apigw.CorsHttpMethod.OPTIONS],
        allowHeaders: ['content-type', 'idempotency-key'],
        exposeHeaders: ['Retry-After', 'Idempotent-Replay'],
        maxAge: cdk.Duration.days(1),
      },
    });

    httpApi.addRoutes({
      path: '/contact',
      methods: [apigw.HttpMethod.POST],
      integration: new HttpLambdaIntegration('ContactIntegration', contactFunction),
    });

    // Coarse edge throttle in front of the Lambda's own per-IP limits.
    new apigw.HttpStage(this, 'DefaultStage', {
      httpApi,
      autoDeploy: true,
      throttle: { rateLimit: 5, burstLimit: 10 },
    });

    new cdk.CfnOutput(this, 'ContactApiUrl', {
      value: `${httpApi.apiEndpoint}/contact`,
      description: 'Set as environment.contactApiUrl (https) and add its origin to CSP connect-src.',
    });
    new cdk.CfnOutput(this, 'GuardTableName', { value: guardTable.tableName });
  }
}
