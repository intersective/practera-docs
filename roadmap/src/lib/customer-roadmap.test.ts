import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  partitionCustomerInitiatives,
  renderCustomerRoadmap,
  type CustomerInitiativeFields,
} from './customer-roadmap.ts';

const mentor: CustomerInitiativeFields = {
  name: 'Mentor workspace',
  customerSummary: 'A clearer place for mentors to review work.',
  customerVisible: 1,
  status: 'planned',
  year: 2026,
  startQuarter: 'Q3',
  endQuarter: null,
};

describe('partitionCustomerInitiatives', () => {
  it('publishes a visible item with a summary that is not cancelled', () => {
    const { publishable, blocked } = partitionCustomerInitiatives([mentor]);
    assert.equal(publishable.length, 1);
    assert.equal(publishable[0]?.name, 'Mentor workspace');
    assert.equal(blocked.length, 0);
  });

  it('omits internal items even when they have a summary', () => {
    const { publishable, blocked } = partitionCustomerInitiatives([
      { ...mentor, customerVisible: 0 },
    ]);
    assert.equal(publishable.length, 0);
    assert.equal(blocked.length, 0);
  });

  it('blocks a visible item that has no customer summary', () => {
    const { publishable, blocked } = partitionCustomerInitiatives([
      { ...mentor, customerSummary: '   ' },
    ]);
    assert.equal(publishable.length, 0);
    assert.equal(blocked.length, 1);
    assert.match(blocked[0]?.reasons.join(' ') ?? '', /customer summary/);
  });

  it('blocks a cancelled item that is marked visible', () => {
    const { publishable, blocked } = partitionCustomerInitiatives([
      { ...mentor, status: 'cancelled' },
    ]);
    assert.equal(publishable.length, 0);
    assert.match(blocked[0]?.reasons.join(' ') ?? '', /Cancelled/);
  });
});

describe('renderCustomerRoadmap', () => {
  it('includes the provisional banner and coarse status, grouped by year and quarter', () => {
    const markdown = renderCustomerRoadmap([
      mentor,
      {
        name: 'Earlier item',
        customerSummary: 'Ships first.',
        customerVisible: 1,
        status: 'inDevelopment',
        year: 2026,
        startQuarter: 'Q1',
        endQuarter: null,
      },
      {
        name: 'Next year',
        customerSummary: 'Follows on.',
        customerVisible: 1,
        status: 'complete',
        year: 2027,
        startQuarter: null,
        endQuarter: 'Q2',
      },
      {
        name: 'Kept going',
        customerSummary: 'Still supported.',
        customerVisible: 1,
        status: 'maintenance',
        year: 2026,
        startQuarter: null,
        endQuarter: null,
      },
    ]);

    assert.match(markdown, /^# What's coming/);
    assert.match(markdown, /not a commitment/);
    assert.ok(markdown.indexOf('## 2026 · Q1') < markdown.indexOf('## 2026 · Q3'));
    assert.ok(markdown.indexOf('## 2026 · Q3') < markdown.indexOf('## 2026 · Timing not set'));
    assert.ok(markdown.indexOf('## 2026 · Timing not set') < markdown.indexOf('## 2027 · Q2'));
    assert.match(markdown, /### Mentor workspace[\s\S]*\*\*Status:\*\* Planned/);
    assert.match(markdown, /### Earlier item[\s\S]*\*\*Status:\*\* In progress/);
    assert.match(markdown, /### Next year[\s\S]*\*\*Status:\*\* Shipped/);
    assert.match(markdown, /### Kept going[\s\S]*\*\*Status:\*\* Ongoing/);
  });

  it('does not render internal fields that are not part of the customer projection', () => {
    const withSecrets = {
      ...mentor,
      assignees: 'secret-person',
      jiraEpicKey: 'CORE-999',
      effort: 'XL',
      aiRationale: 'internal-rationale',
    };
    const markdown = renderCustomerRoadmap([withSecrets]);
    assert.doesNotMatch(markdown, /secret-person/);
    assert.doesNotMatch(markdown, /CORE-999/);
    assert.doesNotMatch(markdown, /internal-rationale/);
    assert.doesNotMatch(markdown, /\bXL\b/);
  });

  it('writes the provisional banner when nothing is publishable', () => {
    const markdown = renderCustomerRoadmap([
      { ...mentor, customerVisible: 0 },
      { ...mentor, name: 'Hidden', customerSummary: '' },
    ]);
    assert.match(markdown, /Nothing is published for customers yet/);
    assert.doesNotMatch(markdown, /Mentor workspace/);
  });
});
