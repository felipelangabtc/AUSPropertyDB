export { BaseSourceConnector } from './base.connector';
export { DemoJSONConnector } from './connectors/demo-json.connector';
export { RealEstateAUConnector } from './connectors/realestate-au.connector';
export { DomainAUConnector } from './connectors/domain-au.connector';

// Registry for all available connectors
import { ISourceConnector } from '@aus-prop/shared';
import { DemoJSONConnector } from './connectors/demo-json.connector';
import { RealEstateAUConnector } from './connectors/realestate-au.connector';
import { DomainAUConnector } from './connectors/domain-au.connector';

export const ConnectorRegistry: Record<string, new (...args: any[]) => ISourceConnector> = {
  'demo-json': DemoJSONConnector,
  'realestate.com.au': RealEstateAUConnector,
  'domain.com.au': DomainAUConnector,
};

export function getConnector(name: string, opts?: Record<string, any>): ISourceConnector | null {
  const ConnectorClass = ConnectorRegistry[name];
  if (!ConnectorClass) return null;
  try {
    if (opts && opts.apiKey) return new ConnectorClass(opts.apiKey);
    return new ConnectorClass();
  } catch (e) {
    return new ConnectorClass();
  }
}

export function listAvailableConnectors(): string[] {
  return Object.keys(ConnectorRegistry);
}
