import { ExternalModule } from './peers/webpack';

export class TranspileExternalModule extends ExternalModule {
  resourcePath: string;

  constructor(request: string, type: string, resourcePath: string) {
    super(request, type, request);
    this.resourcePath = resourcePath;
  }

  identifier() {
    return `external ${this.externalType} ${this.resourcePath}`;
  }
}
