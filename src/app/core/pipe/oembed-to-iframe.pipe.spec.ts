import { OembedToIframePipe } from './oembed-to-iframe.pipe';

describe('OembedToIframePipe', () => {
  it('create an instance', () => {
    const pipe = new OembedToIframePipe();
    expect(pipe).toBeTruthy();
  });
});
