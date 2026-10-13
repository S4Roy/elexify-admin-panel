import { test, expect } from '@playwright/test';
import { templateBodySections } from '../src/app/layout/home-layout/modules/settings/email-templates/email-template-edit/template-body-sections';
test('preserves original content and partials without edits', () => {
  const source = '<h1 style="color:teal">Hello {{name}}</h1>\n{{> ctaButton url=account_url text="Secure account"}}\n';
  const sections = templateBodySections(source);
  expect(sections.map(section => section.value).join('')).toBe(source);
  expect(sections.find(section => section.kind === 'dynamic')?.label).toBe('Action button');
});
test('protects nested conditional blocks as a single dynamic section', () => {
  const block = '{{#if order}}{{#if is_cod}}Pay on delivery{{else}}Paid{{/if}}{{> orderSummaryCard}}{{/if}}';
  const sections = templateBodySections('<p>Thank you</p>' + block + '<p>Regards</p>');
  expect(sections.filter(section => section.kind === 'dynamic')).toHaveLength(1);
  expect(sections[1].value).toBe(block);
});
test('changing message text leaves dynamic sections intact', () => {
  const source = '<p>Hello</p>{{> otpCodeBlock code=otp}}';
  const sections = templateBodySections(source);
  sections[0].value = '<p>Your verification code</p>';
  expect(sections.map(section => section.value).join('')).toBe('<p>Your verification code</p>{{> otpCodeBlock code=otp}}');
  expect(sections[0].initialValue).toBe('<p>Hello</p>');
});
