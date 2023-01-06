import { ExternalModule } from './peers/webpack';

export class TranspileExternalModule extends ExternalModule {
  originPath: string;

  constructor(request: string, type: string, originPath: string) {
    super(request, type, request);
    this.originPath = originPath;
  }

  identifier() {
    return `${super.identifier()} (${this.originPath})`;
  }
}
