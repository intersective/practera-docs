/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: 'practera-roadmap',
      removal: input?.stage === 'production' ? 'retain' : 'remove',
      protect: ['production'].includes(input?.stage),
      home: 'aws',
    };
  },
  async run() {
    const vpc = await aws.ec2.getVpc({ filters: [{ name: 'tag:Name', values: ['practera-vpc'] }] });
    const subnets = await aws.ec2.getSubnets({ filters: [{ name: 'vpc-id', values: [vpc.id] }] });

    const site = new sst.aws.Nextjs('PracteraRoadmap', {
      path: '.',
      openNextVersion: '3.9.6',
      domain: {
        name: `roadmap.${$app.stage === 'production' ? '' : `${$app.stage}.`}practera.com`,
        dns: sst.aws.dns({ zone: 'practera.com' }),
      },
      environment: {
        DB_HOST: process.env.DB_HOST ?? '',
        DB_PORT: process.env.DB_PORT ?? '5432',
        DB_NAME: process.env.DB_NAME ?? 'roadmap',
        DB_USER: process.env.DB_USER ?? '',
        DB_PASSWORD: process.env.DB_PASSWORD ?? '',
        DB_SSL: 'true',
        OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? '',
        ATLASSIAN_TOKEN: process.env.ATLASSIAN_TOKEN ?? '',
        ATLASSIAN_EMAIL: process.env.ATLASSIAN_EMAIL ?? '',
        ATLASSIAN_BASE_URL: process.env.ATLASSIAN_BASE_URL ?? 'https://practera.atlassian.net',
        GITHUB_TOKEN: process.env.GITHUB_TOKEN ?? '',
        GITHUB_ORG: 'intersective',
        WORKSPACE_ROOT: '/tmp/workspace',
      },
      vpc: {
        id: vpc.id,
        subnets: subnets.ids,
      },
    });

    return {
      url: site.url,
    };
  },
});
