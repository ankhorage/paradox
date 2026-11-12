export default {
  id: '@fixture/basic',
  category: 'basic',
  version: '1.0.0',
  capabilities: [
    {
      id: 'basic.run',
      owner: '@fixture/basic',
      access: ['invoke'],
      binding: { kind: 'action', bindableAs: ['target'] },
    },
  ],
  commands: [{ path: ['run'], summary: 'Run the fixture.', capability: 'basic.run' }],
};
