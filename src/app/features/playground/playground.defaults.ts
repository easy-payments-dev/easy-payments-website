import { getLatestPublishedAngularVersion } from '../../data/frameworks';
import {
  PlaygroundConfig,
  PlaygroundPaymentMethod,
  PlaygroundVersion,
} from './playground.types';

const ALL_METHODS: PlaygroundPaymentMethod[] = [
  'card',
  'paypal',
  'apple-pay',
  'google-pay',
  'klarna',
  'affirm',
];

export function createDefaultPlaygroundConfig(
  version: PlaygroundVersion = getLatestPublishedAngularVersion() as PlaygroundVersion,
): PlaygroundConfig {
  return {
    version,
    product: {
      name: 'Premium Plan',
      description: 'One year subscription',
      amount: 99,
      currency: 'USD',
      quantity: 1,
    },
    methods: [...ALL_METHODS],
    theme: 'system',
    appearance: 'default',
    successBehavior: 'confirmation',
    locale: 'auto',
    maxWidth: 640,
  };
}
