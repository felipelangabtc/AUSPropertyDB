export { BaseSourceConnector } from './base.connector';
export { DemoJSONConnector } from './connectors/demo-json.connector';
export { RealEstateAUConnector } from './connectors/realestate-au.connector';

// Registry for all available connectors
import { ISourceConnector } from '@aus-prop/shared';
import { DemoJSONConnector } from './connectors/demo-json.connector';
import { RealEstateAUConnector } from './connectors/realestate-au.connector';

export const ConnectorRegistry: Record<string, new () => ISourceConnector> = {
  'demo-json': DemoJSONConnector,
  'realestate.com.au': RealEstateAUConnector,
};

export function getConnector(name: string): ISourceConnector | null {
  const ConnectorClass = ConnectorRegistry[name];
  return ConnectorClass ? new ConnectorClass() : null;
}

export function listAvailableConnectors(): string[] {
  return Object.keys(ConnectorRegistry);
}
